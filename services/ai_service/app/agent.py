import os
from datetime import datetime
from typing import AsyncGenerator
from langchain_groq import ChatGroq
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.globals import set_llm_cache
from langchain_community.cache import RedisCache
from redis import Redis
from app.tools import tools

# Setup Redis Cache
try:
    redis_client = Redis(host="redis", port=6379, db=0)
    set_llm_cache(RedisCache(redis_client))
    print("Redis Cache initialized for LLM.")
except Exception as e:
    print(f"Failed to initialize Redis Cache: {e}")

# Initialize LLM
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
# Using a standard Groq model that supports tool calling reliably
llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY, temperature=0)

# Define Prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a helpful assistant for a task and finance tracker.
Answer in the user's language (Russian).
Use tools to fetch or modify data.
Use 'Current Date and Time' from the context to resolve relative dates.
Confirm actions.
Do not add unnecessary explanations.
Use sentence case for task/purchase titles (e.g., "Buy milk", not "BUY MILK").

CRITICAL INSTRUCTION FOR DEPENDENCIES:
If you need to create a parent object (like a Category) and then child objects (like Tasks or Purchases) that belong to it:
1. Call the tool to create the Category first.
2. WAIT for the tool to return the new Category ID.
3. ONLY THEN call the tools to create the Tasks/Purchases, passing the new 'category_id'.
NEVER guess the category_id or try to do both in the same step.
"""),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

# Create Agent
agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True, max_iterations=10)

async def process_chat(message: str, user_id: str) -> AsyncGenerator[str, None]:
    """
    Process a chat message and yield events/responses.
    """
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    current_day = datetime.now().strftime("%A")

    # Inject user_id into the prompt context
    input_with_context = f"""
Current Date and Time: {current_time} ({current_day})
User ID: {user_id}
Request: {message}

IMPORTANT: 
1. When calling tools that require user_id, ALWAYS use '{user_id}'.
2. Use 'Current Date and Time' to resolve relative dates (today, tomorrow, next friday, etc.) into YYYY-MM-DD format for tool arguments.
"""
    
    async for chunk in agent_executor.astream({"input": input_with_context}):
        if "actions" in chunk:
            for action in chunk["actions"]:
                print(f"Action: {action.tool} -> {action.tool_input}")
        elif "steps" in chunk:
            for step in chunk["steps"]:
                print(f"Observation: {step.observation}")
        elif "output" in chunk:
            yield chunk["output"]
