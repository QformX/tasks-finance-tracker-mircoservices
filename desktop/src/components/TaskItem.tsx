import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface TaskItemProps {
  task: Task;
  categoryName?: string;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (task: Task) => void;
  isOverdue?: boolean;
}

export function TaskItem({ task, categoryName, onToggle, onDelete, onEdit, isOverdue }: TaskItemProps) {
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
    <div className="group flex items-center gap-4 hover:bg-white/[0.03] rounded-2xl p-3 transition-all cursor-pointer">
      <div className="flex shrink-0 items-center justify-center pl-1">
        <input 
          type="checkbox" 
          checked={task.is_completed} 
          onChange={() => onToggle(task.id)}
          className="size-5 rounded-full border-2 border-text-secondary/50 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:outline-none transition-all cursor-pointer hover:border-text-secondary appearance-none" 
        />
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className={cn("text-white text-sm font-semibold leading-normal", task.is_completed && "line-through text-text-secondary")}>{task.title}</p>
        <div className="flex items-center gap-2">
          <span className="text-text-secondary text-[11px]">{categoryName || t("no_category") || "No Category"}</span>
          <span className="text-text-secondary text-[10px]">•</span>
          <span className={cn("text-[11px] font-medium", isOverdue ? "text-red-400" : "text-green-500")}>
            {task.due_date ? new Date(task.due_date).toLocaleDateString() : t("no_date") || "No Date"}
          </span>
        </div>
      </div>
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
            <div className="absolute right-0 top-8 z-50 w-36 bg-[#1e1e21] border border-white/10 rounded-xl shadow-xl overflow-hidden flex flex-col py-1">
               <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onEdit?.(task);
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
