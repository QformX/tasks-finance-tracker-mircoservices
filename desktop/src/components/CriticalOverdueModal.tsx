import { Modal } from "@/components/Modal";
import { TaskItem } from "@/components/TaskItem";
import type { Task, Category } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface CriticalOverdueModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  categories: Category[];
  onToggleTask: (id: string) => void;
}

export function CriticalOverdueModal({ isOpen, onClose, tasks, categories, onToggleTask }: CriticalOverdueModalProps) {
  const { t } = useLanguage();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 text-red-500">
          <span className="material-symbols-outlined text-3xl">warning</span>
          <h2 className="text-xl font-bold text-text-950">{t("critical_overdue_tasks") || "Critical Overdue Tasks"}</h2>
        </div>
        
        <p className="text-text-secondary">
          {t("critical_overdue_desc") || "These high-priority tasks are overdue. Please address them immediately."}
        </p>

        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2">
          {tasks.map(task => {
            const category = categories.find(c => c.id === task.category_id);
            return (
              <TaskItem
                key={task.id}
                task={task}
                categoryName={category?.title}
                categoryColor={category?.color}
                onToggle={onToggleTask}
                isOverdue={true}
              />
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-text-950/5 hover:bg-text-950/10 text-text-950 font-medium transition-colors"
          >
            {t("close") || "Close"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
