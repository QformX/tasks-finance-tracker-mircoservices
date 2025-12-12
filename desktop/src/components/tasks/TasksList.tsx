import { TaskItem } from "@/components/TaskItem";
import { useLanguage } from "@/context/LanguageContext";
import type { Task } from "@/types";

interface TasksListProps {
  loading: boolean;
  filter: "all" | "today" | "overdue" | "completed";
  groupedTasks: {
    overdue: Task[];
    today: Task[];
    upcoming: Task[];
    displayed: Task[];
  };
  getCategoryName: (categoryId: string | null) => string | undefined;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

export function TasksList({ 
  loading, 
  filter, 
  groupedTasks, 
  getCategoryName, 
  onToggle, 
  onDelete, 
  onEdit 
}: TasksListProps) {
  const { t } = useLanguage();
  const { overdue, today, upcoming, displayed } = groupedTasks;

  return (
    <div className="flex-1 overflow-y-auto w-full px-8 pb-20">
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
          
          {loading ? (
            <div className="text-text-secondary text-center py-10">{t("loading_tasks")}</div>
          ) : (
            <>
              {filter === "all" ? (
                <>
                  {/* Overdue Section */}
                  {overdue.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <h3 className="text-red-400 text-[11px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        {t("overdue")}
                      </h3>
                      {overdue.map(task => (
                        <TaskItem key={task.id} task={task} categoryName={getCategoryName(task.category_id)} onToggle={() => onToggle(task.id)} onDelete={() => onDelete(task.id)} onEdit={() => onEdit(task)} isOverdue />
                      ))}
                    </div>
                  )}

                  {/* Today Section */}
                  {today.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2">
                      <h3 className="text-text-secondary text-[11px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        {t("today")}
                      </h3>
                      {today.map(task => (
                        <TaskItem key={task.id} task={task} categoryName={getCategoryName(task.category_id)} onToggle={() => onToggle(task.id)} onDelete={() => onDelete(task.id)} onEdit={() => onEdit(task)} />
                      ))}
                    </div>
                  )}

                  {/* Upcoming Section */}
                  {upcoming.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2">
                      <h3 className="text-text-secondary text-[11px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">upcoming</span>
                        {t("upcoming")}
                      </h3>
                      {upcoming.map(task => (
                        <TaskItem key={task.id} task={task} categoryName={getCategoryName(task.category_id)} onToggle={() => onToggle(task.id)} onDelete={() => onDelete(task.id)} onEdit={() => onEdit(task)} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-1">
                   {displayed.map(task => (
                      <TaskItem key={task.id} task={task} categoryName={getCategoryName(task.category_id)} onToggle={() => onToggle(task.id)} onDelete={() => onDelete(task.id)} onEdit={() => onEdit(task)} isOverdue={filter === "overdue"} />
                    ))}
                    {displayed.length === 0 && (
                      <div className="text-text-secondary text-center py-10">{t("no_tasks_found")}</div>
                    )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
  );
}
