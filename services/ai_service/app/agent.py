import os
from datetime import datetime
from typing import AsyncGenerator
from langchain_groq import ChatGroq
from langchain.agents import AgentExecutor, create_react_agent
from langchain_core.prompts import PromptTemplate
from app.tools import tools

# Initialize LLM
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
llm = ChatGroq(model="qwen/qwen3-32b", api_key=GROQ_API_KEY, temperature=0)

# Define Prompt
template = '''
Ты — ассистент для трекера задач и покупок. Отвечай на языке пользователя. Используй инструменты для получения или изменения данных. Для относительных дат (сегодня, завтра) используй 'Current Date and Time' из запроса. Подтверждай создание или изменение данных. Не добавляй лишних пояснений. Любое наименование задачи или покупки должно начинаться с заглавной буквы.

ВНИМАНИЕ: Всегда строго соблюдай формат:
Thought: ...
Action: ... (одно из [{tool_names}])
Action Input: ...
Observation: ...
(может повторяться)
Final Answer: ...
Не используй другие теги, не добавляй <think> или что-либо ещё.

Инструменты:
{tools}

Вопрос: {input}
{agent_scratchpad}
'''

prompt = PromptTemplate.from_template(template)

# Create Agent
agent = create_react_agent(llm, tools, prompt)
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
