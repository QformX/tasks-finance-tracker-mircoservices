FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry

# Copy project files
COPY pyproject.toml .

# Configure poetry
RUN poetry config virtualenvs.create false

# Install dependencies
RUN poetry install --no-interaction --no-ansi --no-root

# Copy app code
COPY . /app/services/users/
ENV PYTHONPATH=/app

# Run migrations and start the application
CMD ["sh", "-c", "cd /app/services/users && echo 'Running Alembic migrations...' && alembic upgrade head && echo 'Starting application...' && cd /app && uvicorn services.users.main:app --host 0.0.0.0 --port 8000"]

