import os
from datetime import datetime
from typing import AsyncGenerator
from langchain_groq import ChatGroq
from langchain.agents import AgentExecutor, create_react_agent
from langchain_core.prompts import PromptTemplate
from app.tools import tools

# Initialize LLM
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY, temperature=0)

# Define Prompt
template = '''Answer the following questions as best you can. You have access to the following tools:

{tools}

IMPORTANT GUIDELINES:
1. You MUST answer in the SAME LANGUAGE as the user's request. If the user asks in Russian, answer in Russian. If in English, answer in English.
2. Your "Final Answer" must be natural, human-readable, and helpful. Do not just dump JSON or raw data. Explain what you did or what the data means.
3. If you created a task or purchase, confirm it clearly.
4. You have access to the 'Current Date and Time'. Use it to calculate specific dates (YYYY-MM-DD) for arguments when the user uses relative terms like "today", "tomorrow", "in 3 days", "next Friday".
5. If the user asks to create MULTIPLE items (e.g., "buy milk and bread"), you MUST call the creation tool MULTIPLE times, once for each item. Do not try to pass a list to the tool.

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question (in the user's language)

Begin!

Question: {input}
Thought:{agent_scratchpad}'''

prompt = PromptTemplate.from_template(template)

# Create Agent
agent = create_react_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True)

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
