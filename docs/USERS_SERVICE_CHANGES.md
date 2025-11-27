# Users Service - Изменения в API

## ✅ Выполненные изменения

### 1. **Регистрация пользователя** (`POST /auth/register`)

**Было:**
- Принимало только `email` и `password`

**Стало:**
- Принимает: `username`, `email`, `password`
- Проверяет уникальность как email, так и username

**Пример запроса:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Пример ответа:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "johndoe",
  "email": "john@example.com",
  "created_at": "2025-11-27T13:42:00Z"
}
```

---

### 2. **Логин** (`POST /auth/login`)

**Было:**
- Использовал `OAuth2PasswordRequestForm` (form-data)
- Принимал параметры через `username` и `password` поля формы

**Стало:**
- Принимает JSON в теле запроса
- Параметры: только `email` и `password`

**Пример запроса:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Пример ответа:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "refresh_token": null
}
```

---

### 3. **Авторизация** (`GET /auth/users/me`)

**Было:**
- Использовал `OAuth2PasswordBearer` 
- Принимал множество параметров

**Стало:**
- Использует `HTTPBearer`
- Принимает **только Bearer Token** в заголовке `Authorization`

**Пример запроса:**
```http
GET /auth/users/me HTTP/1.1
Host: localhost
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Пример ответа:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "johndoe",
  "email": "john@example.com",
  "created_at": "2025-11-27T13:42:00Z"
}
```

---

### 4. **Удаление пользователя** (`DELETE /auth/users/me`)

Без изменений. Работает с Bearer Token.

---

## 🗄️ Изменения в базе данных

### Миграция: `a3b2c1d4e5f6_add_username_field.py`

**Изменения:**
1. Добавлено поле `username` в таблицу `users`
2. Создан уникальный индекс на `username`
3. Для существующих пользователей `username` автоматически генерируется из email (часть до @)

**SQL:**
```sql
-- Добавление колонки
ALTER TABLE users ADD COLUMN username VARCHAR;

-- Создание индекса
CREATE UNIQUE INDEX ix_users_username ON users (username);

-- Заполнение для существующих записей
UPDATE users SET username = split_part(email, '@', 1) WHERE username IS NULL;

-- Установка NOT NULL
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
```

---

## 🧪 Тестирование в Swagger

Swagger UI доступен по адресу: **http://localhost/auth/docs**

### Тестовый флоу:

1. **Регистрация:**
   ```json
   POST /auth/register
   {
     "username": "testuser",
     "email": "test@example.com",
     "password": "mypassword123"
   }
   ```

2. **Логин:**
   ```json
   POST /auth/login
   {
     "email": "test@example.com",
     "password": "mypassword123"
   }
   ```
   Скопируйте `access_token` из ответа.

3. **Авторизованный запрос:**
   - Нажмите кнопку "Authorize" в Swagger UI
   - Введите токен: `Bearer <your_access_token>`
   - Теперь можно использовать `GET /auth/users/me` и `DELETE /auth/users/me`

---

## 📝 Технические детали

### Схемы (Pydantic):

```python
# Регистрация
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

# Логин
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Ответ
class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    created_at: datetime
```

### Модель базы данных:

```python
class User(Base):
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

---

## ✅ Статус

- ✅ Регистрация обновлена (username + email + password)
- ✅ Логин обновлен (JSON body вместо form-data)
- ✅ Авторизация упрощена (только Bearer token)
- ✅ Миграция применена (поле username добавлено)
- ✅ Все сервисы работают корректно

