import os
import aio_pika
import json
import uuid
from datetime import datetime

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

class RabbitMQClient:
    connection: aio_pika.Connection | None = None
    channel: aio_pika.Channel | None = None
    exchange: aio_pika.Exchange | None = None

    async def connect(self):
        self.connection = await aio_pika.connect_robust(RABBITMQ_URL)
        self.channel = await self.connection.channel()
        self.exchange = await self.channel.declare_exchange("core_events", aio_pika.ExchangeType.TOPIC, durable=True)

    async def close(self):
        if self.connection:
            await self.connection.close()

    async def publish(self, routing_key: str, message: dict):
        if not self.exchange:
            # Try to connect if not connected? 
            # ideally, application startup handles this.
            raise RuntimeError("RabbitMQ not connected")
        
        body = json.dumps(message).encode()
        
        await self.exchange.publish(
            aio_pika.Message(body=body, delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
            routing_key=routing_key
        )

mq_client = RabbitMQClient()

