import { useState, useCallback } from "react";
import type { Task } from "@/types";
import { getTasks, toggleTaskCompletion, deleteTask as apiDeleteTask } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

export function useTasks() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async (filter: string = "all", categoryId?: string) => {
    setLoading(true);
    try {
      const data = await getTasks(filter, categoryId);
      setTasks(data);
    } catch (error) {
      console.error("Failed to load tasks", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleTask = useCallback(async (id: string) => {
    try {
      await toggleTaskCompletion(id);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t));
    } catch (error) {
      console.error("Failed to toggle task", error);
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    if (!confirm(t("delete_task_confirm"))) return;
    try {
      await apiDeleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  }, [t]);

  const addTask = useCallback((task: Task) => {
    setTasks(prev => [task, ...prev]);
  }, []);

  const updateTask = useCallback((updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  }, []);

  // Helper for Categories page where we might need to remove a task if it moved category
  const updateTaskInList = useCallback((updatedTask: Task, currentCategoryId?: string) => {
    setTasks(prev => {
      if (currentCategoryId && updatedTask.category_id !== currentCategoryId) {
        return prev.filter(t => t.id !== updatedTask.id);
      }
      return prev.map(t => t.id === updatedTask.id ? updatedTask : t);
    });
  }, []);

  const setTasksList = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
  }, []);

  return {
    tasks,
    loading,
    fetchTasks,
    toggleTask,
    deleteTask,
    addTask,
    updateTask,
    updateTaskInList,
    setTasksList
  };
}
