# Архитектура системы

## Обзор

Микросервисная система для управления задачами и покупками с поддержкой аналитики и высокой нагрузки.

```
┌─────────────────────────────────────────────────────────────┐
│                         Nginx Gateway                        │
│                      (Single Entry Point)                    │
└──────────┬────────────────┬────────────────┬─────────────────┘
           │                │                │
    /auth/*│         /api/* │         /stats/*│
           │                │                │
    ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
    │   Users     │  │    Core     │  │  Analytics  │
    │   Service   │  │   Service   │  │   Service   │
    │             │  │             │  │             │
    │  - Auth     │  │  - Tasks    │  │  - Stats    │
    │  - JWT      │  │  - Purchases│  │  - Events   │
    │  - Users    │  │  - CQRS     │  │  - OLAP     │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │
           │         ┌──────▼──────┐         │
           │         │   RabbitMQ  │◄────────┘
           │         │   (Events)  │         │
           │         └─────────────┘         │
           │                │                │
           │         ┌──────▼──────┐  ┌──────▼──────┐
           │         │    Redis    │  │   Worker    │
           │         │   (Cache)   │  │  (Consumer) │
           │         └─────────────┘  └─────────────┘
           │                                  │
    ┌──────▼──────┐  ┌─────────────┐  ┌──────▼──────┐
    │ PostgreSQL  │  │ PostgreSQL  │  │ PostgreSQL  │
    │  Users DB   │  │  Core DB    │  │ Analytics   │
    │             │  │ (M+R)       │  │     DB      │
    └─────────────┘  └─────────────┘  └─────────────┘
```

---

## Компоненты системы

### 1. API Gateway (Nginx)

**Назначение:** Единая точка входа, маршрутизация запросов

**Конфигурация:**
- `/auth/*` → Users Service (port 8001)
- `/api/*` → Core Service (port 8002)
- `/stats/*` → Analytics Service (port 8003)

**Особенности:**
- Reverse Proxy
- Load Balancing (готово к масштабированию)
- SSL termination (в будущем)
- Rate Limiting (опционально)

---

### 2. Users Service

**Назначение:** Управление пользователями и аутентификация

**Стек:**
- FastAPI (async)
- PostgreSQL (users_db)
- JWT для токенов
- Passlib + bcrypt для хэширования паролей
- RabbitMQ для событий

**Основные функции:**
- Регистрация (`POST /auth/register`)
- Логин (`POST /auth/login`)
- Получение профиля (`GET /auth/users/me`)
- Удаление пользователя (`DELETE /auth/users/me`)

**События:**
- `UserDeleted` → Analytics Service

**База данных:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 3. Core Service

**Назначение:** Основная бизнес-логика (задачи, покупки, категории)

**Стек:**
- FastAPI (async)
- PostgreSQL (core_master + core_replica)
- Redis (кэширование)
- RabbitMQ (события)
- CQRS паттерн

**Архитектурные паттерны:**

#### CQRS (Command Query Responsibility Segregation)
- **Чтение (Query):** Replica DB
  - `GET /tasks/`
  - `GET /purchases/`
  - `GET /categories/`
- **Запись (Command):** Master DB
  - `POST`, `PUT`, `PATCH`, `DELETE`
  - Инвалидация кэша
  - Публикация событий

#### Кэширование (Redis)
```python
# Ключ кэша
cache_key = f"tasks:user:{user_id}:filter:{filter}:completed:{is_completed}"

# TTL: 60 секунд
await redis_client.setex(cache_key, 60, json.dumps(data))
```

**Инвалидация:**
- При любых `POST/PUT/PATCH/DELETE` операциях
- Удаляются все связанные ключи

#### Модули

**Categories (Категории):**
- Типы: `tasks`, `purchases`, `mixed`
- Цветовая кодировка
- Иерархическая структура (опционально)

**Tasks (Задачи):**
- Дедлайны с напоминаниями
- Redis Sorted Set для таймеров
- Фильтры: `today`, `week`, `overdue`

**Purchases (Покупки):**
- Калькуляция трат
- Статусы `is_bought`
- Подсчёт общих расходов

**Smart Views (Умные фильтры):**
- JSON правила фильтрации
- Динамический Query Builder
- Поддержка сложных условий

**События:**
- `TaskCreated`, `TaskUpdated`, `TaskCompleted`
- `PurchaseCreated`, `PurchaseCompleted`

**База данных:**
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR NOT NULL,
    type VARCHAR CHECK (type IN ('tasks', 'purchases', 'mixed')),
    INDEX idx_user_id (user_id)
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    category_id UUID REFERENCES categories(id),
    title VARCHAR NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_user_due_date (user_id, due_date)
);

CREATE TABLE purchases (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    category_id UUID REFERENCES categories(id),
    title VARCHAR NOT NULL,
    is_bought BOOLEAN DEFAULT FALSE,
    cost FLOAT,
    quantity INTEGER,
    unit VARCHAR
);

CREATE TABLE smart_views (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR NOT NULL,
    rules JSONB NOT NULL
);
```

---

### 4. Analytics Service + Worker

**Назначение:** Сбор и анализ событий, статистика

**Компоненты:**
1. **API:** Предоставляет статистику
2. **Worker:** Обрабатывает события из RabbitMQ

**Стек:**
- FastAPI (API)
- aio_pika (Worker)
- PostgreSQL (analytics_db)
- Append-only storage

**Архитектура:**

```
RabbitMQ → Worker (Consumer) → PostgreSQL (Append-Only)
                                      ↓
                              Aggregation Queries
                                      ↓
                                   API
```

**Хранилище событий (Append-Only):**
```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
);
```

**Типы событий:**
- `task_created`, `task_completed`
- `purchase_created`, `purchase_completed`
- `user_deleted`

**Агрегация:**
- По периодам: `week`, `month`, `year`
- Метрики: COUNT, SUM, AVG
- Группировка по дням

---

## Инфраструктура

### PostgreSQL

**3 инстанса:**

1. **users_db** (Users Service)
   - Порт: 5432 (внутренний)
   - Хранит пользователей

2. **core_master** (Core Service - запись)
   - Порт: 5433 (внутренний)
   - Master для записи

3. **core_replica** (Core Service - чтение)
   - Порт: 5434 (внутренний)
   - Replica для чтения
   - ⚠️ В production: настроить репликацию

4. **analytics_db** (Analytics Service)
   - Порт: 5435 (внутренний)
   - Append-only хранилище

### Redis

**Назначение:**
- Кэширование списков (Core Service)
- Sorted Set для дедлайнов задач
- TTL: 60 секунд

**Порт:** 6379 (внутренний)

### RabbitMQ

**Назначение:** Message Broker для событий

**Конфигурация:**
- AMQP: 5672
- Management UI: 15672
- Credentials: `user:password`

**Очереди:**
- `analytics_queue` - события для аналитики
- Exchange: `events`
- Routing keys: `users.*`, `tasks.*`, `purchases.*`

---

## Потоки данных

### 1. Регистрация и логин

```
Client → Nginx → Users Service → PostgreSQL (users_db)
                      ↓
                  JWT Token
                      ↓
                   Client
```

### 2. Создание задачи (Write)

```
Client → Nginx → Core Service
                      ↓
            [Master DB Transaction]
                      ├─→ PostgreSQL (core_master)
                      ├─→ Redis (invalidate cache)
                      ├─→ Redis Sorted Set (deadline)
                      └─→ RabbitMQ (event)
                              ↓
                      Analytics Worker
                              ↓
                      PostgreSQL (analytics_db)
```

### 3. Получение задач (Read)

```
Client → Nginx → Core Service
                      ↓
              Check Redis Cache
                 ↓          ↓
            Hit (return)   Miss
                             ↓
                  PostgreSQL (core_replica)
                             ↓
                       Save to Redis
                             ↓
                        Return data
```

### 4. Аналитика

```
Client → Nginx → Analytics Service
                      ↓
              Aggregation Query
                      ↓
        PostgreSQL (analytics_db)
                      ↓
              JSON Response
```

---

## Масштабирование

### Горизонтальное масштабирование

**Users Service:**
- Stateless
- Можно запускать N инстансов
- Nginx балансирует нагрузку

**Core Service:**
- Stateless
- Redis для кэша (общий)
- Read replicas для чтения

**Analytics Service:**
- API: N инстансов
- Worker: 1-2 инстанса (конкурентная обработка)

### Вертикальное масштабирование

**PostgreSQL:**
- Master: больше CPU/RAM
- Replicas: SSD для чтения

**Redis:**
- Больше памяти
- Persistence (AOF/RDB)

**RabbitMQ:**
- Cluster mode
- Durable queues

---

## Безопасность

### Аутентификация
- JWT токены (HS256)
- Bearer схема
- Access Token: 30 минут

### Авторизация
- user_id в JWT payload
- Проверка на уровне endpoint
- Dependency Injection

### Хэширование паролей
- bcrypt (rounds=12)
- Salt автоматически

### Сетевая безопасность
- Все БД - внутренние порты
- Только Nginx открыт наружу
- Docker network изоляция

---

## Мониторинг и логирование

### Health checks
- `/auth/health`
- `/api/health`
- `/stats/health`

### Docker health checks
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- RabbitMQ: management API

### Логирование
- Uvicorn access logs
- SQLAlchemy query logs (echo=True в dev)
- RabbitMQ message tracking

### Метрики (TODO)
- Prometheus endpoints
- Grafana dashboards
- APM (Application Performance Monitoring)

---

## Технологический стек

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Язык | Python | 3.11+ |
| Framework | FastAPI | 0.109+ |
| ORM | SQLAlchemy | 2.0+ |
| Database | PostgreSQL | 15 |
| Cache | Redis | 7 |
| Message Broker | RabbitMQ | 3 |
| Gateway | Nginx | alpine |
| Container | Docker | 24+ |
| Orchestration | Docker Compose | 2.0+ |
| Migrations | Alembic | 1.13+ |
| Dependency Mgmt | Poetry | 1.7+ |

