import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItemProps {
  to: string;
  icon: string;
  label: string;
  isCollapsed: boolean;
}

export function NavItem({ to, icon, label, isCollapsed }: NavItemProps) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => cn(
        "flex items-center gap-3 rounded-full transition-all duration-300 relative group h-11",
        isCollapsed ? "w-[52px] justify-center px-0" : "w-full px-4",
        isActive 
          ? "bg-text-950 text-background-50 shadow-lg shadow-text-950/20" 
          : "text-text-secondary hover:text-text-950 hover:bg-text-950/5"
      )}
      title={isCollapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          <span className={cn("material-symbols-outlined text-[20px] shrink-0", isActive && "filled")}>{icon}</span>
          {!isCollapsed && (
            <span className="text-base font-medium animate-in fade-in slide-in-from-left-2 duration-300 whitespace-nowrap overflow-hidden text-ellipsis">
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
