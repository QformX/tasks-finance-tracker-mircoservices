export interface Task {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  title: string;
  type: "tasks" | "purchases" | "mixed";
  color?: string;
  icon?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserRegister {
  username: string;
  email: string;
  password: string;
}
