import { useEffect, useState } from "react";
import type { Task } from "@/types";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { EditTaskModal } from "@/components/EditTaskModal";
import { TasksHeader } from "@/components/tasks/TasksHeader";
import { TasksList } from "@/components/tasks/TasksList";
import { useTasks } from "@/hooks/useTasks";
import { useCategories } from "@/hooks/useCategories";
import { groupItemsByDate } from "@/lib/utils";

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
    getCategoryName,
    getCategoryColor
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
  const activeTasks = tasks.filter(t => !t.is_completed);
  
  // Calculate counts for header
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA');
  
  const overdueTasks = tasks.filter(t => {
    if (t.is_completed || !t.due_date) return false;
    const taskDate = new Date(t.due_date);
    const taskDateStr = taskDate.toLocaleDateString('en-CA');
    return taskDateStr < todayStr;
  });

  const futureTasks = activeTasks.filter(t => {
    if (!t.due_date) return true;
    const taskDate = new Date(t.due_date);
    const taskDateStr = taskDate.toLocaleDateString('en-CA');
    return taskDateStr >= todayStr;
  });

  const groupedFutureTasks = groupItemsByDate(futureTasks, 'due_date');
  
  const groupedTasks = [...groupedFutureTasks];
  if (overdueTasks.length > 0) {
      groupedTasks.unshift({
          date: 'overdue',
          label: 'Overdue',
          items: overdueTasks
      });
  }

  const todayTasks = tasks.filter(t => {
    if (t.is_completed || !t.due_date) return false;
    const taskDate = new Date(t.due_date);
    const taskDateStr = taskDate.toLocaleDateString('en-CA');
    return taskDateStr === todayStr;
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
        groupedTasks={groupedTasks}
        displayedTasks={displayedTasks}
        getCategoryName={getCategoryName}
        getCategoryColor={getCategoryColor}
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

