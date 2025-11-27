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
# No poetry.lock yet, so skipping

# Configure poetry to not use virtualenvs
RUN poetry config virtualenvs.create false

# Install dependencies
RUN poetry install --no-interaction --no-ansi --no-root

# Copy app code
COPY . /app/services/core/
# Main entrypoint needs to be importable
ENV PYTHONPATH=/app

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Command
ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "services.core.main:app", "--host", "0.0.0.0", "--port", "8000"]

