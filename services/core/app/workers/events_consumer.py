import asyncio
import json
import aio_pika
from sqlalchemy import delete

from app.core.database import SessionLocal
from app.core.config import settings
from app.models import Task, Purchase, Category


async def process_message(message: aio_pika.IncomingMessage):
    """Обработка входящих событий из RabbitMQ"""
    async with message.process():
        try:
            body = message.body.decode()
            data = json.loads(body)
            event_type = data.get("event_type")
            
            print(f"Core Worker received event: {event_type}")
            
            if event_type == "UserDeleted":
                await handle_user_deleted(data)
            else:
                print(f"Unknown event type: {event_type}")
                
        except Exception as e:
            print(f"Error processing message: {e}")


async def handle_user_deleted(event: dict):
    """
    Обработка удаления пользователя
    - Удаление всех задач пользователя
    - Удаление всех покупок пользователя
    - Удаление всех категорий пользователя
    """
    user_id = event.get("user_id")
    if not user_id:
        print("Error: UserDeleted event has no user_id")
        return
    
    try:
        async with SessionLocal() as session:
            stmt = delete(Task).where(Task.user_id == user_id)
            result = await session.execute(stmt)
            tasks_deleted = result.rowcount
            
            stmt = delete(Purchase).where(Purchase.user_id == user_id)
            result = await session.execute(stmt)
            purchases_deleted = result.rowcount
            
            stmt = delete(Category).where(Category.user_id == user_id)
            result = await session.execute(stmt)
            categories_deleted = result.rowcount
            
            await session.commit()
            
            print(f"User {user_id} data deleted: {tasks_deleted} tasks, {purchases_deleted} purchases, {categories_deleted} categories")
            
    except Exception as e:
        print(f"Failed to delete user data: {e}")


async def main():
    """Запуск worker для обработки событий"""
    await asyncio.sleep(5)
    
    print("Starting Core Service Worker...")
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    channel = await connection.channel()
    
    exchange = await channel.declare_exchange("core_events", aio_pika.ExchangeType.TOPIC, durable=True)
    
    queue = await channel.declare_queue("core_worker_queue", durable=True)
    
    await queue.bind(exchange, routing_key="users.deleted")
    
    await queue.consume(process_message)
    
    print("Core Worker listening for events...")
    await asyncio.Future() 


if __name__ == "__main__":
    asyncio.run(main())
