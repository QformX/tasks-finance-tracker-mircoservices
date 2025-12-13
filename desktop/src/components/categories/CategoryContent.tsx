import { TaskItem } from "@/components/TaskItem";
import { PurchaseItem } from "@/components/PurchaseItem";
import { DateHeader } from "@/components/DateHeader";
import { useLanguage } from "@/context/LanguageContext";
import type { Task, Purchase } from "@/types";
import { groupItemsByDate, cn } from "@/lib/utils";

interface CategoryContentProps {
  loading: boolean;
  tasks: Task[];
  purchases: Purchase[];
  categoryName: string;
  categoryColor?: string;
  onTaskToggle: (id: string) => void;
  onTaskDelete: (id: string) => void;
  onTaskEdit: (task: Task) => void;
  onPurchaseToggle: (id: string) => void;
  onPurchaseDelete: (id: string) => void;
  onPurchaseEdit: (purchase: Purchase) => void;
}

export function CategoryContent({
  loading,
  tasks,
  purchases,
  categoryName,
  categoryColor,
  onTaskToggle,
  onTaskDelete,
  onTaskEdit,
  onPurchaseToggle,
  onPurchaseDelete,
  onPurchaseEdit,
}: CategoryContentProps) {
  const { t } = useLanguage();

  const groupedTasks = groupItemsByDate(tasks, 'due_date');

  return (
      <div className="flex-1 overflow-y-auto w-full px-8 pb-20">
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
          {loading ? (
            <div className="text-text-secondary text-center py-10">{t("loading_items")}</div>
          ) : (
            <>
              {/* Tasks Section */}
              {tasks.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-text-secondary text-[11px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">task_alt</span>
                    {t("tasks")}
                  </h3>
                  {groupedTasks.map(group => {
                    const isPast = group.label !== "No Date" && new Date(group.date) < new Date(new Date().toLocaleDateString('en-CA'));
                    return (
                    <div key={group.date} className="flex flex-col gap-1">
                      <DateHeader isOverdue={isPast}>
                        {group.label}
                      </DateHeader>
                      {group.items.map(task => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          categoryName={categoryName}
                          categoryColor={categoryColor}
                          onToggle={() => onTaskToggle(task.id)} 
                          onDelete={() => onTaskDelete(task.id)} 
                          onEdit={() => onTaskEdit(task)}
                          isOverdue={isPast}
                        />
                      ))}
                    </div>
                  )})}
                </div>
              )}

              {/* Purchases Section */}
              {purchases.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-text-secondary text-[11px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">shopping_bag</span>
                    {t("purchases")}
                  </h3>
                  {purchases.map(purchase => (
                    <PurchaseItem 
                      key={purchase.id} 
                      purchase={purchase} 
                      categoryName={categoryName}
                      categoryColor={categoryColor}
                      onToggle={() => onPurchaseToggle(purchase.id)} 
                      onDelete={() => onPurchaseDelete(purchase.id)} 
                      onEdit={() => onPurchaseEdit(purchase)}
                    />
                  ))}
                </div>
              )}

              {tasks.length === 0 && purchases.length === 0 && (
                <div className="text-text-secondary text-center py-10">
                  {t("no_items_in_category")}
                </div>
              )}
            </>
          )}
        </div>
      </div>
  );
}
