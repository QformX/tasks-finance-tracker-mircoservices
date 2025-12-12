import { useState, useCallback } from "react";
import type { Category } from "@/types";
import { getCategories, deleteCategory as apiDeleteCategory } from "@/lib/api";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addCategory = useCallback((category: Category) => {
    setCategories(prev => [...prev, category]);
  }, []);

  const removeCategory = useCallback(async (id: string, strategy: "delete_all" | "move_to_category", targetCategoryId?: string) => {
    try {
      await apiDeleteCategory(id, strategy, targetCategoryId);
      setCategories(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (error) {
      console.error("Failed to delete category", error);
      return false;
    }
  }, []);

  const getCategoryName = useCallback((categoryId: string | null) => {
    if (!categoryId) return undefined;
    return categories.find(c => c.id === categoryId)?.title;
  }, [categories]);

  return {
    categories,
    loading,
    loadCategories,
    addCategory,
    removeCategory,
    getCategoryName
  };
}
