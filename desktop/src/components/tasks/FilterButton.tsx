import { cn } from "@/lib/utils";

interface FilterButtonProps {
  active: boolean;
  label: string;
  count?: number;
  isError?: boolean;
  onClick: () => void;
}

export function FilterButton({ active, label, count, isError, onClick }: FilterButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 transition-colors",
        active ? "bg-text-950 text-background-50 hover:bg-text-950/90" : "text-text-secondary hover:text-text-950 px-2"
      )}
    >
      <span className="text-xs font-bold">{label}</span>
      {count !== undefined && (
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-bold",
          isError ? "bg-red-500/10 text-red-500" : "bg-text-950/5 text-text-secondary"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
