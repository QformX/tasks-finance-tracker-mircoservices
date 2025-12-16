import { cn } from "@/lib/utils";

interface DateHeaderProps {
  children: React.ReactNode;
  className?: string;
  isOverdue?: boolean;
}

export function DateHeader({ children, className, isOverdue }: DateHeaderProps) {
  return (
    <h4 className={cn(
      "text-[10px] font-bold uppercase tracking-widest mb-1 px-2 sticky top-0 bg-background-200 dark:bg-background-50 py-1 z-10 opacity-70",
      isOverdue ? "text-red-400" : "text-text-secondary",
      className
    )}>
      {children}
    </h4>
  );
}
