import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, UserLogin } from "@/types";
import { getMe, login as apiLogin, setTokens, clearTokens } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: UserLogin) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = localStorage.getItem("access_token");
      if (token) {
        const userData = await getMe();
        setUser(userData);
      }
    } catch (error) {
      console.error("Auth check failed", error);
      clearTokens();
    } finally {
      setLoading(false);
    }
  }

  async function login(data: UserLogin) {
    const response = await apiLogin(data);
    setTokens(response);
    const userData = await getMe();
    setUser(userData);
  }

  function logout() {
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
