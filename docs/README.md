# 📚 Документация проекта

Полная документация микросервисной системы Tasks & Finance Tracker.

---

## 📑 Содержание

| Документ | Описание |
|----------|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | **Архитектура системы** - подробное описание компонентов, потоков данных, паттернов проектирования |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | **API документация** - полное описание всех endpoint'ов с примерами запросов |
| [DEPLOYMENT.md](DEPLOYMENT.md) | **Развёртывание** - инструкции по установке, конфигурации и эксплуатации |

---

## 🚀 Быстрая навигация

### Для новых разработчиков

1. **Начните с архитектуры:** [ARCHITECTURE.md](ARCHITECTURE.md)
   - Понимание общей структуры
   - Компоненты системы
   - Паттерны проектирования

2. **Изучите API:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
   - Доступные endpoint'ы
   - Примеры запросов
   - Swagger UI

3. **Разверните локально:** [DEPLOYMENT.md](DEPLOYMENT.md)
   - Быстрый старт
   - Docker Compose
   - Миграции БД

### Для DevOps инженеров

1. **Развёртывание:** [DEPLOYMENT.md](DEPLOYMENT.md)
   - Требования к системе
   - Конфигурация сервисов
   - Мониторинг и логирование
   - Production рекомендации

2. **Архитектура инфраструктуры:** [ARCHITECTURE.md](ARCHITECTURE.md)
   - PostgreSQL (Master/Replica)
   - Redis кэширование
   - RabbitMQ очереди
   - Масштабирование

### Для Frontend разработчиков

1. **API документация:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
   - Все endpoint'ы
   - Схемы запросов/ответов
   - Примеры cURL

2. **Аутентификация:**
   - Регистрация пользователей
   - JWT токены
   - Bearer авторизация

---

## 🔍 Структура документации

### [ARCHITECTURE.md](ARCHITECTURE.md)

Полное описание архитектуры системы:

- **Обзор системы** - диаграммы компонентов
- **Микросервисы:**
  - Users Service - аутентификация и пользователи
  - Core Service - основная бизнес-логика
  - Analytics Service - события и статистика
- **Инфраструктура:**
  - PostgreSQL (4 инстанса)
  - Redis кэширование
  - RabbitMQ очереди
- **Паттерны:**
  - CQRS
  - Event-Driven
  - API Gateway
- **Потоки данных**
- **Масштабирование**
- **Безопасность**

### [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

Полная API документация:

- **Users Service** (`/auth/*`)
  - Регистрация, логин
  - Управление профилем
  - JWT токены
  
- **Core Service** (`/api/*`)
  - Categories API
  - Tasks API (с фильтрами)
  - Purchases API
  - Smart Views API
  
- **Analytics Service** (`/stats/*`)
  - Dashboard статистика
  - События
  - Метрики

- **Примеры запросов** - готовые cURL команды
- **Swagger UI** - интерактивная документация

### [DEPLOYMENT.md](DEPLOYMENT.md)

Руководство по развёртыванию:

- **Системные требования**
- **Быстрый старт** - Docker Compose
- **Конфигурация** - переменные окружения
- **Управление сервисами:**
  - Запуск/остановка
  - Перезапуск
  - Логи
- **Миграции баз данных:**
  - Автоматические миграции
  - Создание новых миграций
  - Откат миграций
- **Работа с инфраструктурой:**
  - PostgreSQL
  - Redis
  - RabbitMQ
- **Масштабирование**
- **Мониторинг**
- **Troubleshooting**
- **Production рекомендации**
- **CI/CD**

---

## 🛠️ Инструменты

### Swagger UI

Интерактивная документация API доступна по адресам:

```
http://localhost/auth/docs     - Users Service
http://localhost/api/docs      - Core Service
http://localhost/stats/docs    - Analytics Service
```

### RabbitMQ Management

Управление очередями и мониторинг сообщений:

```
http://localhost:15672
Login: user
Password: password
```

### Postman Collection

TODO: Добавить Postman коллекцию с примерами запросов

---

## 📝 Схемы и диаграммы

### Архитектурная диаграмма

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
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │
    ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
    │ PostgreSQL  │  │ PostgreSQL  │  │ PostgreSQL  │
    │  Users DB   │  │  Core DB    │  │ Analytics   │
    └─────────────┘  └─────────────┘  └─────────────┘
```

### Поток данных (CQRS)

```
Write Operation (Command):
Client → Nginx → Core Service → Master DB
                      ↓
           [Cache Invalidation]
                      ↓
              RabbitMQ Event
                      ↓
            Analytics Worker
                      ↓
           Analytics DB (Append)

Read Operation (Query):
Client → Nginx → Core Service
                      ↓
              Check Redis Cache
                 ↓          ↓
            Hit (fast)   Miss (slow)
                             ↓
                      Replica DB
                             ↓
                    Save to Cache
                             ↓
                      Return data
```

---

## 🔗 Полезные ссылки

### Официальная документация технологий

- [FastAPI](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org/en/20/)
- [Alembic](https://alembic.sqlalchemy.org/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Redis](https://redis.io/docs/)
- [RabbitMQ](https://www.rabbitmq.com/documentation.html)
- [Docker](https://docs.docker.com/)
- [Nginx](https://nginx.org/en/docs/)

### Паттерны и практики

- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Microservices Pattern](https://microservices.io/patterns/index.html)
- [API Gateway Pattern](https://microservices.io/patterns/apigateway.html)

---

## 📞 Поддержка

Если у вас возникли вопросы:

1. **Проверьте документацию** в этой папке
2. **Swagger UI** - интерактивная документация API
3. **Issues** - создайте issue в репозитории
4. **Email** - support@example.com

---

## 🔄 Обновление документации

При внесении изменений в код, пожалуйста:

1. Обновите соответствующий документ
2. Добавьте примеры использования
3. Обновите диаграммы (если необходимо)
4. Создайте Pull Request

---

**Последнее обновление:** 2025-11-27

