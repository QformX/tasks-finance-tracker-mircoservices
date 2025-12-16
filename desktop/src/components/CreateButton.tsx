import { cn } from "@/lib/utils";

interface CreateButtonProps {
  onClick: () => void;
  label: string;
  className?: string;
  disabled?: boolean;
  icon?: string;
  responsive?: boolean;
  collapsed?: boolean;
}

export function CreateButton({ onClick, label, className, disabled, icon = "add", responsive, collapsed }: CreateButtonProps) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex items-center gap-2 justify-center overflow-hidden rounded-full h-10 transition-all duration-300 text-xs font-bold shadow-lg group",
        collapsed ? "w-10 px-0" : (responsive ? "w-10 px-0 xl:w-auto xl:px-5" : "px-5"),
        disabled 
          ? "bg-text-950/5 text-text-secondary/50 shadow-none cursor-not-allowed" 
          : "bg-white hover:bg-gray-50 text-text-950 shadow-lg shadow-primary-500/20 dark:bg-primary-500 dark:hover:bg-primary-600 dark:text-white cursor-pointer",
        className
      )}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      <span className={cn((collapsed || responsive) && "hidden", responsive && !collapsed && "xl:inline")}>{label}</span>
    </button>
  );
}
