import { useEffect, useState } from "react";
import type { Task } from "@/types";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { EditTaskModal } from "@/components/EditTaskModal";
import { TasksHeader } from "@/components/tasks/TasksHeader";
import { TasksList } from "@/components/tasks/TasksList";
import { useTasks } from "@/hooks/useTasks";
import { useCategories } from "@/hooks/useCategories";

export function MyTasks() {
  const { 
    tasks, 
    loading: tasksLoading, 
    fetchTasks, 
    toggleTask, 
    deleteTask, 
    addTask, 
    updateTask 
  } = useTasks();
  
  const { 
    loadCategories, 
    getCategoryName 
  } = useCategories();

  const [filter, setFilter] = useState<"all" | "today" | "overdue" | "completed">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchTasks("all");
    loadCategories();
  }, [fetchTasks, loadCategories]);

  function handleEdit(task: Task) {
    setEditingTask(task);
    setIsEditModalOpen(true);
  }

  // Group tasks
  // Use local date for comparison to handle timezone correctly
  const now = new Date();
  // Get local YYYY-MM-DD
  const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

  const overdueTasks = tasks.filter(t => {
    if (t.is_completed || !t.due_date) return false;
    // Convert UTC due_date to local date string for comparison
    const taskDate = new Date(t.due_date);
    const taskDateStr = taskDate.toLocaleDateString('en-CA');
    return taskDateStr < todayStr;
  });

  const todayTasks = tasks.filter(t => {
    if (t.is_completed || !t.due_date) return false;
    const taskDate = new Date(t.due_date);
    const taskDateStr = taskDate.toLocaleDateString('en-CA');
    return taskDateStr === todayStr;
  });

  const upcomingTasks = tasks.filter(t => {
    if (t.is_completed) return false;
    if (!t.due_date) return true; // No due date = upcoming/backlog
    const taskDate = new Date(t.due_date);
    const taskDateStr = taskDate.toLocaleDateString('en-CA');
    return taskDateStr > todayStr;
  });
  
  const completedTasks = tasks.filter(t => t.is_completed);

  const displayedTasks = filter === "completed" ? completedTasks : 
                        filter === "overdue" ? overdueTasks :
                        filter === "today" ? todayTasks :
                        tasks;

  return (
    <>
      <TasksHeader 
        filter={filter}
        setFilter={setFilter}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        counts={{
          today: todayTasks.length,
          overdue: overdueTasks.length
        }}
      />

      <TasksList 
        loading={tasksLoading}
        filter={filter}
        groupedTasks={{
          overdue: overdueTasks,
          today: todayTasks,
          upcoming: upcomingTasks,
          displayed: displayedTasks
        }}
        getCategoryName={getCategoryName}
        onToggle={toggleTask}
        onDelete={deleteTask}
        onEdit={handleEdit}
      />

      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onTaskCreated={addTask} 
      />
      <EditTaskModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        task={editingTask}
        onTaskUpdated={updateTask} 
      />
    </>
  );
}

