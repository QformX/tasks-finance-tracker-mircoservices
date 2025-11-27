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
COPY . /app/services/analytics/
ENV PYTHONPATH=/app

# Copy entrypoint scripts
COPY entrypoint.sh /entrypoint.sh
COPY entrypoint-with-worker.sh /entrypoint-with-worker.sh
RUN chmod +x /entrypoint.sh /entrypoint-with-worker.sh

# Command is overriden in docker-compose, but providing a default
ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "services.analytics.main:app", "--host", "0.0.0.0", "--port", "8000"]

