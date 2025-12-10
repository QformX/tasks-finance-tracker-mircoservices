# 🚀 Frontend Preparation Guide

This document provides a comprehensive overview of the backend API to help you start building the frontend application. It includes the API structure, authentication flow, available endpoints, and critical changes required for offline-first support.

## 🌐 API Gateway Structure

All requests should be routed through the Nginx API Gateway.

| Service | Base Path | Description |
| :--- | :--- | :--- |
| **Users** | `/auth` | Authentication, User Profile, Sessions |
| **Core** | `/api` | Tasks, Purchases, Categories, Smart Views |
| **Analytics** | `/stats` | Dashboard, Statistics |

---

## 🔐 Authentication Flow

The application uses **JWT (JSON Web Tokens)** with a **Refresh Token Rotation** strategy.

1.  **Login**: Send `email` and `password` to `/auth/login`.
    *   **Response**: `access_token` (short-lived), `refresh_token` (long-lived).
2.  **Authenticated Requests**: Add header `Authorization: Bearer <access_token>` to all requests.
3.  **Token Expiration**: If API returns `401 Unauthorized` (Token expired):
    *   Call `/auth/refresh` with `refresh_token`.
    *   **Response**: New `access_token` AND new `refresh_token`.
    *   **Action**: Replace old tokens and retry the failed request.
4.  **Logout**: Call `/auth/logout` with `refresh_token`.

---

## 📡 API Endpoints Reference

### 1. Users Service (`/auth`)

| Method | Endpoint | Description | Payload / Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Register new user | `{username, email, password}` |
| `POST` | `/login` | Login | `{email, password}` |
| `POST` | `/refresh` | Refresh tokens | `?refresh_token=...` |
| `POST` | `/logout` | Logout | `?refresh_token=...` |
| `GET` | `/users/me` | Get current user info | - |
| `DELETE` | `/users/me` | Delete account (Soft) | - |
| `GET` | `/sessions` | List active sessions | - |
| `DELETE` | `/sessions/{id}` | Revoke session | - |
| `POST` | `/sessions/revoke-all-except-current` | Revoke other sessions | - |

### 2. Core Service (`/api`)

#### Tasks
| Method | Endpoint | Description | Payload / Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/tasks/` | List tasks | `?category_id=...`, `?filter=today/overdue/inbox`, `?is_completed=true/false` |
| `POST` | `/tasks/` | Create task | `{title, category_id, due_date}` |
| `POST` | `/tasks/{id}/toggle` | Toggle completion | - |
| `PATCH` | `/tasks/{id}` | Update task | `{title, is_completed, due_date, category_id}` |
| `DELETE` | `/tasks/{id}` | Delete task | - |

#### Categories
| Method | Endpoint | Description | Payload / Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/categories/` | List categories | `?type=tasks/purchases` |
| `POST` | `/categories/` | Create category | `{title, type}` |

#### Purchases
| Method | Endpoint | Description | Payload / Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/purchases/` | List purchases | `?category_id=...`, `?is_bought=true/false`, `?without_category=true` |
| `POST` | `/purchases/` | Create purchase | `{title, cost, quantity, category_id}` |
| `POST` | `/purchases/{id}/toggle` | Toggle bought status | - |
| `PATCH` | `/purchases/{id}` | Update purchase | `{title, cost, quantity, is_bought, category_id}` |
| `DELETE` | `/purchases/{id}` | Delete purchase | - |

#### Smart Views
| Method | Endpoint | Description | Payload / Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/smart-views/` | List smart views | - |
| `POST` | `/smart-views/` | Create smart view | `{title, rules: {...}}` |
| `GET` | `/smart-views/{id}/items` | Get items by view | - |

### 3. Analytics Service (`/stats`)

| Method | Endpoint | Description | Payload / Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard` | Get stats | `?period=week/month/year` |

---

## 📦 Data Schemas

### User & Auth
```typescript
interface User {
  id: string; // UUID
  username: string;
  email: string;
  created_at: string; // ISO 8601
}

interface UserCreate {
  username: string;
  email: string;
  password: string;
}

interface UserLogin {
  email: string;
  password: string;
}

interface Token {
  access_token: string;
  token_type: string; // "bearer"
  refresh_token: string;
}

interface UserSession {
  id: string; // UUID
  user_agent: string | null;
  ip_address: string | null;
  created_at: string; // ISO 8601
  expires_at: string; // ISO 8601
  is_current: boolean;
}
```

### Task
```typescript
enum FilterType {
  TODAY = "today",
  OVERDUE = "overdue",
  INBOX = "inbox"
}

interface Task {
  id: string; // UUID
  user_id: string; // UUID
  category_id: string | null; // UUID
  title: string;
  is_completed: boolean;
  due_date: string | null; // ISO 8601
  created_at: string; // ISO 8601
}

interface TaskCreate {
  title: string;
  category_id?: string | null;
  due_date?: string | null;
  description?: string | null; // Note: Currently not stored in DB
}

interface TaskUpdate {
  title?: string | null;
  is_completed?: boolean | null;
  due_date?: string | null;
  description?: string | null; // Note: Currently not stored in DB
}
```

### Category
```typescript
enum CategoryType {
  TASKS = "tasks",
  PURCHASES = "purchases",
  MIXED = "mixed"
}

interface Category {
  id: string; // UUID
  user_id: string; // UUID
  title: string;
  type: CategoryType;
}

interface CategoryCreate {
  title: string;
  type?: CategoryType; // default: mixed
  color?: string | null;
  icon?: string | null;
}
```

### Purchase
```typescript
interface Purchase {
  id: string; // UUID
  user_id: string; // UUID
  category_id: string | null; // UUID
  title: string;
  is_bought: boolean;
  cost: number | null;
  quantity: number;
}

interface PurchaseCreate {
  title: string;
  category_id?: string | null;
  cost?: number | null;
  quantity?: number; // default: 1
  unit?: string; // default: "шт" (Note: Currently not stored in DB)
}

interface PurchaseUpdate {
  title?: string | null;
  is_bought?: boolean | null;
  cost?: number | null;
  quantity?: number | null;
}
```

### Smart View
```typescript
interface SmartView {
  id: string; // UUID
  user_id: string; // UUID
  title: string;
  rules: Record<string, any>; // JSON rules
}

interface SmartViewCreate {
  title: string;
  rules: Record<string, any>;
}
```

### Analytics
```typescript
enum PeriodType {
  WEEK = "week",
  MONTH = "month",
  YEAR = "year"
}

interface DashboardStats {
  total_events: number;
  tasks_created: number;
  tasks_completed: number;
  purchases_created: number;
  purchases_completed: number;
  total_spending: number;
  period: PeriodType;
  daily_stats: Array<{
    date: string;
    count: number;
    [key: string]: any;
  }>;
}
```

