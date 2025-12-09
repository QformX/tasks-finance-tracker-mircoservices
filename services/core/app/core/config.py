import os
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    Конфигурация Core Service
    Все обязательные переменные должны быть установлены в .env или переменных окружения
    """
    # JWT Configuration
    jwt_secret: str = Field(..., description="Secret key for JWT token validation")
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    
    # Database Configuration
    database_url: str = Field(..., description="PostgreSQL Master connection URL")
    
    # RabbitMQ Configuration
    rabbitmq_url: str = Field(
        default="amqp://guest:guest@localhost:5672/",
        description="RabbitMQ connection URL"
    )
    
    # Redis Configuration
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
    )
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        env_prefix = ""


# Singleton instance
settings = Settings()
