import os
from faststream import FastStream
from faststream.rabbit import RabbitBroker
from app.core.config import settings
from app.schemas.commands import CreateTaskCMD, CreatePurchaseCMD, DeleteItemCMD, CreateCategoryCMD, UpdateTaskCMD
from app.services.tasks import TaskService
from app.services.purchases import PurchaseService
from app.services.categories import CategoryService
from app.core.database import SessionLocal
from app.schemas import TaskCreate, PurchaseCreate, CategoryCreate, TaskUpdate
from app.core.events import mq_client
import logging

# Use AI_RABBITMQ_URL for the RPC broker
rabbitmq_url = os.getenv("AI_RABBITMQ_URL")
if not rabbitmq_url:
    # Fallback for local dev or if not set
    rabbitmq_url = settings.rabbitmq_url

broker = RabbitBroker(rabbitmq_url)
app = FastStream(broker)

@app.on_startup
async def startup():
    await mq_client.connect()

@app.after_shutdown
async def shutdown():
    await mq_client.close()

logger = logging.getLogger(__name__)

@broker.subscriber("core-rpc-queue")
async def handle_rpc_command(msg: dict):
    """
    Обработчик RPC команд.
    Ожидает сообщение формата:
    {
        "command": "create_task" | "create_purchase" | "delete_item",
        "data": { ... }
    }
    """
    command = msg.get("command")
    data = msg.get("data")
    
    logger.info(f"Received RPC command: {command}")

    async with SessionLocal() as session:
        try:
            if command == "create_task":
                cmd = CreateTaskCMD(**data)
                task_in = TaskCreate(
                    title=cmd.title,
                    category_id=cmd.category_id,
                    due_date=cmd.due_date
                )
                result = await TaskService.create(session, cmd.user_id, task_in)
                return {"status": "success", "id": str(result.id)}

            elif command == "update_task":
                cmd = UpdateTaskCMD(**data)
                task_in = TaskUpdate(
                    title=cmd.title,
                    category_id=cmd.category_id,
                    due_date=cmd.due_date,
                    is_completed=cmd.is_completed
                )
                # Filter out None values to avoid overwriting with None
                update_data = {k: v for k, v in task_in.model_dump().items() if v is not None}
                if not update_data:
                     return {"status": "success", "message": "No changes detected"}
                     
                task_in_filtered = TaskUpdate(**update_data)
                
                result = await TaskService.update(session, cmd.user_id, cmd.task_id, task_in_filtered)
                if result:
                    return {"status": "success", "id": str(result.id)}
                else:
                    return {"status": "error", "message": "Task not found"}

            elif command == "create_purchase":
                cmd = CreatePurchaseCMD(**data)
                purchase_in = PurchaseCreate(
                    title=cmd.title,
                    category_id=cmd.category_id,
                    cost=cmd.cost,
                    quantity=cmd.quantity
                )
                result = await PurchaseService.create(session, cmd.user_id, purchase_in)
                return {"status": "success", "id": str(result.id)}

            elif command == "create_category":
                cmd = CreateCategoryCMD(**data)
                category_in = CategoryCreate(
                    title=cmd.title,
                    type=cmd.type
                )
                result = await CategoryService.create(session, cmd.user_id, category_in)
                return {"status": "success", "id": str(result.id)}

            elif command == "delete_item":
                cmd = DeleteItemCMD(**data)
                if cmd.item_type == "task":
                    await TaskService.delete(session, cmd.user_id, cmd.item_id)
                elif cmd.item_type == "purchase":
                    await PurchaseService.delete(session, cmd.user_id, cmd.item_id)
                elif cmd.item_type == "category":
                    # Default strategy for RPC delete is delete_all
                    await CategoryService.delete(session, cmd.user_id, cmd.item_id, strategy="delete_all")
                return {"status": "success"}

            else:
                return {"status": "error", "message": f"Unknown command: {command}"}

        except Exception as e:
            logger.error(f"Error processing command {command}: {e}")
            return {"status": "error", "message": str(e)}
