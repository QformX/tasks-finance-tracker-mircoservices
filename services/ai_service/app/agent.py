import os
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

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

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
    # Inject user_id into the prompt context
    input_with_context = f"User ID: {user_id}\nRequest: {message}\n\nIMPORTANT: When calling tools that require user_id, ALWAYS use '{user_id}'."
    
    async for chunk in agent_executor.astream({"input": input_with_context}):
        if "actions" in chunk:
            for action in chunk["actions"]:
                yield f"Action: {action.tool} -> {action.tool_input}\n"
        elif "steps" in chunk:
            for step in chunk["steps"]:
                yield f"Observation: {step.observation}\n"
        elif "output" in chunk:
            yield chunk["output"]
