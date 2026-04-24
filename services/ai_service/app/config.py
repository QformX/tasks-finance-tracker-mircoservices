import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    jwt_secret: str = os.getenv("JWT_SECRET", "supersecretkey")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    database_url: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/dbname")
    core_service_url: str = os.getenv("CORE_SERVICE_URL", "http://core-service:8000")

settings = Settings()
