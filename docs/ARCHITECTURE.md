# Архитектура системы

## Обзор

Микросервисная система для управления задачами и покупками с поддержкой аналитики и высокой нагрузки.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Nginx Gateway                                     │
│                      (Single Entry Point)                                 │
└──────────┬────────────────┬────────────────┬──────────────┬──────────────┘
           │                │                │              │
    /auth/*│         /api/* │         /stats/*│    /chat/*   │
           │                │                │              │
    ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
    │   Users     │  │    Core     │  │  Analytics  │  │      AI     │
    │   Service   │  │   Service   │  │   Service   │  │   Service   │
    │             │  │             │  │             │  │             │
    │  - Auth     │  │  - Tasks    │  │  - Stats    │  │  - LLM      │
    │  - JWT      │  │  - Purchases│  │  - Events   │  │  - Tools    │
    │  - Users    │  │  - Categories│ │  - OLAP     │  │  - Chat     │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │               │
           │         ┌──────▼──────┐         │               │
           │         │   RabbitMQ  │◄────────┴───────────────┘
           │         │   (Events)  │         │
           │         └─────────────┘         │
           │                │                │
           │         ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
           │         │    Redis    │  │ Core Worker │  │Analytics Wrk│  │  AI Worker  │
           │         │   (Cache)   │  │  (Consumer) │  │  (Consumer) │  │  (Consumer) │
           │         └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
           │                                  │
    ┌──────▼──────┐  ┌─────────────┐  ┌──────▼──────┐  ┌──────▼──────┐
    │ PostgreSQL  │  │ PostgreSQL  │  │ PostgreSQL  │  │ PostgreSQL  │
    │  Users DB   │  │  Core DB    │  │ Analytics   │  │   AI DB     │
    │             │  │             │  │     DB      │  │             │
    └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
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
- PostgreSQL (core_db)
- Redis (кэширование)
- RabbitMQ (события)
- Core Worker (обработка фоновых задач)

**Архитектурные паттерны:**

#### Core Worker
- Слушает очередь `core_events`
- Обрабатывает событие `UserDeleted`
- Удаляет все данные пользователя (GDPR compliance)

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

### 4. Analytics Service & Analytics Worker

**Назначение:** Сбор и анализ событий, статистика

**Компоненты:**
1. **API:** Предоставляет статистику
2. **Analytics Worker:** Обрабатывает события из RabbitMQ

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

### 5. AI Service

**Назначение:** Conversational AI для помощи в управлении задачами и финансами

**Стек:**
- FastAPI (async)
- PostgreSQL (ai_db)
- LLM Integration (OpenAI/Claude API)
- RPC для взаимодействия с Core Service
- aio_pika (RabbitMQ конкурент)

**Основные возможности:**
- Чат с AI агентом (`POST /chat/messages`)
- Управление задачами через естественный язык
- Управление покупками и финансами
- Поиск информации о товарах (Tavily API)
- Суммаризация текста

**Модели AI:**
```
User Query
    ↓
LLM Agent
    ├→ Analyze intent
    ├→ Extract entities
    └→ Call appropriate tool
            ↓
        Tools (RPC)
        ├─ create_task_rpc
        ├─ update_task_rpc
        ├─ delete_item_rpc
        ├─ create_purchase_rpc
        ├─ create_category_rpc
        ├─ get_user_data
        ├─ search_product
        └─ summarize_text
            ↓
        Response
            ↓
        Return to Chat
```

**Database Schema:**
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    role VARCHAR CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_user_id (user_id)
);

CREATE TABLE ai_config (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    model_name VARCHAR,
    settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

**Интеграции:**
- OpenAI/Claude API для LLM
- Tavily Search API для веб-поиска
- Core Service RPC для операций с данными
- RabbitMQ для асинхронных задач

---

## Инфраструктура

### PostgreSQL

**5 инстансов:**

1. **users_db** (Users Service)
   - Порт: 5432 (внутренний)
   - Хранит пользователей

2. **core_db** (Core Service)
   - Порт: 5433 (внутренний)
   - Основная БД для задач и покупок

3. **analytics_db** (Analytics Service)
   - Порт: 5434 (внутренний)
   - Append-only хранилище событий

4. **ai_db** (AI Service)
   - Порт: 5435 (внутренний)
   - История чатов и конфигурация

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
             [DB Transaction]
                      ├→ PostgreSQL (core_db)
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
                  PostgreSQL (core_db)
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
- Асинхронная обработка через RabbitMQ

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

