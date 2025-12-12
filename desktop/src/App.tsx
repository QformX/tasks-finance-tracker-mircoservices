import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ApiTester } from "@/pages/ApiTester";
import { MyTasks } from "@/pages/MyTasks";
import { Purchases } from "@/pages/Purchases";
import { Categories } from "@/pages/Categories";
import { Analytics } from "@/pages/Analytics";
import { Settings } from "@/pages/Settings";
import { Profile } from "@/pages/Profile";
import { AuthPage } from "@/pages/Auth";
import { AiChat } from "@/pages/AiChat";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { Layout } from "@/components/Layout";
import { Routes, Route, Navigate } from "react-router-dom";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-dark text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ApiTester />} />
        <Route path="/chat" element={<AiChat />} />
        <Route path="/tasks" element={<MyTasks />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;

