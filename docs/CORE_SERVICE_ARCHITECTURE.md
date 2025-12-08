# 🏗️ Core Service - Полная архитектура и возможности

## 📋 Обзор

**Core Service** - критически важный микросервис для управления **задачами** 📝 и **покупками** 💰, построенный с использованием современных паттернов архитектуры: CQRS, Event-Driven и асинхронная обработка.

**Стек технологий:**
- `FastAPI` 0.109+ (асинхронный веб-фреймворк)
- `SQLAlchemy 2.0` (ORM с async/await)
- `asyncpg` (асинхронный драйвер PostgreSQL)
- `Redis` (кэширование и session store)
- `RabbitMQ` (event-driven коммуникация)
- `JWT` (аутентификация)
- `Pydantic v2` (валидация данных)

---

## 🎯 Функционал Core Service

### 1️⃣ Управление задачами (Tasks)

#### Что можно делать:
```
✅ Создание задач              POST   /api/tasks/
✅ Получение списка            GET    /api/tasks/
✅ Быстрое переключение статуса POST   /api/tasks/{id}/toggle
✅ Полное обновление           PATCH  /api/tasks/{id}
✅ Удаление (soft delete)       DELETE /api/tasks/{id}
```

#### Фильтры при получении:
```
- category_id:    фильтр по категории
- filter:         быстрые фильтры (today, overdue, inbox)
- is_completed:   показать завершённые/активные
```

#### Поля задачи:
```
{
  "id":             "uuid",
  "user_id":        "uuid",
  "category_id":    "uuid | null",
  "title":          "string",
  "is_completed":   "boolean",
  "due_date":       "datetime | null",
  "created_at":     "datetime"
}
```

#### Примеры использования:
```bash
# Получить все незавершённые задачи
GET /api/tasks/?is_completed=false

# Получить задачи на сегодня
GET /api/tasks/?filter=today

# Получить просроченные задачи
GET /api/tasks/?filter=overdue

# Создать задачу
POST /api/tasks/
{
  "title": "Купить молоко",
  "due_date": "2025-12-09T18:00:00Z",
  "category_id": "..."
}

# Быстро отметить как выполненную
POST /api/tasks/abc123/toggle

# Обновить задачу (изменить заголовок, срок и т.д.)
PATCH /api/tasks/abc123
{
  "title": "Купить молоко и творог",
  "due_date": "2025-12-10T18:00:00Z"
}

# Удалить задачу
DELETE /api/tasks/abc123
```

---

### 2️⃣ Управление покупками (Purchases)

#### Что можно делать:
```
✅ Создание покупок            POST   /api/purchases/
✅ Получение списка            GET    /api/purchases/
✅ Переключение статуса        POST   /api/purchases/{id}/toggle
✅ Обновление                  PATCH  /api/purchases/{id}
✅ Удаление (soft delete)      DELETE /api/purchases/{id}
```

#### Особенности:
```
- Автоматический расчёт total_cost = cost × quantity
- Отслеживание статуса покупки (is_bought)
- Отправка событий в Analytics при изменении
```

#### Поля покупки:
```
{
  "id":          "uuid",
  "user_id":     "uuid",
  "category_id": "uuid | null",
  "title":       "string",
  "is_bought":   "boolean",
  "cost":        "float | null",
  "quantity":    "integer",
  "total_cost":  "float (расчётное)"
}
```

#### Примеры:
```bash
# Получить невыкупленные товары
GET /api/purchases/?is_bought=false

# Создать покупку
POST /api/purchases/
{
  "title": "Яблоки",
  "cost": 50.00,
  "quantity": 2,
  "category_id": "food-uuid"
}

# Отметить как куплено
POST /api/purchases/abc123/toggle

# Обновить цену/количество
PATCH /api/purchases/abc123
{
  "cost": 60.00,
  "quantity": 3
}
```

---

### 3️⃣ Организация в категории (Categories)

#### Что можно делать:
```
✅ Создание категорий         POST /api/categories/
✅ Получение списка           GET  /api/categories/
```

#### Типы категорий:
```
- "tasks"       → только для задач
- "purchases"   → только для покупок
- "mixed"       → для задач и покупок одновременно
```

#### Примеры:
```bash
# Создать категорию для работы
POST /api/categories/
{
  "title": "Работа",
  "type": "tasks",
  "color": "#FF5733",
  "icon": "briefcase"
}

# Получить все категории
GET /api/categories/

# Создать смешанную категорию
POST /api/categories/
{
  "title": "Дом",
  "type": "mixed"
}
```

---

### 4️⃣ Умные фильтры (Smart Views)

#### Что можно делать:
```
✅ Создание фильтров           POST   /api/smart-views/
✅ Получение фильтров          GET    /api/smart-views/
✅ Получение результатов       GET    /api/smart-views/{id}/items
✅ Удаление фильтра            DELETE /api/smart-views/{id}
```

#### Назначение:
Позволяет сохранять сложные фильтры для быстрого доступа к часто используемым списками.

#### Примеры правил:
```json
{
  "title": "Сегодняшние дела",
  "rules": {
    "type": "tasks",
    "filters": {
      "is_completed": false,
      "due_date_from": "2025-12-08",
      "due_date_to": "2025-12-08"
    }
  }
}
```

```json
{
  "title": "Покупки в категории еда",
  "rules": {
    "type": "purchases",
    "filters": {
      "is_bought": false,
      "category_id": "food-uuid"
    }
  }
}
```

```json
{
  "title": "Важные задачи",
  "rules": {
    "type": "tasks",
    "filters": {
      "is_completed": false,
      "category_id": "important-uuid"
    }
  }
}
```

#### Использование:
```bash
# Создать фильтр
POST /api/smart-views/
{
  "title": "Мои задачи на неделю",
  "rules": {
    "type": "tasks",
    "filters": {
      "is_completed": false,
      "due_date_from": "2025-12-08",
      "due_date_to": "2025-12-14"
    }
  }
}

# Получить все фильтры
GET /api/smart-views/

# Получить результаты фильтра
GET /api/smart-views/filter-uuid/items

# Удалить фильтр
DELETE /api/smart-views/filter-uuid
```

---

## 🏛️ Архитектура

### Уровни архитектуры:

```
┌─────────────────────────────────────────────────────┐
│           API Layer (FastAPI)                       │
│  ┌─ api_tasks.py        (Task endpoints)            │
│  ├─ api_purchases.py    (Purchase endpoints)        │
│  ├─ api_categories.py   (Category endpoints)        │
│  └─ api_smart_views.py  (SmartView endpoints)       │
└────────────────┬──────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│         Authentication Layer                       │
│  • JWT токен валидация (auth.py)                  │
│  • HTTPBearer для всех эндпоинтов                 │
│  • Извлечение user_id из payload                  │
└────────────────┬──────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│    Business Logic Layer                           │
│  • CRUD операции                                  │
│  • Валидация данных (Pydantic schemas)            │
│  • Публикация событий (events.py)                 │
└────────────────┬──────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐  ┌──────▼────────┐
│   Redis      │  │  RabbitMQ     │
│ (Cache)      │  │ (Events)      │
└──────────────┘  └───────┬───────┘
        │                 │
        │         Events to:
        │         • Analytics
        │         • Notifications
        │         • Other services
        │
┌───────▼──────────────────────────┐
│    Data Layer (SQLAlchemy)       │
│  • models.py (ORM models)        │
│  • database.py (async sessions)  │
│  • Alembic (migrations)          │
└───────┬──────────────────────────┘
        │
        │ CQRS Pattern:
    ┌───┴─────┬─────────┐
    │          │         │
┌───▼──┐  ┌───▼──┐  ┌───▼──┐
│MASTER│  │MASTER│  │REPLICA│
│DB    │  │DB    │  │DB     │
│WRITE │  │WRITE │  │READ   │
└──────┘  └──────┘  └───────┘
```

---

### Паттерны архитектуры:

#### 1. CQRS (Command Query Responsibility Segregation)

**Идея:** Разделение операций чтения и записи

```python
# WRITE операции используют Master DB
@router.post("/")
async def create_task(..., session: AsyncSession = Depends(get_db_master)):
    # Запись в master
    session.add(new_task)
    await session.commit()

# READ операции используют Replica DB
@router.get("/")
async def get_tasks(..., session: AsyncSession = Depends(get_db_replica)):
    # Чтение из replica (может отставать на несколько миллисекунд)
    stmt = select(Task).where(...)
    result = await session.execute(stmt)
```

**Преимущества:**
- ✅ Масштабируемость - можно использовать несколько read-replicas
- ✅ Производительность - read не блокирует write
- ✅ Отказоустойчивость - если replica упадёт, приложение всё ещё работает

---

#### 2. Event-Driven Architecture

**Идея:** События публикуются в RabbitMQ, другие сервисы их слушают

```python
# Когда создаётся задача, публикуем событие
async def send_event():
    event = {
        "event_type": "TaskCreated",
        "task_id": str(new_task.id),
        "user_id": str(user_id),
        "title": new_task.title,
        "created_at": datetime.utcnow().isoformat()
    }
    await mq_client.publish(routing_key="core.task.created", message=event)

background_tasks.add_task(send_event)
```

**События которые публикуются:**
```
core.task.created      → Analytics считает статистику
core.task.completed    → Analytics обновляет метрики
core.purchase.created  → Analytics записывает транзакцию
core.purchase.bought   → Analytics рассчитывает расходы
```

---

#### 3. Асинхронная обработка

**Идея:** Длительные операции выполняются в фоне, не блокируя ответ

```python
# Событие отправляется в фоне
@router.post("/")
async def create_task(..., background_tasks: BackgroundTasks):
    # Сразу возвращаем ответ
    session.add(new_task)
    await session.commit()
    
    # RabbitMQ отправляется в фоне
    async def send_event():
        await mq_client.publish(...)
    
    background_tasks.add_task(send_event)
    return new_task
```

---

#### 4. Кэширование с Redis

**Идея:** Часто запрашиваемые данные хранятся в памяти

```python
def _generate_cache_key(user_id: uuid.UUID, **params) -> str:
    """Генерация ключа: user:123:tasks:hash-of-params"""
    params_str = json.dumps(params, sort_keys=True, default=str)
    params_hash = hashlib.md5(params_str.encode()).hexdigest()
    return f"user:{user_id}:tasks:{params_hash}"

@router.get("/")
async def get_tasks(...):
    cache_key = _generate_cache_key(user_id, ...)
    
    # 1. Проверяем Redis
    cached_data = await redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)  # Cache HIT - очень быстро
    
    # 2. Если нет в кэше, читаем из DB
    tasks = await session.execute(...)
    
    # 3. Сохраняем в кэш на 60 секунд
    await redis_client.setex(cache_key, 60, json.dumps(...))
    
    return tasks
```

---

#### 5. Dependency Injection

**Идея:** FastAPI автоматически внедряет зависимости

```python
@router.get("/")
async def get_tasks(
    user_id: uuid.UUID = Depends(get_current_user_id),      # JWT validation
    session: AsyncSession = Depends(get_db_replica),         # DB session
    background_tasks: BackgroundTasks = Depends()            # Background worker
):
    # Все зависимости готовы к использованию
    pass
```

---

## 📊 Модели данных

### Entity Relationship Diagram (ERD)

```
┌──────────────────────┐         ┌──────────────────────┐
│     Category         │         │    SmartView         │
├──────────────────────┤         ├──────────────────────┤
│ id (PK)    : UUID    │         │ id (PK)    : UUID    │
│ user_id    : UUID    │         │ user_id    : UUID    │
│ title      : String  │         │ title      : String  │
│ type       : String  │         │ rules      : JSON    │
└──────────────┬───────┘         └──────────────────────┘
               │
        ┌──────┴─────────┐
        │                │
┌───────▼──────────┐  ┌──▼──────────────────┐
│      Task        │  │    Purchase        │
├──────────────────┤  ├────────────────────┤
│ id          : UUID  │ id         : UUID  │
│ user_id     : UUID  │ user_id    : UUID  │
│ category_id : UUID  │ category_id: UUID  │
│ title       : String│ title      : String│
│ is_completed: Bool  │ is_bought  : Bool  │
│ due_date    : Date  │ cost       : Float │
│ created_at  : DateTime│ quantity  : Int    │
└──────────────────────┘ └────────────────────┘
```

### Миграции (Alembic)

```
services/core/alembic/versions/
└── 5f4ea128de85_initial_migration.py
    ├── CREATE TABLE categories
    ├── CREATE TABLE tasks
    ├── CREATE TABLE purchases
    └── CREATE TABLE smart_views
    
Индексы:
- idx_tasks_user_due_date (user_id, due_date)
- idx_categories_user_id (user_id)
- idx_purchases_user_id (user_id)
- idx_smart_views_user_id (user_id)
```

---

## 🔐 Безопасность

### JWT Authentication Flow

```
1. Клиент логинится в users-service
   POST /auth/login → получает JWT токен

2. Клиент отправляет токен в Core Service
   Authorization: Bearer eyJhbGc...

3. Core Service валидирует токен
   jwt.decode(token, JWT_SECRET, algorithms=["HS256"])

4. Извлекает user_id из payload
   payload = {"sub": "user-uuid-123", "exp": 1734771600}

5. Все операции фильтруются по user_id
   SELECT * FROM tasks WHERE user_id = 'user-uuid-123'
```

### Изоляция данных

```python
# Каждый эндпоинт проверяет user_id
task = await session.get(Task, task_id)
if task.user_id != user_id:  # ← Защита от доступа чужих данных
    raise HTTPException(status_code=403, detail="Forbidden")
```

---

## ⚡ Производительность и оптимизация

### 1. Асинхронность
```
- FastAPI с Uvicorn (event loop)
- asyncpg для асинхронного доступа к БД
- aio_pika для асинхронной работы с RabbitMQ
- redis.asyncio для асинхронного кэша
→ Может обслуживать тысячи одновременных соединений
```

### 2. Кэширование
```
Redis хранит:
- GET /api/tasks/ → кэшируется на 60 сек
- GET /api/purchases/ → кэшируется на 60 сек
- GET /api/categories/ → кэшируется на 5 мин
→ 99% операций идут из памяти, а не из БД
```

### 3. Индексирование
```
CREATE INDEX idx_tasks_user_due_date ON tasks(user_id, due_date);
→ Быстрый поиск задач по дате
```

### 4. Connection Pooling
```
SQLAlchemy автоматически переиспользует соединения
→ Избегаем overhead создания новых соединений к БД
```

---

## 📡 Integration Points

### Входящие интеграции:
```
1. JWT от users-service
   - Используется для аутентификации
   - Core Service не делает запрос к users-service

2. Redis
   - Кэшированию результатов запросов
   - Хранение session data (если нужно)
```

### Исходящие интеграции:
```
1. RabbitMQ → Analytics Service
   core.task.created
   core.task.completed
   core.purchase.created
   core.purchase.bought
   
   Analytics слушает эти события и обновляет статистику

2. RabbitMQ → Notifications Service (возможно)
   notifications.task_reminder
   notifications.purchase_alert
```

---

## 🚀 Deployment и масштабирование

### Docker Compose
```yaml
services:
  core-service:
    image: core-service:latest
    environment:
      DATABASE_URL: postgresql+asyncpg://user:pass@postgres:5432/core_db
      REDIS_URL: redis://redis:6379/0
      RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672/
      JWT_SECRET: your-secret-key
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
      - rabbitmq
```

### Масштабирование
```
Горизонтальное масштабирование:
1. Запускаем несколько экземпляров core-service
2. Nginx балансирует нагрузку между ними
3. Все используют одну БД (Master + Read Replicas)
4. RabbitMQ гарантирует delivery event'ов

Вертикальное масштабирование:
1. Увеличиваем CPU/RAM контейнера
2. Настраиваем pool размер для asyncpg
3. Увеличиваем Redis memory
```

---

## 📈 Мониторинг и логирование

### Health Check
```bash
GET /api/health
→ {"status": "ok", "service": "core"}
```

### Swagger UI
```
http://localhost:8000/api/docs
→ Интерактивная документация API
```

### Логирование
```python
# SQLAlchemy логирует все SQL запросы (echo=True в engine)
# FastAPI логирует все HTTP запросы
# RabbitMQ публикации логируются
```

---

## ✅ Checklist для понимания Core Service

- [x] CRUD операции для Tasks/Purchases/Categories
- [x] JWT аутентификация и изоляция данных
- [x] CQRS паттерн (Master/Replica разделение)
- [x] Event-Driven архитектура с RabbitMQ
- [x] Redis кэширование
- [x] Асинхронная обработка
- [x] Dependency Injection
- [x] SmartViews для сложных фильтров
- [x] Soft Delete для мягкого удаления

---

## 🎓 Ключевые концепции для разработки

### Добавление нового эндпоинта:
```python
# 1. Определить schema (schemas.py)
class NewResource(BaseModel):
    name: str
    user_id: uuid.UUID

# 2. Определить модель (models.py)
class NewResource(Base):
    __tablename__ = "new_resources"
    id: Mapped[uuid.UUID] = mapped_column(...)
    user_id: Mapped[uuid.UUID] = mapped_column(...)

# 3. Создать api_new_resource.py
@router.post("/", response_model=NewResourceResponse)
async def create_new_resource(
    resource_in: NewResourceCreate,
    background_tasks: BackgroundTasks,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_master)
):
    # 4. Выполнить операцию
    new_resource = NewResource(...)
    session.add(new_resource)
    await session.commit()
    
    # 5. Опционально: публикация события
    async def send_event():
        await mq_client.publish(routing_key="core.resource.created", ...)
    
    background_tasks.add_task(send_event)
    return new_resource

# 6. Включить router в main.py
app.include_router(api_new_resource.router)
```

---

## 📚 Файловая структура

```
services/core/
├── main.py                 # FastAPI приложение
├── models.py              # SQLAlchemy ORM модели
├── schemas.py             # Pydantic валидация
├── database.py            # SQLAlchemy async engine
├── auth.py                # JWT аутентификация
├── events.py              # RabbitMQ интеграция
├── router.py              # Основной router (возможно не используется)
├── api_tasks.py           # Task endpoints
├── api_purchases.py       # Purchase endpoints
├── api_categories.py      # Category endpoints
├── api_smart_views.py     # SmartView endpoints
├── pyproject.toml         # Dependencies
├── Dockerfile             # Docker образ
├── alembic.ini            # Alembic конфиг
└── alembic/
    ├── env.py
    └── versions/
        └── 5f4ea128de85_initial_migration.py
```

---

## 🔗 Связанная документация

- [API Documentation](./API_DOCUMENTATION.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Offline-First App Requirements](./OFFLINE_FIRST_APP.md)
- [Analytics Service Auth Changes](./ANALYTICS_SERVICE_AUTH.md)
