from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Конфигурация приложения"""
    
    jwt_secret: str = Field(default="supersecretkey", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=30)
    refresh_token_expire_days: int = Field(default=30)
    
    database_url: str = Field(
        default="postgresql+asyncpg://user:password@localhost/users_db",
        alias="DATABASE_URL"
    )
    
    rabbitmq_url: str = Field(
        default="amqp://guest:guest@localhost:5672/",
        alias="RABBITMQ_URL"
    )
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


settings = Settings()
