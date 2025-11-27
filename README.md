# 🚀 Tasks & Finance Tracker - Микросервисная архитектура

Высоконагруженная микросервисная система для управления задачами и покупками с поддержкой аналитики.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-24+-blue.svg)](https://www.docker.com/)

---

## 📋 Содержание

- [Особенности](#-особенности)
- [Архитектура](#-архитектура)
- [Быстрый старт](#-быстрый-старт)
- [API Документация](#-api-документация)
- [Технологический стек](#-технологический-стек)
- [Документация](#-документация)
- [Разработка](#-разработка)
- [Лицензия](#-лицензия)

---

## ✨ Особенности

### 🏗️ Архитектурные паттерны

- **Микросервисная архитектура** - независимые, масштабируемые сервисы
- **CQRS** - разделение чтения и записи для оптимизации производительности
- **Event-Driven** - асинхронная коммуникация через RabbitMQ
- **API Gateway** - единая точка входа через Nginx

### 🔐 Безопасность

- JWT токены для аутентификации
- Bcrypt хэширование паролей
- Bearer авторизация
- Изоляция на уровне Docker Network

### ⚡ Производительность

- **Redis кэширование** с автоматической инвалидацией
- **Database Replication** - Master/Replica для CQRS
- **Асинхронные операции** - FastAPI + asyncpg
- **Connection Pooling** - оптимизация подключений к БД

### 📊 Аналитика

- Event-sourcing для отслеживания всех действий
- Append-only хранилище событий
- OLAP запросы для агрегации статистики
- Дашборд с метриками

---

## 🏛️ Архитектура

```
                    ┌─────────────────┐
                    │  Nginx Gateway  │
                    │   Port: 80      │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   /auth/*              /api/*              /stats/*
        │                    │                    │
┌───────▼───────┐    ┌───────▼───────┐    ┌───────▼───────┐
│ Users Service │    │ Core Service  │    │   Analytics   │
│               │    │               │    │    Service    │
│  - Auth       │    │  - Tasks      │    │               │
│  - JWT        │    │  - Purchases  │    │  - Stats      │
│  - Users      │    │  - Categories │    │  - Events     │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        │            ┌───────▼───────┐            │
        │            │   RabbitMQ    │◄───────────┘
        │            │  (Events)     │            │
        │            └───────────────┘            │
        │                    │                    │
        │            ┌───────▼───────┐    ┌───────▼───────┐
        │            │     Redis     │    │    Worker     │
        │            │   (Cache)     │    │  (Consumer)   │
        │            └───────────────┘    └───────────────┘
        │                                         │
┌───────▼───────┐    ┌───────────────┐    ┌─────▼─────────┐
│  PostgreSQL   │    │  PostgreSQL   │    │  PostgreSQL   │
│   Users DB    │    │   Core DB     │    │ Analytics DB  │
│               │    │  (M + R)      │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
```

**Подробнее:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🚀 Быстрый старт

### Требования

- Docker 24.0+
- Docker Compose 2.0+
- 8 GB RAM (минимум)

### Установка

1. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/your-org/tasks-finance-tracker-mircoservices.git
   cd tasks-finance-tracker-mircoservices
   ```

2. **Запустите все сервисы:**
   ```bash
   docker-compose up -d --build
   ```

3. **Проверьте статус:**
   ```bash
   docker-compose ps
   ```

   Все контейнеры должны быть в статусе `Up` и `healthy`.

4. **Откройте Swagger UI:**
   ```bash
   # Users Service
   open http://localhost/auth/docs
   
   # Core Service
   open http://localhost/api/docs
   
   # Analytics Service
   open http://localhost/stats/docs
   ```

### Первый запрос

1. **Регистрация пользователя:**
   ```bash
   curl -X POST http://localhost/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "johndoe",
       "email": "john@example.com",
       "password": "securePassword123"
     }'
   ```

2. **Логин:**
   ```bash
   curl -X POST http://localhost/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "john@example.com",
       "password": "securePassword123"
     }'
   ```

3. **Используйте полученный токен для защищённых endpoint'ов.**

---

## 📚 API Документация

### Сервисы

| Сервис | Swagger UI | Описание |
|--------|-----------|----------|
| **Users Service** | http://localhost/auth/docs | Регистрация, логин, управление профилем |
| **Core Service** | http://localhost/api/docs | Задачи, покупки, категории, умные фильтры |
| **Analytics Service** | http://localhost/stats/docs | Статистика, метрики, аналитика |

### Основные endpoint'ы

#### Users Service (`/auth`)

- `POST /register` - Регистрация (username, email, password)
- `POST /login` - Логин (email, password) → JWT токен
- `GET /users/me` - Получение профиля
- `DELETE /users/me` - Удаление пользователя (soft-delete)

#### Core Service (`/api`)

**Categories:**
- `GET /categories/` - Список категорий
- `POST /categories/` - Создание категории

**Tasks:**
- `GET /tasks/` - Список задач (с фильтрами: today, week, overdue)
- `POST /tasks/` - Создание задачи
- `PATCH /tasks/{id}` - Обновление задачи

**Purchases:**
- `GET /purchases/` - Список покупок
- `POST /purchases/` - Создание покупки
- `PATCH /purchases/{id}/toggle` - Переключение статуса

**Smart Views:**
- `POST /smart-views/` - Создание умного фильтра
- `GET /smart-views/{id}/items` - Получение элементов по фильтру

#### Analytics Service (`/stats`)

- `GET /dashboard?period=week` - Статистика дашборда
- `GET /events/count` - Количество событий
- `GET /events/recent` - Последние события

**Подробнее:** [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)

---

## 🛠️ Технологический стек

### Backend

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Язык программирования | Python | 3.11+ |
| Web Framework | FastAPI | 0.109+ |
| ORM | SQLAlchemy | 2.0+ |
| Database Driver | asyncpg | 0.29+ |
| Migrations | Alembic | 1.13+ |
| Dependency Management | Poetry | 1.7+ |

### Infrastructure

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Database | PostgreSQL | 15 |
| Cache | Redis | 7 |
| Message Broker | RabbitMQ | 3 |
| API Gateway | Nginx | alpine |
| Containerization | Docker | 24+ |
| Orchestration | Docker Compose | 2.0+ |

### Libraries

- **Authentication:** PyJWT, passlib[bcrypt]
- **Validation:** Pydantic, email-validator
- **Async:** aio-pika, asyncpg
- **HTTP:** uvicorn, python-multipart

---

## 📖 Документация

Полная документация находится в папке [`/docs`](docs/):

| Файл | Описание |
|------|----------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Подробное описание архитектуры системы |
| [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Полная документация API с примерами |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Инструкции по развёртыванию и эксплуатации |
| [USERS_SERVICE_CHANGES.md](docs/USERS_SERVICE_CHANGES.md) | История изменений Users Service |

---

## 💻 Разработка

### Структура проекта

```
tasks-finance-tracker-mircoservices/
├── services/
│   ├── users/              # Users Service
│   │   ├── alembic/        # Миграции БД
│   │   ├── src/            # Исходный код
│   │   ├── pyproject.toml  # Зависимости Poetry
│   │   ├── Dockerfile      # Docker образ
│   │   └── entrypoint.sh   # Точка входа
│   ├── core/               # Core Service
│   │   ├── alembic/
│   │   ├── src/
│   │   ├── pyproject.toml
│   │   ├── Dockerfile
│   │   └── entrypoint.sh
│   └── analytics/          # Analytics Service
│       ├── alembic/
│       ├── src/
│       ├── pyproject.toml
│       ├── Dockerfile
│       ├── entrypoint.sh
│       └── entrypoint-with-worker.sh
├── deploy/
│   └── nginx/
│       └── nginx.conf      # Конфигурация Nginx
├── docs/                   # Документация
├── docker-compose.yml      # Оркестрация сервисов
└── README.md
```

### Локальная разработка

1. **Запуск конкретного сервиса:**
   ```bash
   docker-compose up -d users-service
   ```

2. **Просмотр логов:**
   ```bash
   docker-compose logs -f users-service
   ```

3. **Перезапуск после изменений:**
   ```bash
   docker-compose up -d --build users-service
   ```

4. **Создание миграции:**
   ```bash
   docker-compose exec users-service alembic -c /app/services/users/alembic.ini revision --autogenerate -m "Description"
   ```

5. **Применение миграции:**
   ```bash
   docker-compose exec users-service alembic -c /app/services/users/alembic.ini upgrade head
   ```

### Управление зависимостями

```bash
# Добавить зависимость
docker-compose exec users-service poetry add package-name

# Обновить зависимости
docker-compose exec users-service poetry update

# Установить зависимости из lock файла
docker-compose exec users-service poetry install
```

### Тестирование

```bash
# TODO: Добавить pytest конфигурацию
docker-compose run --rm users-service pytest
```

---

## 🔧 Управление

### Мониторинг

```bash
# Health checks
curl http://localhost/auth/health
curl http://localhost/api/health
curl http://localhost/stats/health

# Docker статус
docker-compose ps

# Метрики контейнеров
docker stats
```

### RabbitMQ Management

**URL:** http://localhost:15672  
**Логин:** user  
**Пароль:** password

### Работа с базами данных

```bash
# Подключение к Users DB
docker-compose exec postgres-users psql -U user -d users_db

# Подключение к Core Master
docker-compose exec postgres-core-master psql -U user -d core_db

# Подключение к Analytics DB
docker-compose exec analytics-db psql -U user -d analytics_db
```

### Бэкап

```bash
# Бэкап Users DB
docker-compose exec postgres-users pg_dump -U user users_db > backup_users.sql

# Восстановление
cat backup_users.sql | docker-compose exec -T postgres-users psql -U user -d users_db
```

**Подробнее:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 🐛 Troubleshooting

### Сервис не запускается

1. Проверьте логи:
   ```bash
   docker-compose logs service-name
   ```

2. Перезапустите сервис:
   ```bash
   docker-compose restart service-name
   ```

3. Пересоберите образ:
   ```bash
   docker-compose up -d --build service-name
   ```

### База данных недоступна

```bash
# Проверьте статус
docker-compose ps postgres-users

# Проверьте здоровье
docker-compose exec users-service nc -zv postgres-users 5432
```

### 502 Bad Gateway

```bash
# Проверьте Nginx
docker-compose logs nginx

# Перезапустите Nginx
docker-compose restart nginx

# Проверьте конфигурацию
docker-compose exec nginx nginx -t
```

---

## 📊 Производительность

### Оптимизации

- ✅ **Redis кэширование** для списков (TTL: 60s)
- ✅ **Database Replication** (Master/Replica)
- ✅ **Connection Pooling** в SQLAlchemy
- ✅ **Async I/O** во всех сервисах
- ✅ **Event-driven architecture** для аналитики

### Масштабирование

```bash
# Горизонтальное масштабирование Core Service
docker-compose up -d --scale core-service=3

# Вертикальное масштабирование (в docker-compose.yml)
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

---

## 🤝 Участие в разработке

1. Fork репозиторий
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

---

## 📝 Лицензия

MIT License. См. [LICENSE](LICENSE) для деталей.

---

## 👥 Авторы

- **Senior Backend Architect** - Архитектура и реализация
- **Python Developer** - Разработка микросервисов

---

## 📞 Контакты

- **Issues:** https://github.com/your-org/tasks-finance-tracker-mircoservices/issues
- **Email:** support@example.com
- **Documentation:** [docs/](docs/)

---

## 🎯 Roadmap

- [ ] Unit & Integration тесты (pytest)
- [ ] CI/CD Pipeline (GitHub Actions)
- [ ] Prometheus + Grafana мониторинг
- [ ] ELK Stack для логирования
- [ ] Kubernetes deployment
- [ ] WebSocket для real-time уведомлений
- [ ] Mobile API Gateway
- [ ] Rate Limiting
- [ ] API Versioning

---

**⭐ Если проект был полезен, поставьте звезду!**
