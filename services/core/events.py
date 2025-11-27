import os
import json
import uuid
import aio_pika
from datetime import datetime

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

class RabbitMQClient:
    connection: aio_pika.Connection | None = None
    channel: aio_pika.Channel | None = None
    exchange: aio_pika.Exchange | None = None

    async def connect(self):
        self.connection = await aio_pika.connect_robust(RABBITMQ_URL)
        self.channel = await self.connection.channel()
        # Declare a topic exchange
        self.exchange = await self.channel.declare_exchange("core_events", aio_pika.ExchangeType.TOPIC, durable=True)

    async def close(self):
        if self.connection:
            await self.connection.close()

    async def publish(self, routing_key: str, message: dict):
        if not self.exchange:
            raise RuntimeError("RabbitMQ not connected")
        
        # Ensure UUIDs and Datetimes are serialized
        def json_serial(obj):
            if isinstance(obj, (datetime, datetime.date)):
                return obj.isoformat()
            if isinstance(obj, uuid.UUID):
                return str(obj)
            raise TypeError (f"Type {type(obj)} not serializable")

        body = json.dumps(message, default=json_serial).encode()
        
        await self.exchange.publish(
            aio_pika.Message(body=body, delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
            routing_key=routing_key
        )

mq_client = RabbitMQClient()

