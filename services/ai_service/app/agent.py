import os
from datetime import datetime
from typing import AsyncGenerator
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.globals import set_llm_cache
from langchain_community.cache import RedisCache
from redis import Redis
from app.tools import tools
from app.database import SessionLocal
from app.models import ChatMessage
from sqlalchemy import select
from langchain_core.messages import HumanMessage, AIMessage

# Setup Redis Cache
try:
    redis_client = Redis(host="redis", port=6379, db=0)
    set_llm_cache(RedisCache(redis_client))
    print("Redis Cache initialized for LLM.")
except Exception as e:
    print(f"Failed to initialize Redis Cache: {e}")

# Initialize LLM
USE_LOCAL_LLM = os.getenv("USE_LOCAL_LLM", "false").lower() == "true"
if USE_LOCAL_LLM:
    LOCAL_LLM_URL = os.getenv("LOCAL_LLM_URL", "http://host.docker.internal:1234/v1")
    LOCAL_LLM_MODEL = os.getenv("LOCAL_LLM_MODEL", "qwen-3-5-nsfw")
    print(f"Initializing Local LLM (LM Studio) at {LOCAL_LLM_URL} using model {LOCAL_LLM_MODEL}")
    
    # Monkeypatch langchain_openai to handle null content for local server compatibility
    try:
        import langchain_openai.chat_models.base as chat_base
        orig_convert = chat_base._convert_message_to_dict
        def patched_convert(message, *args, **kwargs):
            dct = orig_convert(message, *args, **kwargs)
            if dct.get("content") is None:
                dct["content"] = ""
            if "tool_calls" in dct and dct["tool_calls"]:
                for tc in dct["tool_calls"]:
                    if "type" in tc and isinstance(tc["type"], str) and "function" in tc["type"]:
                        tc["type"] = "function"
            print(f"CONVERTED_MSG: {dct}", flush=True)
            return dct
        chat_base._convert_message_to_dict = patched_convert
        print("Successfully patched ChatOpenAI _convert_message_to_dict for local compatibility")
    except Exception as patch_err:
        print(f"Failed to patch ChatOpenAI: {patch_err}")

    llm = ChatOpenAI(
        base_url=LOCAL_LLM_URL,
        api_key="lm-studio",  # Required but placeholder
        model=LOCAL_LLM_MODEL,
        temperature=0
    )
else:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    # Using a standard Groq model that supports tool calling reliably
    llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY, temperature=0)

# Define Prompt
prompt = ChatPromptTemplate.from_messages([
    # L1: Статический слой (Системные инструкции и правила)
    ("system", """You are a helpful assistant for a task and finance tracker.
Answer in the user's language (Russian).
Всегда выводите ответ в понятном, человеческом формате (на русском языке). Избегайте вывода сырого JSON-кода в финальном ответе; пишите красивый, связный текст с перечислением созданных или измененных элементов.
Use tools to fetch or modify data.
Use 'Current Date and Time' from the context to resolve relative dates.
Confirm actions.
When the user requests to create tasks or purchases (and optionally a category), you MUST call the tools to create each individual item. Do NOT write your final text response or list the items as created until you have actually executed the creation tools for all of them and received their success results.
After creating the items via tools, ALWAYS list the created items in your final response (including their titles, descriptions, and due dates if set) so the user knows exactly what has been created.
Do not add unnecessary explanations.
Use sentence case for task/purchase titles (e.g., "Buy milk", not "BUY MILK").
DO NOT translate category names, task titles, or purchase titles. Keep them exactly as the user wrote them (e.g., if the user says "горе-покупки", create a category named "горе-покупки", DO NOT translate it to "purchases" or "bad purchases").

CRITICAL INSTRUCTION FOR CATEGORY EXISTENCE:
Before calling create_category_rpc, you MUST call get_user_categories first to check if a category with the exact same name (case-insensitive) already exists. If a category with that name exists, use its ID and DO NOT call create_category_rpc. Only call create_category_rpc if the category does not exist in the list.

CRITICAL INSTRUCTION FOR TASK DUE DATES:
When creating tasks, check if the user specified a due date, deadline, or date/time (e.g., "tomorrow", "today", "завтра", "дедлайн завтра", "к пятнице"). You MUST calculate the exact date in YYYY-MM-DD format based on the "Current Date and Time" provided in the context.
YOU MUST PASS THIS DATE AS THE 'due_date' PARAMETER IN EVERY SINGLE 'create_task_rpc' TOOL CALL. Do NOT just mention the deadline in your final text reply — it MUST be saved in the database via the tool call parameter.

CRITICAL INSTRUCTION FOR TASK DESCRIPTIONS:
When creating tasks, if the user requested descriptions (e.g. "добавь небольшое описание к каждой задаче"), you MUST generate a brief, context-appropriate description (1-2 sentences) based on the task title and request, and PASS it as the 'description' parameter in every 'create_task_rpc' tool call.

CRITICAL INSTRUCTION FOR UPDATING TASKS:
If the user wants to update, edit, modify, add a description to, change the deadline of, or complete an existing task:
1. If the task ID is provided in the message, use it directly with `update_task_rpc`.
2. If the task ID is not provided, you MUST first call `get_user_data` (with `item_type="tasks"`, and matching fields) to find the correct task and retrieve its ID.
3. Once you have the task ID, call `update_task_rpc` to apply the updates. Do NOT create a new task if the user wants to edit or add something to an existing one.

CRITICAL INSTRUCTION FOR COMPLETENESS:
1. You MUST call create_task_rpc (or create_purchase_rpc) for EVERY SINGLE task or purchase requested by the user. If there are 4 tasks, you must execute the tool 4 times.
2. For EVERY task tool call, you MUST include the calculated 'due_date' (if a deadline was requested or implied) and the generated 'description' (if descriptions were requested or implied). If no deadline or description is requested or implied, you may omit these parameters or pass null. Do NOT make up arbitrary deadlines or descriptions if the user did not request them.
3. Keep a list of all requested tasks in your reasoning. Do not stop generating tool calls until you have executed the tool for all of them.
4. NEVER hallucinate or make up IDs. Every ID in the final response must come directly from a successful tool execution.

CRITICAL INSTRUCTION FOR REPEATED REQUESTS / VERIFICATION:
Never assume that tasks, purchases, or categories exist in the database just because they are mentioned in the chat history. If the user repeats a request to create items, or asks to add descriptions/deadlines to tasks, you MUST query the database first (using get_user_categories or get_user_data) to verify their actual existence and current state. If they do not exist or need to be updated with descriptions/due_dates, you MUST call the appropriate creation or update tools (e.g. update_task_rpc) to synchronize the database. Do not just output text without invoking the tools.

CRITICAL INSTRUCTION FOR DEPENDENCIES:
If you need to create a parent object (like a Category) and then child objects (like Tasks or Purchases) that belong to it:
1. Always call get_user_categories first to check if the category already exists.
2. If it does not exist, call the tool to create the Category, and wait for its new Category ID.
3. If it already exists, use the existing Category ID.
4. Only then call the tools to create the Tasks/Purchases, passing the correct category ID.
NEVER guess the category_id or try to create tasks without getting/creating the category first.
"""),
    # L2: Условно-статический слой (Данные пользователя и контекст сессии)
    ("system", """Session Context:
User ID: {user_id}
Current Date and Time: {current_time}"""),
    # L3: Динамический слой (История и текущий запрос)
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

# Create Agent
agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True, max_iterations=10)

async def process_chat(message: str, user_id: str, chat_history: list = None) -> AsyncGenerator[str, None]:
    """
    Process a chat message and yield events/responses.
    """
    # Округление времени до минут для стабильности кэша L2 (убрали секунды)
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M")
    current_day = datetime.now().strftime("%A")
    time_str = f"{current_time} ({current_day})"

    input_with_context = f"""Request: {message}

IMPORTANT: 
1. When calling tools that require user_id, ALWAYS use the User ID provided in the Session Context.
2. Use 'Current Date and Time' from Session Context to resolve relative dates (today, tomorrow, next friday, etc.) into YYYY-MM-DD format for tool arguments.
"""
    
    async for chunk in agent_executor.astream({
        "user_id": user_id,
        "current_time": time_str,
        "input": input_with_context,
        "chat_history": chat_history or []
    }):
        if "actions" in chunk:
            for action in chunk["actions"]:
                print(f"Action: {action.tool} -> {action.tool_input}", flush=True)
        elif "steps" in chunk:
            for step in chunk["steps"]:
                print(f"Observation: {step.observation}", flush=True)
        elif "output" in chunk:
            yield chunk["output"]
