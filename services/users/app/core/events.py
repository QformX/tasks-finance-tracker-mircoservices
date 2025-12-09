import aio_pika
import json

from app.core.config import settings


class RabbitMQClient:
    connection: aio_pika.Connection | None = None
    channel: aio_pika.Channel | None = None
    exchange: aio_pika.Exchange | None = None

    async def connect(self):
        """Подключение к RabbitMQ"""
        self.connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        self.channel = await self.connection.channel()
        self.exchange = await self.channel.declare_exchange(
            "core_events", 
            aio_pika.ExchangeType.TOPIC, 
            durable=True
        )

    async def close(self):
        """Закрытие соединения"""
        if self.connection:
            await self.connection.close()

    async def publish(self, routing_key: str, message: dict):
        """Публикация события"""
        if not self.exchange:
            raise RuntimeError("RabbitMQ not connected")
        
        body = json.dumps(message).encode()
        
        await self.exchange.publish(
            aio_pika.Message(body=body, delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
            routing_key=routing_key
        )


mq_client = RabbitMQClient()
