import os
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    Конфигурация Analytics Service
    Все обязательные переменные должны быть установлены в .env или переменных окружения
    """
    # JWT Configuration
    jwt_secret: str = Field(..., description="Secret key for JWT token validation")
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    
    # Database Configuration
    database_url: str = Field(..., description="PostgreSQL connection URL")
    
    # RabbitMQ Configuration
    rabbitmq_url: str = Field(
        default="amqp://guest:guest@localhost:5672/",
        description="RabbitMQ connection URL"
    )
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        # Преобразование имен переменных: jwt_secret → JWT_SECRET
        env_prefix = ""


# Singleton instance
settings = Settings()
