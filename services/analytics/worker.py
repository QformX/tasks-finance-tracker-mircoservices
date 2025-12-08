import asyncio
import os
import json
import aio_pika
from services.analytics.database import SessionLocal, init_db
from services.analytics.models import AnalyticsEvent

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

async def process_message(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            body = message.body.decode()
            data = json.loads(body)
            print(f"Received event: {data}")

            # Extract user_id from event payload
            user_id = data.get("user_id")
            if not user_id:
                print(f"Warning: Event {data.get('event_type')} has no user_id, skipping")
                return

            # Save to DB
            async with SessionLocal() as session:
                event = AnalyticsEvent(
                    user_id=user_id,
                    event_type=data.get("event_type", "unknown"),
                    payload=data
                )
                session.add(event)
                await session.commit()
        except Exception as e:
            print(f"Error processing message: {e}")

async def main():
    # Wait for DB and RMQ to be ready
    await asyncio.sleep(5) 
    
    # Init DB - Tables are managed by Alembic migrations
    # await init_db()

    print("Starting Analytics Worker...")
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()

    # Declare exchange (same as core)
    exchange = await channel.declare_exchange("core_events", aio_pika.ExchangeType.TOPIC, durable=True)
    
    # Declare queue
    queue = await channel.declare_queue("analytics_queue", durable=True)
    
    # Bind queue to exchange
    await queue.bind(exchange, routing_key="#") # Listen to all events

    # Start consuming
    await queue.consume(process_message)

    print("Listening for messages...")
    await asyncio.Future() # Run forever

if __name__ == "__main__":
    asyncio.run(main())

