# Analytics Service - Добавление аутентификации пользователей

## Дата: 8 декабря 2025 г.

## Проблема
Analytics service выдавал информацию обо всех пользователях системы без фильтрации. Требовалось добавить аутентификацию через Bearer token и фильтровать данные по текущему пользователю.

## Решение

### 1. Модель данных (`models.py`)
Добавлено поле `user_id` в модель `AnalyticsEvent`:
```python
user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
```

### 2. Миграция базы данных
Создана миграция Alembic: `22e5254220f6_add_user_id_to_analytics_events.py`
- Добавляет колонку `user_id` типа UUID
- Создает индекс на поле `user_id` для быстрой фильтрации

**Применение миграции:**
```bash
docker-compose exec analytics alembic upgrade head
```

### 3. Аутентификация (`auth.py`)
Создан новый модуль с функцией проверки JWT токенов:
- `get_current_user_id()` - FastAPI dependency для извлечения `user_id` из Bearer token
- Использует те же настройки JWT, что и users service (`JWT_SECRET`, `JWT_ALGORITHM`)
- Не требует обращения к базе данных users

### 4. Worker (`events_consumer.py`)
Обновлен для сохранения `user_id` из событий:
- Извлекает `user_id` из payload события
- Пропускает события без `user_id` (с предупреждением в логах)
- Сохраняет `user_id` в таблицу `analytics_events`

### 5. API Endpoints (`main.py`)
Все эндпоинты обновлены для фильтрации по текущему пользователю:

**`GET /stats/dashboard`**
- Добавлена зависимость `user_id: uuid.UUID = Depends(get_current_user_id)`
- Фильтрация событий: `WHERE user_id = <current_user> AND created_at >= <start_date>`

**`GET /stats/events/count`**
- Добавлена аутентификация
- Возвращает количество событий только текущего пользователя

**`GET /stats/events/recent`**
- Добавлена аутентификация
- Возвращает последние события только текущего пользователя

### 6. Зависимости (`pyproject.toml`)
Добавлена библиотека для работы с JWT:
```toml
pyjwt = "^2.8.0"
```

**Установка зависимостей:**
```bash
docker-compose build analytics
```

## Использование

### 1. Получение токена
```bash
# Логин пользователя
curl -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Ответ: {"access_token": "eyJ0eXAi...", "token_type": "bearer"}
```

### 2. Запросы к Analytics API
```bash
# Получение статистики дашборда
curl -X GET http://localhost/stats/dashboard?period=week \
  -H "Authorization: Bearer <your_token>"

# Количество событий
curl -X GET http://localhost/stats/events/count \
  -H "Authorization: Bearer <your_token>"

# Последние события
curl -X GET http://localhost/stats/events/recent?limit=10 \
  -H "Authorization: Bearer <your_token>"
```

## Безопасность

- ✅ Все эндпоинты защищены Bearer токеном
- ✅ Каждый пользователь видит только свои данные
- ✅ JWT токены проверяются на валидность и срок действия
- ✅ Индексация по `user_id` обеспечивает быструю фильтрацию

## Обратная совместимость

⚠️ **Breaking Change**: Все существующие запросы к analytics API теперь требуют Bearer token.

## Следующие шаги

1. Запустить миграцию базы данных
2. Пересобрать analytics service
3. Перезапустить контейнеры
4. Обновить клиентские приложения для передачи токена

```bash
docker-compose down
docker-compose up -d --build analytics
docker-compose exec analytics alembic upgrade head
```
