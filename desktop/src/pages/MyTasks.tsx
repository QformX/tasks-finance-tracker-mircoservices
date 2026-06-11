import { useEffect, useState } from "react";
import type { Task } from "@/types";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { TaskDetailsModal } from "@/components/TaskDetailsModal";
import { TasksHeader } from "@/components/tasks/TasksHeader";
import { TasksList } from "@/components/tasks/TasksList";
import { TasksCalendar } from "@/components/tasks/TasksCalendar";
import { useTasks } from "@/hooks/useTasks";
import { useCategories } from "@/hooks/useCategories";
import { groupItemsByDate } from "@/lib/utils";
import { updateTask as apiUpdateTask } from "@/lib/api";

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
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [initialEditMode, setInitialEditMode] = useState(false);

  // Calendar States lifted for header integration
  const [calendarViewType, setCalendarViewType] = useState<"week" | "day">("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const handlePrevCalendar = () => {
    const nextDate = new Date(currentDate);
    if (calendarViewType === "week") {
      nextDate.setDate(currentDate.getDate() - 7);
    } else {
      nextDate.setDate(currentDate.getDate() - 1);
    }
    setCurrentDate(nextDate);
  };

  const handleNextCalendar = () => {
    const nextDate = new Date(currentDate);
    if (calendarViewType === "week") {
      nextDate.setDate(currentDate.getDate() + 7);
    } else {
      nextDate.setDate(currentDate.getDate() + 1);
    }
    setCurrentDate(nextDate);
  };

  const handleTodayCalendar = () => {
    setCurrentDate(new Date());
  };

  useEffect(() => {
    fetchTasks("all");
    loadCategories();
  }, [fetchTasks, loadCategories]);

  function handleEdit(task: Task, editMode: boolean = false) {
    setEditingTask(task);
    setInitialEditMode(editMode);
    setIsEditModalOpen(true);
  }

  async function handleUpdateTaskDates(taskId: string, newStartDate: string | null, newDueDate: string | null) {
    try {
      const updated = await apiUpdateTask(taskId, { start_date: newStartDate, due_date: newDueDate });
      updateTask(updated);
    } catch (err) {
      console.error("Failed to update task dates via calendar:", err);
    }
  }

  // Filter tasks by search query
  const filteredTasks = tasks.filter(task => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const matchesTitle = task.title.toLowerCase().includes(query);
    const matchesDescription = task.description?.toLowerCase().includes(query) || false;
    
    const catName = getCategoryName(task.category_id);
    const matchesCategory = catName ? catName.toLowerCase().includes(query) : false;
    
    return matchesTitle || matchesDescription || matchesCategory;
  });

  // Group tasks
  const activeTasks = filteredTasks.filter(t => !t.is_completed);
  
  // Calculate counts for header
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA');
  
  const overdueTasks = filteredTasks.filter(t => {
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

  const todayTasks = filteredTasks.filter(t => {
    if (t.is_completed || !t.due_date) return false;
    const taskDate = new Date(t.due_date);
    const taskDateStr = taskDate.toLocaleDateString('en-CA');
    return taskDateStr === todayStr;
  });
  
  const completedTasks = filteredTasks.filter(t => t.is_completed);

  const displayedTasks = filter === "completed" ? completedTasks : 
                        filter === "overdue" ? overdueTasks :
                        filter === "today" ? todayTasks :
                        filteredTasks;

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
        search={searchQuery}
        onSearchChange={setSearchQuery}
        view={viewMode}
        onViewChange={setViewMode}
        calendarViewType={calendarViewType}
        setCalendarViewType={setCalendarViewType}
        currentDate={currentDate}
        onPrevCalendar={handlePrevCalendar}
        onNextCalendar={handleNextCalendar}
        onTodayCalendar={handleTodayCalendar}
      />

      {viewMode === "list" ? (
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
      ) : (
        <TasksCalendar 
          loading={tasksLoading}
          tasks={tasks}
          getCategoryColor={getCategoryColor}
          onToggle={toggleTask}
          onUpdateTaskDates={handleUpdateTaskDates}
          viewType={calendarViewType}
          setViewType={setCalendarViewType}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
        />
      )}

      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onTaskCreated={addTask} 
      />
      <TaskDetailsModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        task={editingTask}
        onTaskUpdated={updateTask}
        initialEditMode={initialEditMode}
      />
    </>
  );
}

