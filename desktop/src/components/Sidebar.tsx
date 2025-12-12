import { useAuth } from "@/context/AuthContext";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import logo from "@/assets/high-logo.svg";
import { useLanguage } from "@/context/LanguageContext";

export function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const userPreferredCollapsed = useRef(false);

  useEffect(() => {
    let rafId: number;
    
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const width = window.innerWidth;
        const shouldBeLocked = width <= 850;

        setIsLocked((prevLocked) => {
          if (shouldBeLocked !== prevLocked) {
            if (shouldBeLocked) {
              setIsCollapsed(true);
            } else {
              setIsCollapsed(userPreferredCollapsed.current);
            }
            return shouldBeLocked;
          }
          return prevLocked;
        });
      });
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const toggleSidebar = () => {
    if (!isLocked) {
      const newState = !isCollapsed;
      setIsCollapsed(newState);
      userPreferredCollapsed.current = newState;
    }
  };

  return (
    <aside 
      className={cn(
        "flex flex-col bg-sidebar-dark shrink-0 h-full transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[88px]" : "w-72"
      )}
    >
      <div className={cn("flex h-full flex-col justify-between transition-all", isCollapsed ? "px-2 py-4" : "p-4")}>
        <div className={cn("flex flex-col gap-8", isCollapsed && "items-center")}>
          <div className={cn("flex items-center h-16 group/header relative transition-all duration-300 ease-in-out w-full", isCollapsed ? "justify-center" : "px-2 justify-between")}>
            <div className="flex items-center gap-4 overflow-hidden">
              <img src={logo} alt="Cognito" className="size-12 shrink-0" />
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 animate-in fade-in duration-300">
                  <h1 className="text-white text-2xl font-bold tracking-tight truncate py-1">Cognito</h1>
                </div>
              )}
            </div>
            {!isLocked && (
              <button 
                onClick={toggleSidebar}
                className={cn(
                  "flex items-center justify-center rounded-full hover:bg-white/10 transition-all cursor-pointer text-text-secondary hover:text-white shrink-0 opacity-0 group-hover/header:opacity-100 size-7",
                  isCollapsed ? "absolute right-0 bg-sidebar-dark shadow-lg border border-white/10" : ""
                )}
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  {isCollapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}
                </span>
              </button>
            )}
          </div>
          <nav className={cn("flex flex-col gap-1 w-full", isCollapsed && "items-center")}>
            <NavItem to="/" icon="dashboard" label={t("dashboard")} isCollapsed={isCollapsed} />
            <NavItem to="/chat" icon="chat" label="AI Chat" isCollapsed={isCollapsed} />
            <NavItem to="/tasks" icon="task_alt" label={t("tasks")} isCollapsed={isCollapsed} />
            <NavItem to="/purchases" icon="shopping_bag" label={t("purchases")} isCollapsed={isCollapsed} />
            <NavItem to="/categories" icon="folder" label={t("categories")} isCollapsed={isCollapsed} />
            <NavItem to="/analytics" icon="pie_chart" label={t("analytics")} isCollapsed={isCollapsed} />
          </nav>
        </div>
        <div className={cn("flex flex-col gap-2 pt-4 w-full", isCollapsed && "items-center")}>
          <NavLink 
            to="/settings"
            className={({ isActive }) => cn(
              "group flex items-center gap-3 rounded-full transition-all duration-300 h-11",
              isCollapsed ? "w-[52px] justify-center px-0" : "w-full px-4",
              isActive 
                ? "bg-black text-white shadow-lg shadow-black/20" 
                : "text-text-secondary hover:text-white hover:bg-white/5"
            )}
            title={t("settings")}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            {!isCollapsed && <span className="text-sm font-medium">{t("settings")}</span>}
          </NavLink>
          
          <div 
            className={cn(
              "mt-2 flex items-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-300 border border-white/5 group relative overflow-hidden h-12",
              isCollapsed ? "w-[52px] justify-center px-0" : "w-full px-3"
            )}
          >
            <div className="size-8 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {user?.username ? user.username.substring(0, 2).toUpperCase() : "ME"}
            </div>
            {!isCollapsed && (
              <>
                <div className="flex flex-col flex-1 min-w-0 animate-in fade-in duration-300">
                  <p className="text-white text-xs font-bold truncate">{user?.username || "Guest"}</p>
                  <p className="text-text-secondary text-[10px] truncate">{user?.email || "guest@example.com"}</p>
                </div>
                <button 
                  onClick={logout}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 text-text-secondary hover:text-white transition-colors"
                  title="Logout"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ to, icon, label, isCollapsed }: { to: string, icon: string, label: string, isCollapsed: boolean }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => cn(
        "flex items-center gap-3 rounded-full transition-all duration-300 relative group h-11",
        isCollapsed ? "w-[52px] justify-center px-0" : "w-full px-4",
        isActive 
          ? "bg-black text-white shadow-lg shadow-black/20" 
          : "text-text-secondary hover:text-white hover:bg-white/5"
      )}
      title={isCollapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          <span className={cn("material-symbols-outlined text-[20px]", isActive && "filled")}>{icon}</span>
          {!isCollapsed && <span className="text-sm font-medium animate-in fade-in duration-300">{label}</span>}
        </>
      )}
    </NavLink>
  );
}
