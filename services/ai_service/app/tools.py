import os
import uuid
import re
import ast
import json
import httpx
import jwt
from typing import Optional, Any
from datetime import datetime, timedelta, timezone
from langchain_core.tools import tool
from faststream.rabbit import RabbitBroker
from langchain_community.tools.tavily_search import TavilySearchResults
from app.schemas.commands import CreateTaskCMD, CreatePurchaseCMD, DeleteItemCMD, CreateCategoryCMD, UpdateTaskCMD, UpdatePurchaseCMD
from app.config import settings
from langchain.chains.summarize import load_summarize_chain
from langchain_core.documents import Document
from langchain_groq import ChatGroq

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
        # Updated pattern to allow spaces in unquoted values (terminated by comma or end of string)
        pattern = r"(\w+)\s*=\s*(?:['\"]([^'\"]*)['\"]|([^,]+?))(?:\s*,|\s*$)"
        matches = re.findall(pattern, input_str)
        if matches:
            result = {}
            for key, val_quoted, val_unquoted in matches:
                # val_quoted is the value if quotes were used
                # val_unquoted is the value if no quotes were used
                val = val_quoted if val_quoted else val_unquoted.strip()
                
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
    if not text or text.strip().lower() in ["null", "none", "undefined", ""]:
        return ""
    match = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', text, re.IGNORECASE)
    return match.group(0) if match else text.strip()

# Initialize RabbitMQ Broker
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
broker = RabbitBroker(RABBITMQ_URL)

def create_access_token(user_id: str) -> str:
    """Create a temporary access token for internal API calls."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=5)
    to_encode = {"sub": user_id, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt

def format_rpc_result(entity_name: str, action: str, result: Any) -> str:
    """Helper to check RPC result status and format the output response for LLM."""
    if isinstance(result, str):
        try:
            result = json.loads(result)
        except:
            pass
            
    if isinstance(result, dict):
        if result.get("status") == "error":
            return f"Error {action} {entity_name}: {result.get('message', 'Unknown error')}"
        return f"{entity_name.capitalize()} {action} successfully: {result}"
        
    return f"{entity_name.capitalize()} {action} result: {result}"

@tool
async def create_task_rpc(user_id: str, title: Optional[str] = None, category_id: Optional[str] = None, due_date: Optional[str] = None, description: Optional[str] = None) -> str:
    """
    Create a new task for the user.
    Args:
        user_id: The UUID of the user.
        title: The title of the task.
        category_id: Optional UUID of the category the task belongs to.
        due_date: Optional ISO format date string for when the task is due.
        description: Optional brief description or notes for the task.
    Returns the result from the Core service.
    """
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
            if not description and 'description' in parsed_input:
                description = parsed_input.get('description')
            
        if not title:
            return "Error: 'title' is required to create a task."
        
        clean_user_id = extract_uuid(str(user_id))
        clean_category_id = extract_uuid(str(category_id)) if category_id else None

        cmd = CreateTaskCMD(
            user_id=uuid.UUID(clean_user_id),
            title=title,
            category_id=uuid.UUID(clean_category_id) if clean_category_id else None,
            due_date=datetime.fromisoformat(due_date) if due_date else None,
            description=description
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
        return format_rpc_result("task", "created", result)
    except Exception as e:
        return f"Error creating task: {str(e)}"

@tool
async def update_task_rpc(user_id: str, task_id: Optional[str] = None, title: Optional[str] = None, category_id: Optional[str] = None, due_date: Optional[str] = None, is_completed: Optional[bool] = None, description: Optional[str] = None) -> str:
    """
    Update an existing task. Provide only the fields you want to update.
    Args:
        user_id: The UUID of the user.
        task_id: The UUID of the task to update.
        title: Optional new title.
        category_id: Optional new category UUID.
        due_date: Optional new ISO format date string.
        is_completed: Optional boolean indicating completion status.
        description: Optional new description.
    """
    try:
        # Handle potential JSON/Dict input for user_id
        parsed_input = parse_agent_input(user_id)
        if isinstance(parsed_input, dict):
            if 'user_id' in parsed_input:
                user_id = parsed_input.get('user_id')
            if not task_id and 'task_id' in parsed_input:
                task_id = parsed_input.get('task_id')
            
            if not title and 'title' in parsed_input:
                title = parsed_input.get('title')
            if not category_id and 'category_id' in parsed_input:
                category_id = parsed_input.get('category_id')
            if not due_date and 'due_date' in parsed_input:
                due_date = parsed_input.get('due_date')
            if is_completed is None and 'is_completed' in parsed_input:
                is_completed = parsed_input.get('is_completed')
            if not description and 'description' in parsed_input:
                description = parsed_input.get('description')

        if not task_id:
            return "Error: 'task_id' is required to update a task."
            
        clean_user_id = extract_uuid(str(user_id))
        clean_task_id = extract_uuid(str(task_id))
        clean_category_id = extract_uuid(str(category_id)) if category_id else None

        cmd = UpdateTaskCMD(
            user_id=uuid.UUID(clean_user_id),
            task_id=uuid.UUID(clean_task_id),
            title=title,
            category_id=uuid.UUID(clean_category_id) if clean_category_id else None,
            due_date=datetime.fromisoformat(due_date) if due_date else None,
            is_completed=is_completed,
            description=description
        )
        
        if not getattr(broker, "connected", False):
            await broker.connect()

        # RPC call
        result = await broker.publish(
            {
                "command": "update_task",
                "data": cmd.model_dump(mode='json')
            },
            queue="core-rpc-queue",
            rpc=True
        )
        return format_rpc_result("task", "updated", result)
    except Exception as e:
        return f"Error updating task: {str(e)}"

@tool
async def update_purchase_rpc(user_id: str, purchase_id: Optional[str] = None, title: Optional[str] = None, category_id: Optional[str] = None, cost: Optional[float] = None, quantity: Optional[int] = None, is_bought: Optional[bool] = None) -> str:
    """
    Update an existing purchase. Provide only the fields you want to update.
    Args:
        user_id: The UUID of the user.
        purchase_id: The UUID of the purchase to update.
        title: Optional new title/name.
        category_id: Optional new category UUID.
        cost: Optional new cost.
        quantity: Optional new quantity.
        is_bought: Optional boolean indicating if the item has been bought.
    """
    try:
        parsed_input = parse_agent_input(user_id)
        if isinstance(parsed_input, dict):
            if 'user_id' in parsed_input:
                user_id = parsed_input.get('user_id')
            if not purchase_id and 'purchase_id' in parsed_input:
                purchase_id = parsed_input.get('purchase_id')
            
            if not title and 'title' in parsed_input:
                title = parsed_input.get('title')
            if not category_id and 'category_id' in parsed_input:
                category_id = parsed_input.get('category_id')
            if not cost and 'cost' in parsed_input:
                cost = parsed_input.get('cost')
            if not quantity and 'quantity' in parsed_input:
                quantity = parsed_input.get('quantity')
            if is_bought is None and 'is_bought' in parsed_input:
                is_bought = parsed_input.get('is_bought')

        if not purchase_id:
            return "Error: 'purchase_id' is required to update a purchase."
            
        clean_user_id = extract_uuid(str(user_id))
        clean_purchase_id = extract_uuid(str(purchase_id))
        clean_category_id = extract_uuid(str(category_id)) if category_id else None

        cmd = UpdatePurchaseCMD(
            user_id=uuid.UUID(clean_user_id),
            purchase_id=uuid.UUID(clean_purchase_id),
            title=title,
            category_id=uuid.UUID(clean_category_id) if clean_category_id else None,
            cost=cost,
            quantity=quantity,
            is_bought=is_bought
        )
        
        if not getattr(broker, "connected", False):
            await broker.connect()

        # RPC call
        result = await broker.publish(
            {
                "command": "update_purchase",
                "data": cmd.model_dump(mode='json')
            },
            queue="core-rpc-queue",
            rpc=True
        )
        return format_rpc_result("purchase", "updated", result)
    except Exception as e:
        return f"Error updating purchase: {str(e)}"

@tool
async def create_purchase_rpc(user_id: str, title: Optional[str] = None, category_id: Optional[str] = None, cost: Optional[float] = None, quantity: int = 1) -> str:
    """
    Create a new purchase for the user.
    Args:
        user_id: The UUID of the user.
        title: The name/title of the purchase.
        category_id: Optional category UUID.
        cost: Optional cost/price of the purchase (as a float).
        quantity: Quantity of the item purchased (default: 1).
    Returns the result from the Core service.
    """
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
        return format_rpc_result("purchase", "created", result)
    except Exception as e:
        return f"Error creating purchase: {str(e)}"

@tool
async def create_category_rpc(user_id: str, title: Optional[str] = None, type: Optional[str] = None) -> str:
    """Create a new category. type must be 'tasks', 'purchases', or 'mixed'."""
    try:
        # Handle potential JSON/Dict input for user_id
        parsed_input = parse_agent_input(user_id)
        if isinstance(parsed_input, dict):
            if 'user_id' in parsed_input:
                user_id = parsed_input.get('user_id')
            if not title and 'title' in parsed_input:
                title = parsed_input.get('title')
            if not type and 'type' in parsed_input:
                type = parsed_input.get('type')

        if not title or not type:
            return "Error: 'title' and 'type' are required."
            
        if type not in ["tasks", "purchases", "mixed"]:
            return "Error: 'type' must be 'tasks', 'purchases', or 'mixed'."

        clean_user_id = extract_uuid(str(user_id))

        cmd = CreateCategoryCMD(
            user_id=uuid.UUID(clean_user_id),
            title=title,
            type=type
        )
        
        if not getattr(broker, "connected", False):
            await broker.connect()

        # RPC call
        result = await broker.publish(
            {
                "command": "create_category",
                "data": cmd.model_dump(mode='json')
            },
            queue="core-rpc-queue",
            rpc=True
        )
        return format_rpc_result("category", "created", result)
    except Exception as e:
        return f"Error creating category: {str(e)}"

@tool
async def delete_item_rpc(user_id: str, item_type: Optional[str] = None, item_id: Optional[str] = None) -> str:
    """Delete a task, purchase, or category. item_type must be 'task', 'purchase', or 'category'."""
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
        return format_rpc_result("item", "deleted", result)
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
async def get_user_data(user_id: str, item_type: str = "all", limit: Optional[int] = None, status: str = "active", fields: str = "id,title") -> str:
    """
    Get user's tasks and/or purchases with field filtering.
    Args:
        user_id: User UUID
        item_type: 'tasks', 'purchases', or 'all' (default)
        limit: Optional max number of items to return
        status: 'active' (default), 'completed', or 'all'
        fields: Comma-separated list of fields to return (default: id,title)
    Returns only the requested fields for each item to minimize context size.
    """
    try:
        parsed_input = parse_agent_input(user_id)
        if isinstance(parsed_input, dict):
            if 'user_id' in parsed_input:
                user_id = parsed_input.get('user_id')
            if 'item_type' in parsed_input:
                item_type = parsed_input.get('item_type')
            if 'limit' in parsed_input and parsed_input.get('limit') is not None:
                limit = int(parsed_input.get('limit'))
            if 'status' in parsed_input:
                status = parsed_input.get('status')
            if 'fields' in parsed_input:
                fields = parsed_input.get('fields')
        clean_user_id = extract_uuid(str(user_id))
        
        # Normalize item_type to support both singular and plural forms
        item_type_norm = item_type.lower().strip()
        if item_type_norm == "task":
            item_type_norm = "tasks"
        elif item_type_norm == "purchase":
            item_type_norm = "purchases"
        else:
            item_type_norm = item_type_norm
            
        token = create_access_token(clean_user_id)
        headers = {"Authorization": f"Bearer {token}"}
        tasks_data = []
        purchases_data = []
        field_list = [f.strip() for f in fields.split(",") if f.strip()]
        async with httpx.AsyncClient() as client:
            # Fetch Tasks
            if item_type_norm in ["tasks", "all"]:
                params = {}
                if status == "active":
                    params["is_completed"] = "false"
                elif status == "completed":
                    params["is_completed"] = "true"
                tasks_resp = await client.get(f"{settings.core_service_url}/tasks/", headers=headers, params=params)
                if tasks_resp.status_code == 200:
                    all_tasks = tasks_resp.json()
                    sliced_tasks = all_tasks[:limit] if limit is not None else all_tasks
                    for t in sliced_tasks:
                        filtered = {k: t.get(k) for k in field_list if k in t}
                        tasks_data.append(filtered)
            # Fetch Purchases
            if item_type_norm in ["purchases", "all"]:
                fetch_bought = True if status == "completed" else False
                params = {"is_bought": str(fetch_bought).lower()}
                purchases_resp = await client.get(f"{settings.core_service_url}/purchases/", headers=headers, params=params)
                if purchases_resp.status_code == 200:
                    all_purchases = purchases_resp.json()
                    sliced_purchases = all_purchases[:limit] if limit is not None else all_purchases
                    for p in sliced_purchases:
                        filtered = {k: p.get(k) for k in field_list if k in p}
                        purchases_data.append(filtered)
            result = []
            if tasks_data:
                result.append(f"Tasks ({len(tasks_data)}): {tasks_data}")
            if purchases_data:
                result.append(f"Purchases ({len(purchases_data)}): {purchases_data}")
            if not result:
                return "No data found."
            return "\n".join(result)
    except Exception as e:
        return f"Error fetching data: {str(e)}"

@tool
async def get_user_categories(user_id: str) -> str:
    """Get list of categories for a user. Returns simplified list (id, title, type)."""
    try:
        # Handle potential JSON/Dict input
        parsed = parse_agent_input(user_id)
        if isinstance(parsed, dict) and 'user_id' in parsed:
            user_id = parsed['user_id']
            
        clean_user_id = extract_uuid(str(user_id))
        token = create_access_token(clean_user_id)
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{settings.core_service_url}/categories/", headers=headers)
            if resp.status_code == 200:
                categories = resp.json()
                # Simplify response to save tokens
                simplified = [
                    {"id": c["id"], "title": c["title"], "type": c["type"]} 
                    for c in categories
                ]
                return str(simplified)
            else:
                return f"Error fetching categories: {resp.text}"
    except Exception as e:
        return f"Error fetching categories: {str(e)}"

@tool
def summarize_text(text: str, language: str = "ru") -> str:
    """
    Summarize a long text/document to fit LLM context. Use for large notes, descriptions, or chat history.
    Args:
        text: The text to summarize
        language: Output language (ru/en)
    """
    try:
        # Use a small LLM for summarization to save tokens (or reuse main LLM)
        api_key = os.getenv("GROQ_API_KEY")
        llm = ChatGroq(model="llama-3.3-8b", api_key=api_key, temperature=0)
        chain = load_summarize_chain(llm, chain_type="stuff")
        doc = Document(page_content=text)
        summary = chain.run([doc])
        if language == "ru":
            return f"Резюме: {summary}"
        return f"Summary: {summary}"
    except Exception as e:
        return f"Error summarizing: {str(e)}"

@tool
def batch_summarize_text(texts: list[str], language: str = "ru") -> list[str]:
    """
    Summarize a list of texts/documents in batch to fit LLM context. Uses batching for efficiency.
    Args:
        texts: List of texts to summarize
        language: Output language (ru/en)
    Returns a list of summaries.
    """
    try:
        api_key = os.getenv("GROQ_API_KEY")
        llm = ChatGroq(model="llama-3.3-8b", api_key=api_key, temperature=0)
        chain = load_summarize_chain(llm, chain_type="stuff")
        docs = [Document(page_content=t) for t in texts]
        # Используем .batch() для параллельной обработки
        summaries = chain.batch([[doc] for doc in docs])
        if language == "ru":
            return [f"Резюме: {s}" for s in summaries]
        return [f"Summary: {s}" for s in summaries]
    except Exception as e:
        return [f"Error summarizing: {str(e)}"]

tools = [create_task_rpc, update_task_rpc, create_purchase_rpc, update_purchase_rpc, create_category_rpc, delete_item_rpc, search_product, get_user_data, get_user_categories, summarize_text, batch_summarize_text]
