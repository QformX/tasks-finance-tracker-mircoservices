import { useEffect, useState } from "react";
import type { Task, Category } from "@/types";
import { getTasks, toggleTaskCompletion, deleteTask, getCategories } from "@/lib/api";
import { cn } from "@/lib/utils";
import { TaskItem } from "@/components/TaskItem";
import { CreateTaskModal } from "@/components/CreateTaskModal";

export function MyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "today" | "overdue" | "completed">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([loadTasks(), loadCategories()]);
  }, []);

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories", error);
    }
  }

  async function loadTasks() {
    try {
      const data = await getTasks("all"); 
      setTasks(data);
    } catch (error) {
      console.error("Failed to load tasks", error);
    } finally {
      setLoading(false);
    }
  }

  function getCategoryName(categoryId: string | null) {
    if (!categoryId) return undefined;
    return categories.find(c => c.id === categoryId)?.title;
  }

  async function handleToggle(id: string) {
    try {
      await toggleTaskCompletion(id);
      setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t));
    } catch (error) {
      console.error("Failed to toggle task", error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  }

  function handleTaskCreated(newTask: Task) {
    setTasks([newTask, ...tasks]);
  }

  // Group tasks
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const overdueTasks = tasks.filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < now && !t.due_date.startsWith(todayStr));
  const todayTasks = tasks.filter(t => !t.is_completed && t.due_date?.startsWith(todayStr));
  const upcomingTasks = tasks.filter(t => !t.is_completed && (!t.due_date || (new Date(t.due_date) > now && !t.due_date.startsWith(todayStr))));
  const completedTasks = tasks.filter(t => t.is_completed);

  const displayedTasks = filter === "completed" ? completedTasks : 
                        filter === "overdue" ? overdueTasks :
                        filter === "today" ? todayTasks :
                        tasks;

  return (
    <>
      <div className="shrink-0 z-20 bg-background-dark sticky top-0">
        <div className="w-full max-w-7xl mx-auto flex flex-col p-8 pb-4">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-white text-2xl font-bold leading-tight tracking-tight">Tasks</h2>
            </div>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 cursor-pointer justify-center overflow-hidden rounded-full h-10 px-5 bg-primary hover:bg-primary-dark transition-colors text-white text-xs font-bold shadow-lg shadow-purple-900/20 group"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Task</span>
            </button>
          </div>
          <div className="flex flex-col lg:flex-row lg:flex-wrap gap-6 items-center justify-between">
            <div className="w-full lg:max-w-md min-w-[300px]">
              <div className="flex w-full items-center rounded-2xl h-11 bg-[#1e1e21] group focus-within:ring-1 focus-within:ring-white/10 transition-all border border-transparent">
                <div className="text-text-secondary flex items-center justify-center pl-4">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </div>
                <input className="flex w-full min-w-0 flex-1 resize-none bg-transparent border-none text-white focus:ring-0 h-full placeholder:text-text-secondary/70 px-3 text-sm font-medium outline-none" placeholder="Search tasks by name, tag, or assignee..." />
              </div>
            </div>
            <div className="flex gap-4 items-center overflow-x-auto w-full lg:w-auto scrollbar-hide">
              <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label="All Tasks" />
              <FilterButton active={filter === "today"} onClick={() => setFilter("today")} label="Today" count={todayTasks.length} />
              <FilterButton active={filter === "overdue"} onClick={() => setFilter("overdue")} label="Overdue" count={overdueTasks.length} isError />
              <FilterButton active={filter === "completed"} onClick={() => setFilter("completed")} label="Completed" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full px-8 pb-20">
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
          
          {loading ? (
            <div className="text-text-secondary text-center py-10">Loading tasks...</div>
          ) : (
            <>
              {filter === "all" ? (
                <>
                  {/* Overdue Section */}
                  {overdueTasks.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <h3 className="text-red-400 text-[11px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        Overdue
                      </h3>
                      {overdueTasks.map(task => (
                        <TaskItem key={task.id} task={task} categoryName={getCategoryName(task.category_id)} onToggle={() => handleToggle(task.id)} onDelete={() => handleDelete(task.id)} isOverdue />
                      ))}
                    </div>
                  )}

                  {/* Today Section */}
                  {todayTasks.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2">
                      <h3 className="text-text-secondary text-[11px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        Today
                      </h3>
                      {todayTasks.map(task => (
                        <TaskItem key={task.id} task={task} categoryName={getCategoryName(task.category_id)} onToggle={() => handleToggle(task.id)} onDelete={() => handleDelete(task.id)} />
                      ))}
                    </div>
                  )}

                  {/* Upcoming Section */}
                  {upcomingTasks.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2">
                      <h3 className="text-text-secondary text-[11px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">upcoming</span>
                        Upcoming
                      </h3>
                      {upcomingTasks.map(task => (
                        <TaskItem key={task.id} task={task} categoryName={getCategoryName(task.category_id)} onToggle={() => handleToggle(task.id)} onDelete={() => handleDelete(task.id)} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-1">
                   {displayedTasks.map(task => (
                      <TaskItem key={task.id} task={task} categoryName={getCategoryName(task.category_id)} onToggle={() => handleToggle(task.id)} onDelete={() => handleDelete(task.id)} isOverdue={filter === "overdue"} />
                    ))}
                    {displayedTasks.length === 0 && (
                      <div className="text-text-secondary text-center py-10">No tasks found.</div>
                    )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onTaskCreated={handleTaskCreated} 
      />
    </>
  );
}

function FilterButton({ active, label, count, isError, onClick }: { active: boolean, label: string, count?: number, isError?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 transition-colors",
        active ? "bg-white text-black hover:bg-gray-200" : "text-text-secondary hover:text-white px-2"
      )}
    >
      <span className="text-xs font-bold">{label}</span>
      {count !== undefined && (
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-bold",
          isError ? "bg-red-500/10 text-red-500" : "bg-[#27272a] text-text-secondary"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
