# Развёртывание и эксплуатация

## Требования

### Системные требования

**Минимальные:**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 20 GB SSD
- OS: Linux/macOS/Windows (с WSL2)

**Рекомендуемые:**
- CPU: 8 cores
- RAM: 16 GB
- Disk: 50 GB SSD

### Программное обеспечение

- Docker 24.0+
- Docker Compose 2.0+
- Git

---

## Быстрый старт

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-org/tasks-finance-tracker-mircoservices.git
cd tasks-finance-tracker-mircoservices
```

### 2. Запуск всех сервисов

```bash
docker-compose up -d --build
```

Эта команда:
- Соберёт Docker образы для всех сервисов
- Создаст Docker сети
- Запустит все контейнеры
- Применит миграции баз данных

### 3. Проверка статуса

```bash
docker-compose ps
```

Все контейнеры должны иметь статус `Up` и `healthy`.

### 4. Проверка логов

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f users-service
docker-compose logs -f core-service
docker-compose logs -f analytics-service
```

### 5. Доступ к API

```bash
# Swagger UI
open http://localhost/auth/docs      # Users Service
open http://localhost/api/docs       # Core Service
open http://localhost/stats/docs     # Analytics Service

# RabbitMQ Management
open http://localhost:15672          # user:password
```

---

## Конфигурация

### Переменные окружения

#### Users Service

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@postgres-users:5432/users_db

# JWT
JWT_SECRET=supersecretkey
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# RabbitMQ
RABBITMQ_URL=amqp://user:password@rabbitmq:5672/
```

#### Core Service

```env
# Database (Master)
DATABASE_MASTER_URL=postgresql+asyncpg://user:password@postgres-core-master:5432/core_db

# Database (Replica)
DATABASE_REPLICA_URL=postgresql+asyncpg://user:password@postgres-core-replica:5432/core_db

# Redis
REDIS_URL=redis://redis:6379/0

# RabbitMQ
RABBITMQ_URL=amqp://user:password@rabbitmq:5672/

# JWT (для проверки токенов)
JWT_SECRET=supersecretkey
JWT_ALGORITHM=HS256
```

#### Analytics Service

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@analytics-db:5432/analytics_db

# RabbitMQ
RABBITMQ_URL=amqp://user:password@rabbitmq:5672/
```

### Изменение конфигурации

Отредактируйте `docker-compose.yml` в секции `environment` для каждого сервиса.

---

## Управление сервисами

### Запуск

```bash
# Все сервисы
docker-compose up -d

# Конкретный сервис
docker-compose up -d users-service
docker-compose up -d core-worker
docker-compose up -d analytics-worker
```

### Остановка

```bash
# Все сервисы
docker-compose stop

# Конкретный сервис
docker-compose stop users-service
```

### Перезапуск

```bash
# Все сервисы
docker-compose restart

# Конкретный сервис
docker-compose restart users-service
```

### Пересборка

```bash
# Пересборка и запуск
docker-compose up -d --build

# Принудительная пересборка без кэша
docker-compose build --no-cache
docker-compose up -d
```

### Удаление

```bash
# Остановка и удаление контейнеров
docker-compose down

# Удаление с volumes (БД будут очищены!)
docker-compose down -v

# Полная очистка (включая образы)
docker-compose down -v --rmi all
```

---

## Миграции баз данных

### Автоматические миграции

При запуске сервисов миграции применяются автоматически через команды в `Dockerfile`:

```bash
alembic upgrade head
```

Логика запуска миграций встроена непосредственно в CMD каждого Dockerfile, что упрощает структуру проекта.

### Создание новой миграции

#### Users Service

```bash
# Войти в контейнер
docker-compose exec users-service bash

# Создать миграцию
alembic -c /app/services/users/alembic.ini revision --autogenerate -m "Description"

# Применить миграцию
alembic -c /app/services/users/alembic.ini upgrade head

# Откат миграции
alembic -c /app/services/users/alembic.ini downgrade -1
```

#### Core Service

```bash
docker-compose exec core-service bash
alembic -c /app/services/core/alembic.ini revision --autogenerate -m "Description"
alembic -c /app/services/core/alembic.ini upgrade head
```

#### Analytics Service

```bash
docker-compose exec analytics-service bash
alembic -c /app/services/analytics/alembic.ini revision --autogenerate -m "Description"
alembic -c /app/services/analytics/alembic.ini upgrade head
```

### Проверка текущей версии

```bash
# Users
docker-compose exec users-service alembic -c /app/services/users/alembic.ini current

# Core
docker-compose exec core-service alembic -c /app/services/core/alembic.ini current

# Analytics
docker-compose exec analytics-service alembic -c /app/services/analytics/alembic.ini current
```

---

## Работа с базами данных

### Подключение к PostgreSQL

```bash
# Users DB
docker-compose exec postgres-users psql -U user -d users_db

# Core Master
docker-compose exec postgres-core-master psql -U user -d core_db

# Core Replica
docker-compose exec postgres-core-replica psql -U user -d core_db

# Analytics DB
docker-compose exec analytics-db psql -U user -d analytics_db
```

### Бэкап базы данных

```bash
# Users DB
docker-compose exec postgres-users pg_dump -U user users_db > backup_users_$(date +%Y%m%d).sql

# Core DB
docker-compose exec postgres-core-master pg_dump -U user core_db > backup_core_$(date +%Y%m%d).sql

# Analytics DB
docker-compose exec analytics-db pg_dump -U user analytics_db > backup_analytics_$(date +%Y%m%d).sql
```

### Восстановление из бэкапа

```bash
# Users DB
cat backup_users_20251127.sql | docker-compose exec -T postgres-users psql -U user -d users_db

# Core DB
cat backup_core_20251127.sql | docker-compose exec -T postgres-core-master psql -U user -d core_db

# Analytics DB
cat backup_analytics_20251127.sql | docker-compose exec -T analytics-db psql -U user -d analytics_db
```

---

## Работа с Redis

### Подключение к Redis CLI

```bash
docker-compose exec redis redis-cli
```

### Полезные команды

```redis
# Просмотр всех ключей
KEYS *

# Просмотр значения
GET tasks:user:123:filter:today

# Удаление ключа
DEL tasks:user:123:filter:today

# Просмотр TTL
TTL tasks:user:123:filter:today

# Очистка всей БД (осторожно!)
FLUSHDB

# Информация о Redis
INFO

# Мониторинг команд в реальном времени
MONITOR
```

### Просмотр дедлайнов задач (Sorted Set)

```redis
# Все дедлайны
ZRANGE task_deadlines 0 -1 WITHSCORES

# Просроченные задачи
ZRANGEBYSCORE task_deadlines 0 [timestamp] WITHSCORES
```

---

## Работа с RabbitMQ

### Management UI

Откройте http://localhost:15672

```
Login: user
Password: password
```

### Просмотр очередей

В UI перейдите в раздел **Queues** для просмотра:
- Количество сообщений
- Скорость обработки
- Consumers

### CLI команды

```bash
# Список очередей
docker-compose exec rabbitmq rabbitmqctl list_queues

# Список подключений
docker-compose exec rabbitmq rabbitmqctl list_connections

# Список consumers
docker-compose exec rabbitmq rabbitmqctl list_consumers

# Очистка очереди
docker-compose exec rabbitmq rabbitmqctl purge_queue analytics_queue
```

---

## Масштабирование

### Горизонтальное масштабирование сервисов

```bash
# Запуск нескольких инстансов Core Service
docker-compose up -d --scale core-service=3

# Запуск нескольких инстансов Users Service
docker-compose up -d --scale users-service=2

# Analytics Worker (осторожно - конкуренция)
docker-compose up -d --scale analytics-service=2
```

⚠️ **Важно:** Nginx нужно настроить для балансировки нагрузки между инстансами.

### Увеличение ресурсов

Отредактируйте `docker-compose.yml`:

```yaml
services:
  core-service:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## Мониторинг

### Health Checks

```bash
# Проверка всех сервисов
curl http://localhost/auth/health
curl http://localhost/api/health
curl http://localhost/stats/health
```

### Docker Health Status

```bash
docker-compose ps
```

Колонка `STATUS` должна показывать `healthy` для БД, Redis, RabbitMQ.

### Логи

```bash
# Последние 100 строк
docker-compose logs --tail 100

# Follow режим (real-time)
docker-compose logs -f

# Конкретный сервис с timestamp
docker-compose logs -f --timestamps users-service
```

### Метрики контейнеров

```bash
# Использование ресурсов
docker stats

# Конкретный контейнер
docker stats tasks-finance-tracker-mircoservices-core-service-1
```

---

## Troubleshooting

### Сервис не запускается

1. Проверьте логи:
   ```bash
   docker-compose logs users-service
   ```

2. Проверьте, что БД запущена:
   ```bash
   docker-compose ps postgres-users
   ```

3. Проверьте соединение с БД:
   ```bash
   docker-compose exec users-service nc -zv postgres-users 5432
   ```

### Миграции не применяются

```bash
# Войдите в контейнер
docker-compose exec users-service bash

# Проверьте текущую версию
alembic -c /app/services/users/alembic.ini current

# История миграций
alembic -c /app/services/users/alembic.ini history

# Принудительное применение
alembic -c /app/services/users/alembic.ini upgrade head
```

### Redis недоступен

```bash
# Проверьте статус
docker-compose ps redis

# Перезапустите
docker-compose restart redis

# Проверьте логи
docker-compose logs redis
```

### RabbitMQ не обрабатывает сообщения

1. Проверьте, что worker запущен:
   ```bash
   docker-compose logs analytics-service | grep -i worker
   ```

2. Проверьте очередь в Management UI

3. Проверьте подключение:
   ```bash
   docker-compose exec analytics-service nc -zv rabbitmq 5672
   ```

### 502 Bad Gateway от Nginx

1. Проверьте, что сервисы запущены:
   ```bash
   docker-compose ps
   ```

2. Проверьте Nginx конфигурацию:
   ```bash
   docker-compose exec nginx nginx -t
   ```

3. Перезапустите Nginx:
   ```bash
   docker-compose restart nginx
   ```

---

## Production рекомендации

### Безопасность

1. **Смените все дефолтные пароли:**
   - PostgreSQL: `user:password`
   - RabbitMQ: `user:password`
   - JWT_SECRET

2. **Используйте секреты:**
   ```yaml
   secrets:
     jwt_secret:
       file: ./secrets/jwt_secret.txt
   ```

3. **Настройте SSL/TLS:**
   - Добавьте SSL сертификаты в Nginx
   - Используйте Let's Encrypt

### Производительность

1. **PostgreSQL:**
   - Настройте репликацию для Core Replica
   - Увеличьте `shared_buffers`, `work_mem`
   - Настройте индексы

2. **Redis:**
   - Включите persistence (AOF)
   - Настройте eviction policy

3. **RabbitMQ:**
   - Настройте durable queues
   - Используйте cluster mode

### Резервное копирование

1. **Автоматические бэкапы:**
   ```bash
   # Cron job для ежедневного бэкапа
   0 2 * * * /path/to/backup.sh
   ```

2. **S3/Object Storage:**
   - Храните бэкапы удалённо
   - Настройте retention policy

### Мониторинг

1. **Prometheus + Grafana:**
   - Соберите метрики со всех сервисов
   - Настройте alerting

2. **ELK Stack:**
   - Централизованное логирование
   - Поиск по логам

3. **APM:**
   - New Relic / DataDog
   - Трейсинг запросов

---

## CI/CD

### GitHub Actions пример

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build images
        run: docker-compose build
      
      - name: Run tests
        run: docker-compose run --rm users-service pytest
      
      - name: Deploy to production
        run: |
          ssh user@server 'cd /app && docker-compose pull && docker-compose up -d'
```

---

## Поддержка

**Issues:** https://github.com/your-org/tasks-finance-tracker-mircoservices/issues

**Документация:** `/docs`

**Команда:** support@example.com

