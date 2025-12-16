import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface TaskItemProps {
  task: Task;
  categoryName?: string;
  categoryColor?: string;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (task: Task, initialEditMode?: boolean) => void;
  isOverdue?: boolean;
}

export function TaskItem({ task, categoryName, categoryColor, onToggle, onDelete, onEdit, isOverdue }: TaskItemProps) {
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div 
      onClick={() => onEdit?.(task, false)}
      className={cn(
      "group flex items-center gap-4 bg-sidebar-dark border border-white/5 rounded-2xl p-4 transition-all duration-300 cursor-pointer",
      task.is_completed 
        ? "opacity-50 hover:opacity-80" 
        : "shadow-sm hover:border-primary/30 hover:shadow-md hover:scale-[1.01]",
      isMenuOpen && "relative z-20"
    )}>
      <div className="flex shrink-0 items-center justify-center pl-1">
        <input 
          type="checkbox" 
          checked={task.is_completed} 
          onChange={() => onToggle(task.id)}
          onClick={(e) => e.stopPropagation()}
          className="size-5 rounded-full border-2 border-text-secondary/50 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:outline-none transition-all cursor-pointer hover:border-text-secondary appearance-none" 
        />
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className={cn("text-white text-sm font-semibold leading-normal", task.is_completed && "line-through text-text-secondary")}>{task.title}</p>
        <div className="flex items-center gap-2">
          <span className={cn("text-[11px] font-medium", isOverdue ? "text-red-400" : "text-green-500")}>
            {task.due_date ? new Date(task.due_date).toLocaleDateString() : t("no_date") || "No Date"}
          </span>
        </div>
      </div>

      {categoryName && (
        <div 
          className="px-2 py-0.5 rounded-md text-[10px] font-medium text-white shrink-0"
          style={{ backgroundColor: categoryColor || '#a855f7' }}
        >
          {categoryName}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center relative" ref={menuRef}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="text-text-secondary hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-8 z-[100] w-36 bg-[#1e1e21] border border-white/10 rounded-xl shadow-xl overflow-hidden flex flex-col py-1">
               <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onEdit?.(task, true);
                 }}
                 className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors text-left"
               >
                 <span className="material-symbols-outlined text-[16px]">edit</span>
                 {t("edit") || "Edit"}
               </button>
               <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onDelete?.(task.id);
                 }}
                 className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
               >
                 <span className="material-symbols-outlined text-[16px]">delete</span>
                 {t("delete") || "Delete"}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
