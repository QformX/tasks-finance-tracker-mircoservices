# API Layer Documentation

## Архитектура

### 1. **Users Service** (`/auth/*`)
- Аутентификация и управление пользователями
- JWT токены (Access Token)
- Soft-delete пользователей с событиями в RabbitMQ

### 2. **Core Service** (`/api/*`)
- **CQRS**: 
  - `GET` → Replica DB (`get_db_replica`)
  - `POST/PUT/DELETE` → Master DB (`get_db_master`)
- **Кэширование**: Redis с TTL 60s для списков
- **События**: RabbitMQ для аналитики
- **Модули**:
  - Categories (категории для задач и покупок)
  - Tasks (задачи с напоминаниями)
  - Purchases (покупки с расчётом трат)
  - Smart Views (динамические фильтры на основе JSON правил)

### 3. **Analytics Service** (`/stats/*`)
- OLAP запросы к событийному хранилищу
- Агрегация статистики по периодам
- Графики для дашборда

---

## Использование API

### Шаг 1: Регистрация пользователя

```bash
curl -X POST http://localhost/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

### Шаг 2: Получение токена

```bash
curl -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

Ответ:
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### Шаг 3: Использование Core API

**Создание категории:**
```bash
curl -X POST http://localhost/api/categories/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Работа",
    "type": "tasks",
    "color": "#FF5733"
  }'
```

**Создание задачи:**
```bash
curl -X POST http://localhost/api/tasks/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Завершить проект",
    "category_id": "UUID_КАТЕГОРИИ",
    "due_date": "2025-12-31T23:59:59"
  }'
```

**Получение задач с фильтром "сегодня":**
```bash
curl -X GET "http://localhost/api/tasks/?filter=today" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Обновить задачу (частично или полностью):**
```bash
curl -X PATCH http://localhost/api/tasks/TASK_UUID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Обновленное название",
    "is_completed": true,
    "due_date": "2025-12-15"
  }'
```

**Переключить статус задачи (completed ↔ uncompleted):**
```bash
curl -X POST http://localhost/api/tasks/TASK_UUID/toggle \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Создание покупки:**
```bash
curl -X POST http://localhost/api/purchases/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Молоко",
    "cost": 150.50,
    "quantity": 2,
    "unit": "л"
  }'
```

**Обновить покупку (частично или полностью):**
```bash
curl -X PATCH http://localhost/api/purchases/PURCHASE_UUID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Молоко обезжиренное",
    "cost": 160.00,
    "is_bought": true
  }'
```

**Переключить статус покупки (bought ↔ unbought):**
```bash
curl -X POST http://localhost/api/purchases/PURCHASE_UUID/toggle \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Создать умный фильтр:**
```bash
curl -X POST http://localhost/api/smart-views/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Просроченные задачи",
    "rules": {
      "type": "tasks",
      "filters": {
        "is_completed": false,
        "due_date_to": "2025-11-27T00:00:00"
      }
    }
  }'
```

**Получить элементы по умному фильтру:**
```bash
curl -X GET http://localhost/api/smart-views/VIEW_UUID/items \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Шаг 4: Аналитика

**Получить статистику дашборда:**
```bash
curl -X GET "http://localhost/stats/dashboard?period=week" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Ответ:
```json
{
  "total_events": 150,
  "tasks_created": 45,
  "tasks_completed": 32,
  "purchases_created": 28,
  "purchases_completed": 20,
  "total_spending": 15430.50,
  "period": "week",
  "daily_stats": [
    {
      "date": "2025-11-20",
      "tasks": 12,
      "purchases": 8,
      "spending": 3200.0
    }
  ]
}
```

---

## Ключевые особенности реализации

### CQRS в Core Service
```python
# Чтение из Replica
@router.get("/tasks/")
async def get_tasks(session: AsyncSession = Depends(get_db_replica)):
    ...

# Запись в Master + События
@router.post("/tasks/")
async def create_task(session: AsyncSession = Depends(get_db_master)):
    # 1. Write to Master DB
    # 2. Invalidate Redis cache
    # 3. Add reminder to Redis Sorted Set
    # 4. Publish event to RabbitMQ
    ...
```

### Redis кэширование
- Генерация ключа на основе параметров запроса
- TTL 60 секунд
- Инвалидация при любых изменениях

### RabbitMQ события
- `TaskCreated`, `TaskCompleted`
- `PurchaseCreated`, `PurchaseCompleted`
- `UserDeleted`
- Все события обрабатываются Analytics Worker

### Умные фильтры
- JSON правила хранятся в БД
- Динамический Query Builder
- Поддержка сложных условий фильтрации

---

## Swagger UI

- **Users**: http://localhost/auth/docs
- **Core**: http://localhost/api/docs
- **Analytics**: http://localhost/stats/docs

---

## Мониторинг

### RabbitMQ Management
```
http://localhost:15672
Login: user
Password: password
```

### Проверка здоровья сервисов
```bash
curl http://localhost/auth/health
curl http://localhost/api/health
curl http://localhost/stats/health
```

