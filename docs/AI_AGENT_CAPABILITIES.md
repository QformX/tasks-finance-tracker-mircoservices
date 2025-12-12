# 🤖 AI Agent Capabilities

## 🟢 Current Capabilities

The AI agent is currently equipped with the following tools to assist users with task and finance management:

### 1. Task Management
- **Create Task**: Can create new tasks with a title, optional category, and due date.
  - *Tool:* `create_task_rpc`
  - *Example:* "Remind me to call mom tomorrow."
- **Delete Task**: Can remove existing tasks.
  - *Tool:* `delete_item_rpc`

### 2. Finance Management
- **Create Purchase**: Can record new purchases with a title, cost, quantity, and category.
  - *Tool:* `create_purchase_rpc`
  - *Example:* "I bought a coffee for $5."
- **Delete Purchase**: Can remove recorded purchases.
  - *Tool:* `delete_item_rpc`

### 3. Data Retrieval
- **View Recent Data**: Can fetch the latest 10 tasks and purchases to provide context or summaries.
  - *Tool:* `get_my_data`
  - *Example:* "What was the last thing I bought?"
- **List Categories**: Can retrieve the user's available categories to ensure items are categorized correctly.
  - *Tool:* `get_user_categories`

### 4. External Search
- **Web Search**: Can search the internet for product information or prices using the Tavily API.
  - *Tool:* `search_product`
  - *Example:* "Find the price of the new iPad."

---

## 🟡 Potential Future Capabilities

The following features could be implemented to expand the agent's utility:

### 1. Analytics & Insights
- **Spending Analysis**: Connect to the Analytics Service to answer questions like "How much did I spend on food last week?" or "Show me my spending trend."
- **Productivity Stats**: Provide insights on task completion rates and most productive days.

### 2. Advanced Management
- **Category Management**: Allow the agent to create, rename, or delete categories directly.
- **Smart Views**: Enable the agent to create custom filters or "Smart Views" for the user (e.g., "High priority work tasks").
- **Bulk Actions**: Support for creating multiple items at once or clearing completed tasks.

### 3. Planning & Budgeting
- **Budget Tracking**: Set and monitor spending limits for specific categories.
- **Schedule Planning**: Suggest optimal times for tasks based on existing schedule and due dates.

### 4. User Settings
- **Profile Management**: Update user preferences, language settings, or notification preferences.

### 5. Context Awareness
- **Conversation History**: Improve memory of past interactions to provide more personalized context (currently limited to the immediate session context).
