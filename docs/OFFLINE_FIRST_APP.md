# 📱 Offline-First Mobile App - Требования и Roadmap

## 🎯 Обзор

Документ описывает архитектуру и требования для поддержки offline-first режима в мобильном приложении (React Native/Flutter). Фокус на **бэкенд-изменениях**, необходимых для синхронизации данных между мобильным устройством и сервером.

---

## 🏗️ Архитектура

### Принцип работы:

```
┌─ Мобильное приложение (Offline-First) ────┐
│                                           │
│  SQLite (локальная БД)                    │
│  ├─ tasks, purchases, categories          │
│  ├─ sync_queue (очередь операций)         │
│  └─ meta (последняя синхронизация)        │
│                                           │
│  Sync Manager (фоновый сервис)           │
│  ├─ Слушает изменения сети                │
│  ├─ Синхронизирует при наличии интернета  │
│  └─ Кэширует данные адаптивно             │
└───────────────────┬───────────────────────┘
                    │ HTTP/REST API
                    ▼
      ┌─ Backend (Бэкенд сервер) ──┐
      │                            │
      │ PostgreSQL                 │
      │ ├─ tasks                   │
      │ ├─ purchases               │
      │ ├─ categories              │
      │ └─ analytics_events        │
      │                            │
      │ API Endpoints              │
      │ ├─ /api/sync (DELTA)       │
      │ ├─ /api/tasks (CRUD)       │
      │ ├─ /api/batch (BATCH OPS)  │
      │ └─ /api/conflicts (RESOLVE)│
      └────────────────────────────┘
```

---

## 📋 Требования к бэкенду

### Приоритет 1: КРИТИЧЕСКИЕ (Phase 1)

#### 1.1 Добавить поля синхронизации в модели

**Файлы для изменения:**
- `services/core/models.py`
- `services/core/alembic/versions/` (новая миграция)

**Изменения в модели Task:**
```python
class Task(Base):
    # Существующие поля...
    
    # НОВЫЕ ПОЛЯ ДЛЯ СИНХРОНИЗАЦИИ:
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()  # Автоматически обновляется при UPDATE
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True  # NULL = не удалена, иначе timestamp удаления
    )
    version: Mapped[int] = mapped_column(
        Integer,
        default=1  # Для обнаружения конфликтов
    )
```

**Аналогично для Purchase и Category.**

**Миграция Alembic:**
```
services/core/alembic/versions/XXXXX_add_sync_fields.py
```

Содержание:
```python
def upgrade():
    # Добавить колонки к tasks
    op.add_column('tasks', sa.Column('updated_at', sa.DateTime(timezone=True)))
    op.add_column('tasks', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tasks', sa.Column('version', sa.Integer(), server_default='1'))
    
    # Создать индексы для быстрой синхронизации
    op.create_index('idx_tasks_updated_at', 'tasks', ['user_id', 'updated_at'])
    op.create_index('idx_tasks_deleted_at', 'tasks', ['user_id', 'deleted_at'])
    
    # Аналогично для purchases и categories
```

---

#### 1.2 Endpoint: `/api/sync` - Инкрементальная синхронизация

**Цель**: Клиент получает только изменённые данные с момента последней синхронизации.

**Новый файл:**
`services/core/api_sync.py`

**Endpoint:**
```python
from fastapi import APIRouter, Query, Depends
from datetime import datetime
import uuid

router = APIRouter(prefix="/sync", tags=["sync"])

@router.get("")
async def sync_data(
    updated_since: datetime = Query(..., description="ISO 8601 timestamp"),
    include_deleted: bool = Query(True, description="Включить удалённые записи"),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_replica)  # READ from replica
):
    """
    Синхронизация изменённых данных с момента updated_since.
    
    Возвращает:
    - Созданные и обновлённые задачи/покупки/категории
    - Удалённые записи (если include_deleted=True)
    - Сервер timestamp для следующей синхронизации
    
    Пример запроса:
    GET /api/sync?updated_since=2025-12-08T10:00:00Z&include_deleted=true
    
    Ответ:
    {
        "tasks": [
            {"id": "...", "title": "...", "updated_at": "...", "deleted_at": null},
            ...
        ],
        "purchases": [...],
        "categories": [...],
        "deleted_tasks": ["uuid1", "uuid2"],  # Если include_deleted=true
        "deleted_purchases": [...],
        "deleted_categories": [...],
        "server_timestamp": "2025-12-08T12:00:00Z"
    }
    """
    
    # 1. Валидация timestamp
    if updated_since > datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="updated_since не может быть в будущем"
        )
    
    # 2. Получить изменённые задачи
    tasks_stmt = select(Task).where(
        Task.user_id == user_id,
        Task.updated_at >= updated_since,
        Task.deleted_at.is_(None)  # Только активные
    )
    tasks = await session.scalars(tasks_stmt)
    
    # 3. Получить удалённые задачи (если нужны)
    deleted_tasks = []
    if include_deleted:
        deleted_stmt = select(Task.id).where(
            Task.user_id == user_id,
            Task.deleted_at >= updated_since,
            Task.deleted_at.isnot(None)
        )
        deleted_tasks = await session.scalars(deleted_stmt)
    
    # Аналогично для purchases и categories...
    
    return {
        "tasks": [t.to_dict() for t in tasks],
        "purchases": [...],
        "categories": [...],
        "deleted_tasks": [str(id) for id in deleted_tasks],
        "deleted_purchases": [...],
        "deleted_categories": [...],
        "server_timestamp": datetime.utcnow().isoformat()
    }
```

**Индексы для оптимизации:**
```sql
CREATE INDEX idx_tasks_user_updated ON tasks(user_id, updated_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_user_deleted ON tasks(user_id, deleted_at) WHERE deleted_at IS NOT NULL;
```

---

#### 1.3 Поддержка Client-Side UUID при создании

**Изменение в `api_tasks.py`:**
```python
@router.post("/", response_model=TaskResponse)
async def create_task(
    task_in: TaskCreate,
    client_id: Optional[uuid.UUID] = Query(None),  # ← НОВОЕ ПОЛЕ
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_master)
):
    """
    Создание задачи.
    
    Если client_id передан (из мобильного приложения):
    - Используем client_id вместо генерирования нового
    - Это позволяет клиенту заранее знать ID для оптимистичных обновлений
    
    Пример:
    POST /api/tasks/?client_id=123e4567-e89b-12d3-a456-426614174000
    """
    
    new_task = Task(
        id=client_id or uuid.uuid4(),  # Используем client_id если есть
        user_id=user_id,
        title=task_in.title,
        category_id=task_in.category_id,
        due_date=task_in.due_date,
        is_completed=False,
        version=1  # ← Начальная версия
    )
    
    session.add(new_task)
    await session.commit()
    await session.refresh(new_task)
    
    return new_task
```

**Аналогично для purchases и categories.**

---

#### 1.4 Soft Delete вместо физического удаления

**Изменение в `api_tasks.py`:**
```python
@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_master)
):
    """
    Удаление задачи (soft delete).
    
    Вместо физического удаления:
    - Устанавливаем deleted_at = now()
    - Записи остаются в БД для аудита и синхронизации
    - Клиенты видят удаления через /api/sync
    """
    
    task = await session.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Soft delete вместо физического удаления
    task.deleted_at = datetime.utcnow()
    task.version += 1  # Увеличиваем версию
    
    await session.commit()
    
    return None
```

**Обновить GET endpoints для фильтрации удалённых:**
```python
@router.get("/")
async def get_tasks(
    include_deleted: bool = Query(False),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_replica)
):
    """Получение задач (по умолчанию скрывает удалённые)."""
    
    stmt = select(Task).where(Task.user_id == user_id)
    
    if not include_deleted:
        stmt = stmt.where(Task.deleted_at.is_(None))  # Только активные
    
    tasks = await session.scalars(stmt)
    return tasks
```

---

### Приоритет 2: ВАЖНО (Phase 2)

#### 2.1 Batch Operations Endpoint

**Новый endpoint в `api_sync.py`:**
```python
@router.post("/batch")
async def batch_operations(
    operations: List[BatchOperation],  # Определить schema
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_master)
):
    """
    Применение нескольких операций за один запрос.
    
    Используется для синхронизации накопленных изменений:
    - Клиент создал 10 задач offline
    - Накопил их в sync_queue
    - Отправляет все 10 в одном batch запросе
    
    Ответ содержит результаты и конфликты.
    """
    
    results = []
    
    for op in operations:
        try:
            if op.type == "CREATE":
                # Создание с client_id
                new_item = await create_resource(...)
                results.append({"status": "success", "id": str(new_item.id)})
                
            elif op.type == "UPDATE":
                # Обновление с проверкой версии
                updated = await update_resource(op.id, op.payload, op.version)
                results.append({"status": "success", "version": updated.version})
                
            elif op.type == "DELETE":
                # Soft delete
                await delete_resource(op.id)
                results.append({"status": "success"})
                
        except ConflictError as e:
            # Конфликт версий - вернуть информацию
            results.append({
                "status": "conflict",
                "id": str(op.id),
                "server_version": e.server_version,
                "client_version": op.version,
                "server_data": e.server_data
            })
        except Exception as e:
            results.append({"status": "error", "id": str(op.id), "error": str(e)})
    
    return {
        "results": results,
        "successful": sum(1 for r in results if r["status"] == "success"),
        "conflicts": sum(1 for r in results if r["status"] == "conflict"),
        "errors": sum(1 for r in results if r["status"] == "error")
    }
```

**Schema для BatchOperation:**
```python
from enum import Enum

class OperationType(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"

class BatchOperation(BaseModel):
    type: OperationType
    resource: str  # "tasks", "purchases", "categories"
    id: Optional[uuid.UUID]  # Для UPDATE/DELETE
    payload: Optional[dict]  # Для CREATE/UPDATE
    version: Optional[int]  # Для UPDATE (conflict detection)
```

---

#### 2.2 Обработка конфликтов (Version Control)

**Изменение в PATCH endpoints:**
```python
@router.patch("/{task_id}")
async def update_task(
    task_id: uuid.UUID,
    task_update: TaskUpdate,
    client_version: Optional[int] = Query(None),  # ← Версия с клиента
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_master)
):
    """
    Обновление с проверкой версии (Optimistic Locking).
    
    Если client_version не совпадает с server_version:
    - Возвращаем 409 Conflict
    - Клиент получает серверные данные
    - Пользователь разрешает конфликт (merge/override)
    """
    
    task = await session.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Проверка версии если передана
    if client_version is not None and client_version != task.version:
        raise HTTPException(
            status_code=409,
            detail="Conflict: data was modified",
            headers={
                "X-Server-Version": str(task.version),
                "X-Server-Data": json.dumps(task.to_dict())
            }
        )
    
    # Обновление
    update_data = task_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    task.version += 1  # Увеличиваем версию
    task.updated_at = datetime.utcnow()
    
    await session.commit()
    await session.refresh(task)
    
    return task
```

---

### Приоритет 3: ОПЦИОНАЛЬНО (Phase 3)

#### 3.1 Webhook для Push-уведомлений

**Идея**: Когда другое устройство пользователя создаёт задачу, мобильное приложение получит push-уведомление.

**Требования:**
- Регистрация device tokens
- WebSocket или Firebase Cloud Messaging
- Отправка events при изменении данных

---

#### 3.2 Exponential Backoff для Sync Manager

**Логика повторных попыток при сбое сети:**
```
1-я попытка: сразу
2-я попытка: +1 секунда
3-я попытка: +2 секунды
4-я попытка: +4 секунды
...
10-я попытка: +512 секунд (~8.5 минут)
Max: 1 час между попытками
```

---

## 📊 Схемы данных

### Миграция: Добавить поля синхронизации

```python
# services/core/alembic/versions/XXXXX_add_sync_fields.py

def upgrade():
    # Tasks
    op.add_column('tasks', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.add_column('tasks', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tasks', sa.Column('version', sa.Integer(), server_default='1'))
    
    op.create_index('idx_tasks_updated_at', 'tasks', ['user_id', 'updated_at'])
    op.create_index('idx_tasks_deleted_at', 'tasks', ['user_id', 'deleted_at'])
    
    # Purchases
    op.add_column('purchases', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.add_column('purchases', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('purchases', sa.Column('version', sa.Integer(), server_default='1'))
    
    op.create_index('idx_purchases_updated_at', 'purchases', ['user_id', 'updated_at'])
    op.create_index('idx_purchases_deleted_at', 'purchases', ['user_id', 'deleted_at'])
    
    # Categories
    op.add_column('categories', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.add_column('categories', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('categories', sa.Column('version', sa.Integer(), server_default='1'))
    
    op.create_index('idx_categories_updated_at', 'categories', ['user_id', 'updated_at'])
    op.create_index('idx_categories_deleted_at', 'categories', ['user_id', 'deleted_at'])


def downgrade():
    # Удалить индексы и колонки
    op.drop_index('idx_tasks_updated_at')
    op.drop_index('idx_tasks_deleted_at')
    op.drop_column('tasks', 'updated_at')
    op.drop_column('tasks', 'deleted_at')
    op.drop_column('tasks', 'version')
    
    # Аналогично для purchases и categories
```

---

## 🔧 Реализация по этапам

### Phase 1 (Week 1-2):
- ✅ Добавить `updated_at`, `deleted_at`, `version` в модели
- ✅ Создать Alembic миграцию
- ✅ Endpoint `/api/sync` для инкрементальной синхронизации
- ✅ Soft delete вместо физического удаления
- ✅ Поддержка client-side UUID

### Phase 2 (Week 3-4):
- ⚠️ Batch operations endpoint
- ⚠️ Conflict resolution (409 responses)
- ⚠️ Rate limiting на sync endpoints

### Phase 3 (Future):
- 🔄 WebSocket для real-time updates
- 🔄 Push notifications
- 🔄 Exponential backoff

---

## 📝 Checklist для реализации

- [ ] Добавить поля в models.py (updated_at, deleted_at, version)
- [ ] Создать миграцию Alembic
- [ ] Реализовать `/api/sync` endpoint
- [ ] Обновить DELETE endpoints для soft delete
- [ ] Поддержка client_id в POST endpoints
- [ ] Обновить GET endpoints (фильтр deleted_at)
- [ ] Добавить version check в PATCH endpoints
- [ ] Создать BatchOperation schema
- [ ] Реализовать `/api/batch` endpoint
- [ ] Обновить документацию API (Swagger)
- [ ] Написать тесты для sync логики
- [ ] Обновить .github/copilot-instructions.md

---

## 📚 Ссылки

- [Offline-First Architecture](https://offlinefirst.org/)
- [CQRS Pattern](../ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Database Design](../ARCHITECTURE.md#database-replication)
