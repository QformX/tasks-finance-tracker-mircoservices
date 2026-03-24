import type { Task, User, UserLogin, UserRegister, AuthResponse, Category, Purchase, DashboardStats, AnalyticsEvent, ActivityHeatmap, UserSession } from "@/types";

const API_BASE_URL = "http://127.0.0.1:80/api";
const AUTH_BASE_URL = "http://127.0.0.1:80/auth";
const ANALYTICS_BASE_URL = "http://127.0.0.1:80/stats";

// --- Auth Helpers ---

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  return token ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export function setTokens(auth: AuthResponse) {
  // console.log("Setting tokens:", auth);
  localStorage.setItem("access_token", auth.access_token);
  localStorage.setItem("refresh_token", auth.refresh_token);
}

export function clearTokens() {
  // console.log("Clearing tokens");
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return null;

    try {
      // console.log("Attempting to refresh token...");
      const response = await fetch(`${AUTH_BASE_URL}/refresh?refresh_token=${refreshToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        console.error("Refresh failed with status:", response.status);
        clearTokens();
        return null;
      }

      const data: AuthResponse = await response.json();
      // console.log("Refresh successful");
      setTokens(data);
      return data.access_token;
    } catch (error) {
      console.error("Refresh error:", error);
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...getAuthHeaders(),
    },
  });

  if (response.status === 401) {
    // console.log("Got 401, trying to refresh...");
    const newToken = await refreshAccessToken();
    if (newToken) {
      // console.log("Retrying request with new token...");
      // Retry with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          "Authorization": `Bearer ${newToken}`,
          "Content-Type": "application/json",
        },
      });
    } else {
      console.error("Refresh failed, session expired");
      throw new Error("Session expired");
    }
  }

  return response;
}

// --- Auth API ---

export async function login(data: UserLogin): Promise<AuthResponse> {
  // console.log("Logging in with:", data.email);
  const response = await fetch(`${AUTH_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Login failed:", response.status, errorText);
    throw new Error("Login failed");
  }
  return response.json();
}

export async function register(data: UserRegister): Promise<User> {
  const response = await fetch(`${AUTH_BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Registration failed");
  return response.json();
}

export async function getMe(): Promise<User> {
  const response = await fetchWithAuth(`${AUTH_BASE_URL}/users/me`);
  if (!response.ok) throw new Error("Failed to fetch user");
  return response.json();
}

export async function getSessions(): Promise<UserSession[]> {
  const response = await fetchWithAuth(`${AUTH_BASE_URL}/sessions`);
  if (!response.ok) throw new Error("Failed to fetch sessions");
  return response.json();
}

export async function revokeSession(sessionId: string): Promise<void> {
  const response = await fetchWithAuth(`${AUTH_BASE_URL}/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to revoke session");
}

export async function revokeAllSessionsExceptCurrent(): Promise<void> {
  const response = await fetchWithAuth(`${AUTH_BASE_URL}/sessions/revoke-all-except-current`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to revoke all sessions");
}

// --- Tasks API ---

export async function getTasks(filter: string = "all", categoryId?: string): Promise<Task[]> {
  let url = `${API_BASE_URL}/tasks/?`;
  
  if (filter !== "all") {
    url += `filter=${filter}&`;
  }
  
  if (categoryId) {
    url += `category_id=${categoryId}&`;
  }

  const offset = new Date().getTimezoneOffset();
  url += `timezone_offset=${offset}&`;
  
  const response = await fetchWithAuth(url);
  if (!response.ok) {
    throw new Error("Failed to fetch tasks");
  }
  return response.json();
}

export async function toggleTaskCompletion(taskId: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/tasks/${taskId}/toggle`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to toggle task");
  }
}

export async function createTask(title: string, categoryId?: string, dueDate?: string, description?: string, priority: "low" | "medium" | "high" = "medium"): Promise<Task> {
  const response = await fetchWithAuth(`${API_BASE_URL}/tasks/`, {
    method: "POST",
    body: JSON.stringify({ title, category_id: categoryId, due_date: dueDate, description, priority }),
  });
  if (!response.ok) {
    throw new Error("Failed to create task");
  }
  return response.json();
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
  const response = await fetchWithAuth(`${API_BASE_URL}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error("Failed to update task");
  return response.json();
}

export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/tasks/${taskId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete task");
}

// --- Categories API ---

export async function getCategories(): Promise<Category[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/categories/`);
  if (!response.ok) throw new Error("Failed to fetch categories");
  return response.json();
}

export async function createCategory(title: string, type: "tasks" | "purchases" | "mixed", color?: string, icon?: string): Promise<Category> {
  const response = await fetchWithAuth(`${API_BASE_URL}/categories/`, {
    method: "POST",
    body: JSON.stringify({ title, type, color, icon }),
  });
  if (!response.ok) throw new Error("Failed to create category");
  return response.json();
}

export async function updateCategory(categoryId: string, updates: Partial<Category>): Promise<Category> {
  const response = await fetchWithAuth(`${API_BASE_URL}/categories/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error("Failed to update category");
  return response.json();
}

export async function deleteCategory(categoryId: string, strategy: "delete_all" | "move_to_category", targetCategoryId?: string): Promise<void> {
  let url = `${API_BASE_URL}/categories/${categoryId}?strategy=${strategy}`;
  if (targetCategoryId) {
    url += `&target_category_id=${targetCategoryId}`;
  }
  
  const response = await fetchWithAuth(url, {
    method: "DELETE",
  });
  
  if (!response.ok) {
    throw new Error("Failed to delete category");
  }
}

// --- Purchases API ---

export async function getPurchases(isBought: boolean = false, categoryId?: string): Promise<Purchase[]> {
  let url = `${API_BASE_URL}/purchases/?is_bought=${isBought}`;
  if (categoryId) {
    url += `&category_id=${categoryId}`;
  }
  const response = await fetchWithAuth(url);
  if (!response.ok) {
    throw new Error("Failed to fetch purchases");
  }
  return response.json();
}

export async function togglePurchaseCompletion(purchaseId: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/purchases/${purchaseId}/toggle`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to toggle purchase");
  }
}

export async function createPurchase(title: string, categoryId?: string, cost?: number, quantity: number = 1): Promise<Purchase> {
  const response = await fetchWithAuth(`${API_BASE_URL}/purchases/`, {
    method: "POST",
    body: JSON.stringify({ title, category_id: categoryId, cost, quantity }),
  });
  if (!response.ok) {
    throw new Error("Failed to create purchase");
  }
  return response.json();
}

export async function updatePurchase(purchaseId: string, updates: Partial<Purchase>): Promise<Purchase> {
  const response = await fetchWithAuth(`${API_BASE_URL}/purchases/${purchaseId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error("Failed to update purchase");
  return response.json();
}

export async function deletePurchase(purchaseId: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/purchases/${purchaseId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete purchase");
}

// --- Analytics API ---

export async function getDashboardStats(period: "today" | "week" | "month" | "year" = "week"): Promise<DashboardStats> {
  const offset = new Date().getTimezoneOffset();
  const response = await fetchWithAuth(`${ANALYTICS_BASE_URL}/dashboard?period=${period}&timezone_offset=${offset}`);
  if (!response.ok) throw new Error("Failed to fetch dashboard stats");
  return response.json();
}

export async function getRecentEvents(limit: number = 10): Promise<{ events: AnalyticsEvent[] }> {
  const response = await fetchWithAuth(`${ANALYTICS_BASE_URL}/events/recent?limit=${limit}`);
  if (!response.ok) throw new Error("Failed to fetch recent events");
  return response.json();
}

export async function getActivityHeatmap(days: number = 365): Promise<ActivityHeatmap> {
  const offset = new Date().getTimezoneOffset();
  const response = await fetchWithAuth(`${ANALYTICS_BASE_URL}/activity-heatmap?days=${days}&timezone_offset=${offset}`);
  if (!response.ok) throw new Error("Failed to fetch activity heatmap");
  return response.json();
}

export async function getBoughtPurchaseIds(period: "today" | "week" | "month" | "year" = "week"): Promise<string[]> {
  const offset = new Date().getTimezoneOffset();
  const response = await fetchWithAuth(`${ANALYTICS_BASE_URL}/purchases/bought?period=${period}&timezone_offset=${offset}`);
  if (!response.ok) throw new Error("Failed to fetch bought purchase IDs");
  return response.json();
}

