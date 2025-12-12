# Analytics Service - Структура проекта

## 📁 Организация кода

```
analytics/
├── app/                          # Основной код приложения
│   ├── api/                      # API endpoints
│   │   ├── __init__.py
│   │   └── router.py             # Все REST endpoints
│   ├── core/                     # Базовая функциональность
│   │   ├── __init__.py
│   │   ├── auth.py               # JWT authentication
│   │   └── database.py           # SQLAlchemy setup
│   ├── models/                   # Database models
│   │   ├── __init__.py
│   │   └── analytics_event.py    # AnalyticsEvent model
│   ├── schemas/                  # Pydantic schemas
│   │   ├── __init__.py
│   │   └── analytics.py          # Request/Response schemas
│   ├── workers/                  # Background workers
│   │   ├── __init__.py
│   │   └── events_consumer.py    # RabbitMQ consumer
│   └── __init__.py
├── alembic/                      # Database migrations
│   ├── versions/
│   │   ├── 11d4143119f5_initial_migration.py
│   │   └── 22e5254220f6_add_user_id_to_analytics_events.py
│   ├── env.py
│   └── script.py.mako
├── alembic.ini                   # Alembic configuration
├── Dockerfile                    # Docker image definition
├── main.py                       # FastAPI application entrypoint
├── pyproject.toml                # Poetry dependencies
└── README.md                     # This file
```

## 🔧 Компоненты

### API Layer (`app/api/`)
- **router.py**: Все HTTP endpoints
  - `GET /dashboard` - Статистика dashboard
  - `GET /events/count` - Счетчик событий
  - `GET /events/recent` - Последние события
  - `GET /activity-heatmap` - GitHub-style contribution graph

### Core Layer (`app/core/`)
- **database.py**: Конфигурация SQLAlchemy, async engine, sessions
- **auth.py**: JWT authentication без обращения к БД users

### Models Layer (`app/models/`)
- **analytics_event.py**: ORM модель для таблицы `analytics_events`

### Schemas Layer (`app/schemas/`)
- **analytics.py**: Pydantic модели для валидации API

### Workers Layer (`app/workers/`)
- **events_consumer.py**: RabbitMQ consumer для обработки событий

## 🚀 Запуск

### Локально
```bash
# Установка зависимостей
poetry install

# Миграции
alembic upgrade head

# Запуск API
uvicorn main:app --reload

# Запуск worker (в отдельном терминале)
python -m app.workers.events_consumer
```

### Docker
```bash
docker compose up -d --build analytics-service
```

## 📊 Architecture Patterns

- **Event Sourcing**: Все изменения записываются как события
- **CQRS**: Разделение чтения и записи (БД только на чтение для API)
- **Async/Await**: Полностью асинхронный код (FastAPI + asyncpg)
- **SQL Aggregation**: GROUP BY на уровне БД вместо Python loops

## 🔐 Authentication

JWT tokens проверяются без обращения к БД:
```python
from app.core.auth import get_current_user_id

@router.get("/protected")
async def protected_endpoint(user_id: UUID = Depends(get_current_user_id)):
    # user_id извлекается из JWT токена
    pass
```

## 📈 Performance Optimizations

1. **SQL GROUP BY** вместо Python циклов (5-10x быстрее)
2. **Индексы БД**: `user_id`, `event_type`, `created_at`
3. **Асинхронные операции**: asyncpg для non-blocking I/O
4. **BackgroundTasks**: События обрабатываются после HTTP response

## 🧪 Testing

```bash
# API тестирование
curl http://localhost/stats/dashboard \
  -H "Authorization: Bearer <token>"

# Проверка worker
docker compose logs -f analytics-service
```

## 📝 Conventions

- **Imports**: Используйте `from app.module import ...`
- **Async**: Все DB операции через `async/await`
- **Type Hints**: Обязательны для всех функций
- **Docstrings**: Все публичные endpoints должны иметь документацию
