import { useEffect, useState } from "react";
import type { Task, Purchase } from "@/types";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { EditTaskModal } from "@/components/EditTaskModal";
import { CreatePurchaseModal } from "@/components/CreatePurchaseModal";
import { EditPurchaseModal } from "@/components/EditPurchaseModal";
import { CreateCategoryModal } from "@/components/CreateCategoryModal";
import { DeleteCategoryModal } from "@/components/DeleteCategoryModal";
import { useLanguage } from "@/context/LanguageContext";
import { CategoryHeader } from "@/components/categories/CategoryHeader";
import { CategoryContent } from "@/components/categories/CategoryContent";
import { CategoryEmptyState } from "@/components/categories/CategoryEmptyState";
import { useCategories } from "@/hooks/useCategories";
import { useTasks } from "@/hooks/useTasks";
import { usePurchases } from "@/hooks/usePurchases";

export function Categories() {
  const { t } = useLanguage();
  const { 
    categories, 
    loadCategories, 
    addCategory, 
    removeCategory 
  } = useCategories();

  const { 
    tasks, 
    fetchTasks, 
    toggleTask, 
    deleteTask, 
    addTask, 
    updateTaskInList,
    setTasksList
  } = useTasks();

  const { 
    purchases, 
    fetchPurchases, 
    togglePurchase, 
    deletePurchase, 
    addPurchase, 
    updatePurchaseInList,
    setPurchasesList
  } = usePurchases();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [isEditPurchaseModalOpen, setIsEditPurchaseModalOpen] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (categories.length > 0) {
      // Ensure index is valid
      if (currentIndex >= categories.length) {
        setCurrentIndex(0);
      } else {
        loadCategoryItems(categories[currentIndex].id);
      }
    }
  }, [currentIndex, categories]);

  async function loadCategoryItems(categoryId: string) {
    setLoading(true);
    try {
      const category = categories.find(c => c.id === categoryId);
      if (!category) return;

      const promises = [];
      
      if (category.type === "tasks" || category.type === "mixed") {
        promises.push(fetchTasks("all", categoryId));
      } else {
        setTasksList([]);
      }

      if (category.type === "purchases" || category.type === "mixed") {
        promises.push(fetchPurchases(categoryId));
      } else {
        setPurchasesList([]);
      }

      await Promise.all(promises);
    } catch (error) {
      console.error("Failed to load items", error);
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    setCurrentIndex((prev) => (prev + 1) % categories.length);
  }

  function handlePrev() {
    setCurrentIndex((prev) => (prev - 1 + categories.length) % categories.length);
  }

  function handleEditTask(task: Task) {
    setEditingTask(task);
    setIsEditTaskModalOpen(true);
  }

  function handleEditPurchase(purchase: Purchase) {
    setEditingPurchase(purchase);
    setIsEditPurchaseModalOpen(true);
  }

  function handleCategoryCreated(newCategory: any) {
    addCategory(newCategory);
    setCurrentIndex(categories.length); // Switch to the new category (it's at the end)
  }

  async function handleCategoryDelete(strategy: "delete_all" | "move_to_category", targetCategoryId?: string) {
    if (!currentCategory) return;
    const success = await removeCategory(currentCategory.id, strategy, targetCategoryId);
    
    if (success) {
      setCurrentIndex(0); // Reset to first
    }
  }

  const currentCategory = categories[currentIndex];

  if (categories.length === 0) {
    return (
      <CategoryEmptyState 
        isModalOpen={isCategoryModalOpen}
        onCloseModal={() => setIsCategoryModalOpen(false)}
        onOpenModal={() => setIsCategoryModalOpen(true)}
        onCategoryCreated={handleCategoryCreated}
      />
    );
  }

  return (
    <>
      <CategoryHeader 
        categories={categories}
        currentCategory={currentCategory}
        onPrev={handlePrev}
        onNext={handleNext}
        onSelectCategory={(cat) => {
          const idx = categories.findIndex(c => c.id === cat.id);
          setCurrentIndex(idx);
        }}
        onDeleteClick={() => setIsDeleteCategoryModalOpen(true)}
        onAddTaskClick={() => setIsTaskModalOpen(true)}
        onAddPurchaseClick={() => setIsPurchaseModalOpen(true)}
      />

      <CategoryContent 
        loading={loading}
        tasks={tasks}
        purchases={purchases}
        categoryName={currentCategory.title}
        onTaskToggle={toggleTask}
        onTaskDelete={deleteTask}
        onTaskEdit={handleEditTask}
        onPurchaseToggle={togglePurchase}
        onPurchaseDelete={deletePurchase}
        onPurchaseEdit={handleEditPurchase}
      />

      <button
        onClick={() => setIsCategoryModalOpen(true)}
        className="shrink-0 w-full h-12 bg-background-dark hover:bg-white/5 text-text-secondary hover:text-white transition-all flex items-center justify-center gap-2 border-t border-white/5 text-xs font-bold uppercase tracking-widest group"
      >
        <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">add_circle</span>
        {t("create_new_category")}
      </button>

      <CreateTaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        onTaskCreated={(newTask) => addTask(newTask)}
        preselectedCategoryId={currentCategory.id}
      />

      <CreatePurchaseModal 
        isOpen={isPurchaseModalOpen} 
        onClose={() => setIsPurchaseModalOpen(false)} 
        onPurchaseCreated={(newPurchase) => addPurchase(newPurchase)}
        preselectedCategoryId={currentCategory.id}
      />

      <CreateCategoryModal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
        onCategoryCreated={handleCategoryCreated} 
      />
      
      <DeleteCategoryModal
        isOpen={isDeleteCategoryModalOpen}
        onClose={() => setIsDeleteCategoryModalOpen(false)}
        onDelete={handleCategoryDelete}
        category={currentCategory}
        categories={categories}
      />

      <EditTaskModal 
        isOpen={isEditTaskModalOpen} 
        onClose={() => setIsEditTaskModalOpen(false)} 
        task={editingTask}
        onTaskUpdated={(updatedTask) => updateTaskInList(updatedTask, currentCategory.id)} 
      />
      <EditPurchaseModal 
        isOpen={isEditPurchaseModalOpen} 
        onClose={() => setIsEditPurchaseModalOpen(false)} 
        purchase={editingPurchase}
        onPurchaseUpdated={(updatedPurchase) => updatePurchaseInList(updatedPurchase, currentCategory.id)} 
      />
    </>
  );
}
