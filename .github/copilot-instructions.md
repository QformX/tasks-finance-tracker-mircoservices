# 🧑‍💻 Copilot Instructions for Tasks & Finance Tracker Microservices

## Big Picture Architecture
- **Microservices:** Three main services: `users`, `core`, and `analytics`, each in its own folder under `services/`.
- **API Gateway:** All traffic routes through Nginx (`deploy/nginx/nginx.conf`).
- **Communication:** Services interact via HTTP (REST) and RabbitMQ (event-driven, async ops).
- **Databases:** Each service has its own PostgreSQL DB; `core` uses Master/Replica for CQRS.
- **Cache:** Redis is used for caching and fast data access.

## Developer Workflows
- **Build & Run:**
  - Use `docker-compose up -d --build` to start all services and dependencies.
  - Check status with `docker-compose ps`.
- **API Docs:**
  - Swagger UI for each service: `/auth/docs`, `/api/docs`, `/stats/docs` (see README for URLs).
- **Migrations:**
  - Alembic is used for DB migrations per service (`services/*/alembic/`).
  - Run migrations inside the relevant container or via Poetry.
- **Testing:**
  - No explicit test workflow found; follow service-level conventions if present.

## Project-Specific Conventions
- **Auth:** JWT tokens, Bearer scheme, bcrypt for passwords.
- **Endpoints:**
  - `users`: `/auth/*` (register, login, profile)
  - `core`: `/api/*` (tasks, purchases, categories, smart views)
  - `analytics`: `/stats/*` (dashboard, events)
- **Async:** FastAPI + asyncpg for async DB ops; event-driven flows via RabbitMQ.
- **CQRS:** Read/write separation in `core` service, with DB replication.
- **Event Sourcing:** Analytics tracks all events (append-only, OLAP queries).

## Integration Points
- **Nginx:** Central entrypoint, routes to services by path.
- **RabbitMQ:** Used for async event delivery between services.
- **Redis:** Shared cache for performance.
- **Docker Compose:** Orchestrates all containers, networks, and volumes.

## Key Files & Directories
- `services/users/`, `services/core/`, `services/analytics/`: Main service code.
- `deploy/nginx/nginx.conf`: API Gateway config.
- `docker-compose.yml`: Service orchestration.
- `docs/ARCHITECTURE.md`, `docs/API_DOCUMENTATION.md`: Deep dives into system and API.

## Patterns & Examples
- **Service boundaries:** Keep business logic, models, and migrations isolated per service.
- **Async/await:** Use async DB drivers and FastAPI endpoints.
- **Event publishing:** Use RabbitMQ for cross-service events (see `worker.py` in analytics).
- **Auth flows:** JWT issued on login, required for protected endpoints.

---
For more details, see the README and docs/ folder. If conventions or workflows are unclear, ask for clarification or check service-level code for examples.
