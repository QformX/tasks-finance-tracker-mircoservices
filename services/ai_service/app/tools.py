import os
import uuid
import re
import ast
import json
from typing import Optional, Any
from datetime import datetime
from langchain_core.tools import tool
from faststream.rabbit import RabbitBroker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from langchain_community.tools.tavily_search import TavilySearchResults
from app.schemas.commands import CreateTaskCMD, CreatePurchaseCMD, DeleteItemCMD

def parse_agent_input(input_val: Any) -> dict:
    """Helper to parse input that might be a stringified dict or JSON."""
    if isinstance(input_val, dict):
        return input_val
    
    if not isinstance(input_val, str):
        return {}

    input_str = input_val.strip()
    
    # Try JSON
    try:
        return json.loads(input_str)
    except:
        pass
        
    # Try Python dict literal
    try:
        return ast.literal_eval(input_str)
    except:
        pass
    
    # Try parsing key='value' or key="value" patterns
    try:
        # Regex to capture key=value pairs where value can be quoted or unquoted (numbers/bools)
        # Matches: key="value", key='value', key=123, key=true
        pattern = r"(\w+)\s*=\s*(?:['\"]([^'\"]*)['\"]|([^\s,]+))"
        matches = re.findall(pattern, input_str)
        if matches:
            result = {}
            for key, val_quoted, val_unquoted in matches:
                # val_quoted is the value if quotes were used
                # val_unquoted is the value if no quotes were used
                val = val_quoted if val_quoted else val_unquoted
                
                # Try to convert numbers/bools
                if val_unquoted:
                    if val.lower() == 'true': val = True
                    elif val.lower() == 'false': val = False
                    elif val.lower() == 'none': val = None
                    else:
                        try:
                            if '.' in val: val = float(val)
                            else: val = int(val)
                        except:
                            pass
                            
                result[key] = val
            return result
    except:
        pass
        
    return {}

def extract_uuid(text: str) -> str:
    """Extract UUID from a string."""
    if not text:
        return ""
    match = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', text, re.IGNORECASE)
    return match.group(0) if match else text.strip()

# Initialize RabbitMQ Broker
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
broker = RabbitBroker(RABBITMQ_URL)

# Initialize Database Engine (Using main DB as replica is skipped)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@postgres-core:5432/core_db")
engine = create_async_engine(DATABASE_URL)

@tool
async def create_task_rpc(user_id: str, title: Optional[str] = None, category_id: Optional[str] = None, due_date: Optional[str] = None) -> str:
    """Create a new task for the user. Returns the result from the Core service."""
    try:
        # Handle potential JSON/Dict input for user_id
        parsed_input = parse_agent_input(user_id)
        if isinstance(parsed_input, dict):
            if 'user_id' in parsed_input:
                user_id = parsed_input.get('user_id')
            
            # Try to fill in missing optional args from the parsed input
            if not title and 'title' in parsed_input:
                title = parsed_input.get('title')
            if not category_id and 'category_id' in parsed_input:
                category_id = parsed_input.get('category_id')
            if not due_date and 'due_date' in parsed_input:
                due_date = parsed_input.get('due_date')
            
        if not title:
            return "Error: 'title' is required to create a task."
        
        clean_user_id = extract_uuid(str(user_id))
        clean_category_id = extract_uuid(str(category_id)) if category_id else None

        cmd = CreateTaskCMD(
            user_id=uuid.UUID(clean_user_id),
            title=title,
            category_id=uuid.UUID(clean_category_id) if clean_category_id else None,
            due_date=datetime.fromisoformat(due_date) if due_date else None
        )
        
        # Check connection status using the private attribute or method if public one is missing
        # FastStream 0.5.0+ might use different property
        if not getattr(broker, "connected", False):
             await broker.connect()
            
        # RPC call
        result = await broker.publish(
            {
                "command": "create_task",
                "data": cmd.model_dump(mode='json')
            },
            queue="core-rpc-queue",
            rpc=True
        )
        return f"Task created successfully: {result}"
    except Exception as e:
        return f"Error creating task: {str(e)}"

@tool
async def create_purchase_rpc(user_id: str, title: Optional[str] = None, category_id: Optional[str] = None, cost: Optional[float] = None, quantity: int = 1) -> str:
    """Create a new purchase for the user. Returns the result from the Core service."""
    try:
        # Handle potential JSON/Dict input for user_id
        parsed_input = parse_agent_input(user_id)
        if isinstance(parsed_input, dict):
            if 'user_id' in parsed_input:
                user_id = parsed_input.get('user_id')
            
            if not title and 'title' in parsed_input:
                title = parsed_input.get('title')
            if not category_id and 'category_id' in parsed_input:
                category_id = parsed_input.get('category_id')
            if not cost and 'cost' in parsed_input:
                cost = parsed_input.get('cost')
            if quantity == 1 and 'quantity' in parsed_input:
                quantity = parsed_input.get('quantity')

        if not title:
            return "Error: 'title' is required to create a purchase."
            
        clean_user_id = extract_uuid(str(user_id))
        clean_category_id = extract_uuid(str(category_id)) if category_id else None

        cmd = CreatePurchaseCMD(
            user_id=uuid.UUID(clean_user_id),
            title=title,
            category_id=uuid.UUID(clean_category_id) if clean_category_id else None,
            cost=cost,
            quantity=quantity
        )
        
        if not getattr(broker, "connected", False):
            await broker.connect()

        # RPC call
        result = await broker.publish(
            {
                "command": "create_purchase",
                "data": cmd.model_dump(mode='json')
            },
            queue="core-rpc-queue",
            rpc=True
        )
        return f"Purchase created successfully: {result}"
    except Exception as e:
        return f"Error creating purchase: {str(e)}"

@tool
async def delete_item_rpc(user_id: str, item_type: Optional[str] = None, item_id: Optional[str] = None) -> str:
    """Delete a task or purchase. item_type must be 'task' or 'purchase'."""
    try:
        # Handle potential JSON/Dict input for user_id
        parsed_input = parse_agent_input(user_id)
        if isinstance(parsed_input, dict):
            if 'user_id' in parsed_input:
                user_id = parsed_input.get('user_id')
            
            if not item_type and 'item_type' in parsed_input:
                item_type = parsed_input.get('item_type')
            if not item_id and 'item_id' in parsed_input:
                item_id = parsed_input.get('item_id')
            
        if not item_type or not item_id:
            return "Error: 'item_type' and 'item_id' are required."
            
        clean_user_id = extract_uuid(str(user_id))
        clean_item_id = extract_uuid(str(item_id))

        cmd = DeleteItemCMD(
            user_id=uuid.UUID(clean_user_id),
            item_type=item_type,
            item_id=uuid.UUID(clean_item_id)
        )
        
        if not getattr(broker, "connected", False):
            await broker.connect()

        # RPC call
        result = await broker.publish(
            {
                "command": "delete_item",
                "data": cmd.model_dump(mode='json')
            },
            queue="core-rpc-queue",
            rpc=True
        )
        return f"Item deleted successfully: {result}"
    except Exception as e:
        return f"Error deleting item: {str(e)}"

@tool
async def search_product(query: str) -> str:
    """Search for product information or prices online using Tavily."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return f"[MOCK] Tavily API key missing. Search results for '{query}': Product A - $10, Product B - $15."
    
    try:
        tool = TavilySearchResults(max_results=3)
        results = await tool.ainvoke(query)
        return str(results)
    except Exception as e:
        return f"Error searching: {str(e)}"

@tool
async def get_my_data(user_id: str) -> str:
    """Get the user's current tasks and purchases from the database (Read-Only)."""
    try:
        # Handle potential JSON/Dict input for user_id
        parsed_user = parse_agent_input(user_id)
        if isinstance(parsed_user, dict) and 'user_id' in parsed_user:
            user_id = parsed_user['user_id']
            
        clean_user_id = extract_uuid(str(user_id))
        
        async with AsyncSession(engine) as session:
            # Fetch tasks
            tasks_result = await session.execute(
                text("SELECT id, title, is_completed, due_date FROM tasks WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 10"),
                {"user_id": clean_user_id}
            )
            tasks = [{"id": str(r.id), "title": r.title, "completed": r.is_completed, "due": str(r.due_date)} for r in tasks_result]
            
            # Fetch purchases
            purchases_result = await session.execute(
                text("SELECT id, title, is_bought, cost, quantity FROM purchases WHERE user_id = :user_id ORDER BY id DESC LIMIT 10"),
                {"user_id": clean_user_id}
            )
            purchases = [{"id": str(r.id), "title": r.title, "bought": r.is_bought, "cost": r.cost, "qty": r.quantity} for r in purchases_result]
            
            return f"Current Data:\nTasks: {tasks}\nPurchases: {purchases}"
    except Exception as e:
        return f"Error fetching data: {str(e)}"

@tool
async def get_user_categories(user_id: str) -> str:
    """Get list of categories for a user. Returns names and IDs."""
    try:
        # Handle potential JSON/Dict input
        parsed = parse_agent_input(user_id)
        if isinstance(parsed, dict) and 'user_id' in parsed:
            user_id = parsed['user_id']
            
        clean_user_id = extract_uuid(str(user_id))
        
        async with AsyncSession(engine) as session:
            result = await session.execute(
                text("SELECT id, title, type FROM categories WHERE user_id = :user_id"),
                {"user_id": clean_user_id}
            )
            categories = [{"id": str(row.id), "name": row.title, "type": row.type} for row in result]
            return str(categories)
    except Exception as e:
        return f"Error fetching categories: {str(e)}"

tools = [create_task_rpc, create_purchase_rpc, delete_item_rpc, search_product, get_my_data, get_user_categories]
