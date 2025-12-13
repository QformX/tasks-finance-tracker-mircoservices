import { TaskItem } from "@/components/TaskItem";
import { DateHeader } from "@/components/DateHeader";
import { useLanguage } from "@/context/LanguageContext";
import type { Task } from "@/types";

interface TasksListProps {
  loading: boolean;
  filter: "all" | "today" | "overdue" | "completed";
  groupedTasks: { date: string; label: string; items: Task[] }[];
  displayedTasks: Task[];
  getCategoryName: (categoryId: string | null) => string | undefined;
  getCategoryColor: (categoryId: string | null) => string | undefined;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

export function TasksList({ 
  loading, 
  filter, 
  groupedTasks,
  displayedTasks,
  getCategoryName, 
  getCategoryColor,
  onToggle, 
  onDelete, 
  onEdit 
}: TasksListProps) {
  const { t } = useLanguage();

  return (
    <div className="flex-1 overflow-y-auto w-full px-8 pb-20">
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
          
          {loading ? (
            <div className="text-text-secondary text-center py-10">{t("loading_tasks")}</div>
          ) : (
            <>
              {filter === "all" ? (
                <>
                  {groupedTasks.map(group => {
                    const isOverdueGroup = group.date === 'overdue';
                    return (
                    <div key={group.date} className="flex flex-col gap-1">
                      <DateHeader isOverdue={isOverdueGroup}>
                        {isOverdueGroup ? t("overdue") : group.label}
                      </DateHeader>
                      {group.items.map(task => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          categoryName={getCategoryName(task.category_id)} 
                          categoryColor={getCategoryColor(task.category_id)}
                          onToggle={() => onToggle(task.id)} 
                          onDelete={() => onDelete(task.id)} 
                          onEdit={() => onEdit(task)} 
                          isOverdue={isOverdueGroup}
                        />
                      ))}
                    </div>
                  )})}
                  
                  {groupedTasks.length === 0 && (
                    <div className="text-text-secondary text-center py-10">{t("no_tasks_found")}</div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  {displayedTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      categoryName={getCategoryName(task.category_id)} 
                      categoryColor={getCategoryColor(task.category_id)}
                      onToggle={() => onToggle(task.id)} 
                      onDelete={() => onDelete(task.id)} 
                      onEdit={() => onEdit(task)} 
                      isOverdue={filter === "overdue"} 
                    />
                  ))}
                  {displayedTasks.length === 0 && (
                    <div className="text-text-secondary text-center py-10">
                      {filter === "completed" ? t("no_completed_tasks") : t("no_tasks_found")}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
    </div>
  );
}
