# 📚 Индекс документации

Быстрый доступ ко всей документации проекта.

---

## 📖 Основная документация

### [📘 README.md](../README.md)
**Главная страница проекта**
- Обзор системы
- Быстрый старт
- Технологический стек
- Основные команды

---

## 📂 Детальная документация (`/docs`)

### [🏗️ ARCHITECTURE.md](../docs/ARCHITECTURE.md)
**Архитектура системы**
- Диаграммы компонентов
- Описание микросервисов
- Инфраструктура
- CQRS, Event-Driven паттерны
- Потоки данных
- Масштабирование

### [🔌 API_DOCUMENTATION.md](../docs/API_DOCUMENTATION.md)
**API документация**
- Все endpoint'ы по сервисам
- Примеры cURL запросов
- Swagger UI ссылки
- Схемы запросов/ответов

### [🚀 DEPLOYMENT.md](../docs/DEPLOYMENT.md)
**Развёртывание и эксплуатация**
- Системные требования
- Docker Compose инструкции
- Конфигурация сервисов
- Миграции БД
- Работа с PostgreSQL, Redis, RabbitMQ
- Масштабирование
- Мониторинг
- Troubleshooting
- Production рекомендации

### [📝 USERS_SERVICE_CHANGES.md](../docs/USERS_SERVICE_CHANGES.md)
**История изменений Users Service**
- Обновления API
- Изменения в БД
- Миграции
- Примеры использования

### [📑 docs/README.md](../docs/README.md)
**Навигация по документации**
- Структура документации
- Быстрая навигация
- Ссылки на внешние ресурсы

---

## 🎯 Навигация по сценариям

### 🆕 Я новый разработчик

1. Начните с [README.md](../README.md) - общий обзор
2. Изучите [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - понимание структуры
3. Прочитайте [DEPLOYMENT.md](../docs/DEPLOYMENT.md) - локальная разработка
4. Используйте [API_DOCUMENTATION.md](../docs/API_DOCUMENTATION.md) - работа с API

### 🔧 Я DevOps инженер

1. [DEPLOYMENT.md](../docs/DEPLOYMENT.md) - развёртывание
2. [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - инфраструктура
3. [README.md](../README.md) - команды управления

### 💻 Я Frontend разработчик

1. [API_DOCUMENTATION.md](../docs/API_DOCUMENTATION.md) - все endpoint'ы
2. [USERS_SERVICE_CHANGES.md](../docs/USERS_SERVICE_CHANGES.md) - аутентификация
3. Swagger UI: http://localhost/auth/docs

### 🏗️ Я Backend разработчик

1. [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - паттерны и структура
2. [API_DOCUMENTATION.md](../docs/API_DOCUMENTATION.md) - контракты API
3. [DEPLOYMENT.md](../docs/DEPLOYMENT.md) - миграции и разработка

---

## 📊 Диаграммы

### Архитектурная диаграмма
См. [ARCHITECTURE.md](../docs/ARCHITECTURE.md#архитектура)

### CQRS Flow
См. [ARCHITECTURE.md](../docs/ARCHITECTURE.md#потоки-данных)

### Database Schema
См. [ARCHITECTURE.md](../docs/ARCHITECTURE.md#база-данных)

---

## 🔗 Внешние ссылки

### Swagger UI
- **Users Service:** http://localhost/auth/docs
- **Core Service:** http://localhost/api/docs
- **Analytics Service:** http://localhost/stats/docs

### Management Interfaces
- **RabbitMQ:** http://localhost:15672 (user:password)

### Официальная документация
- [FastAPI](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org/en/20/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Redis](https://redis.io/docs/)
- [RabbitMQ](https://www.rabbitmq.com/documentation.html)

---

## 🔍 Поиск информации

| Что ищу | Где найти |
|---------|----------|
| Как запустить проект | [README.md](../README.md#быстрый-старт) |
| Описание сервисов | [ARCHITECTURE.md](../docs/ARCHITECTURE.md#компоненты-системы) |
| API endpoint'ы | [API_DOCUMENTATION.md](../docs/API_DOCUMENTATION.md) |
| Миграции БД | [DEPLOYMENT.md](../docs/DEPLOYMENT.md#миграции-баз-данных) |
| Конфигурация | [DEPLOYMENT.md](../docs/DEPLOYMENT.md#конфигурация) |
| Масштабирование | [ARCHITECTURE.md](../docs/ARCHITECTURE.md#масштабирование) |
| Troubleshooting | [DEPLOYMENT.md](../docs/DEPLOYMENT.md#troubleshooting) |
| История изменений | [USERS_SERVICE_CHANGES.md](../docs/USERS_SERVICE_CHANGES.md) |

---

## 📝 Обновление документации

При изменении кода не забудьте обновить:

1. **API изменения** → [API_DOCUMENTATION.md](../docs/API_DOCUMENTATION.md)
2. **Архитектурные изменения** → [ARCHITECTURE.md](../docs/ARCHITECTURE.md)
3. **Новые команды/конфигурация** → [DEPLOYMENT.md](../docs/DEPLOYMENT.md)
4. **Changelog** → Создать новый файл в `/docs`

---

**Последнее обновление:** 2025-11-27

