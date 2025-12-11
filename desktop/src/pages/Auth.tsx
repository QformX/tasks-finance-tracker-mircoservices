import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { register } from "@/lib/api";
import { cn } from "@/lib/utils";

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { login } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        await register({ username, email, password });
        // Auto login after register
        await login({ email, password });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-dark p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-sidebar-dark p-8 border border-white/5 shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            {isLogin ? "Welcome back" : "Create an account"}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {isLogin ? "Sign in to access your workspace" : "Get started with TaskMaster"}
          </p>
        </div>

        <div className="flex rounded-lg bg-surface-dark p-1">
          <button
            onClick={() => setIsLogin(true)}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-all",
              isLogin ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-white"
            )}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-all",
              !isLogin ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-white"
            )}
          >
            Register
          </button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="username" className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-lg border border-white/10 bg-surface-dark px-4 py-3 text-white placeholder-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="johndoe"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-white/10 bg-surface-dark px-4 py-3 text-white placeholder-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-white/10 bg-surface-dark px-4 py-3 text-white placeholder-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-full bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-900/20 hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Please wait..." : (isLogin ? "Sign in" : "Create account")}
          </button>
        </form>
      </div>
    </div>
  );
}
