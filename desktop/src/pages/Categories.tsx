import { useEffect, useState } from "react";
import type { Category, Task, Purchase } from "@/types";
import { getCategories, getTasks, getPurchases, toggleTaskCompletion, deleteTask, togglePurchaseCompletion, deletePurchase, deleteCategory } from "@/lib/api";
import { TaskItem } from "@/components/TaskItem";
import { PurchaseItem } from "@/components/PurchaseItem";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { CreatePurchaseModal } from "@/components/CreatePurchaseModal";
import { CreateCategoryModal } from "@/components/CreateCategoryModal";
import { DeleteCategoryModal } from "@/components/DeleteCategoryModal";
import { cn } from "@/lib/utils";

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

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

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories", error);
    }
  }

  async function loadCategoryItems(categoryId: string) {
    setLoading(true);
    try {
      const category = categories.find(c => c.id === categoryId);
      if (!category) return;

      const promises = [];
      
      if (category.type === "tasks" || category.type === "mixed") {
        promises.push(getTasks("all", categoryId).then(setTasks));
      } else {
        setTasks([]);
      }

      if (category.type === "purchases" || category.type === "mixed") {
        // Load both active and bought purchases
        promises.push(
          Promise.all([
            getPurchases(false, categoryId),
            getPurchases(true, categoryId)
          ]).then(([active, bought]) => setPurchases([...active, ...bought]))
        );
      } else {
        setPurchases([]);
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

  // Task Handlers
  async function handleTaskToggle(id: string) {
    try {
      await toggleTaskCompletion(id);
      setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t));
    } catch (error) {
      console.error("Failed to toggle task", error);
    }
  }

  async function handleTaskDelete(id: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  }

  // Purchase Handlers
  async function handlePurchaseToggle(id: string) {
    try {
      await togglePurchaseCompletion(id);
      setPurchases(purchases.map(p => p.id === id ? { ...p, is_bought: !p.is_bought } : p));
    } catch (error) {
      console.error("Failed to toggle purchase", error);
    }
  }

  async function handlePurchaseDelete(id: string) {
    if (!confirm("Are you sure you want to delete this purchase?")) return;
    try {
      await deletePurchase(id);
      setPurchases(purchases.filter(p => p.id !== id));
    } catch (error) {
      console.error("Failed to delete purchase", error);
    }
  }

  function handleCategoryCreated(newCategory: Category) {
    setCategories([...categories, newCategory]);
    setCurrentIndex(categories.length); // Switch to the new category (it's at the end)
  }

  async function handleCategoryDelete(strategy: "delete_all" | "move_to_category", targetCategoryId?: string) {
    if (!currentCategory) return;
    await deleteCategory(currentCategory.id, strategy, targetCategoryId);
    
    // Remove from list
    const newCategories = categories.filter(c => c.id !== currentCategory.id);
    setCategories(newCategories);
    setCurrentIndex(0); // Reset to first
  }

  const currentCategory = categories[currentIndex];

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-text-secondary">No categories found.</div>
        <button 
          onClick={() => setIsCategoryModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold transition-colors"
        >
          <span className="material-symbols-outlined">add</span>
          Create Category
        </button>
        <CreateCategoryModal 
          isOpen={isCategoryModalOpen} 
          onClose={() => setIsCategoryModalOpen(false)} 
          onCategoryCreated={handleCategoryCreated} 
        />
      </div>
    );
  }

  return (
    <>
      <div className="shrink-0 z-20 bg-background-dark sticky top-0">
        <div className="w-full max-w-7xl mx-auto flex flex-col p-8 pb-4">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-white text-2xl font-bold leading-tight tracking-tight">Categories</h2>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={handlePrev}
                className="size-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">keyboard_arrow_left</span>
              </button>
              
              <div className="flex flex-col items-center min-w-[150px] group relative">
                <span className="text-white font-bold text-lg">{currentCategory.title}</span>
                <span className="text-text-secondary text-xs uppercase tracking-wider font-bold">{currentCategory.type}</span>
              </div>

              <button 
                onClick={handleNext}
                className="size-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">keyboard_arrow_right</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setIsDeleteCategoryModalOpen(true)}
                className="size-10 rounded-full bg-white/5 hover:bg-red-500/20 text-text-secondary hover:text-red-400 flex items-center justify-center transition-colors mr-2"
                title="Delete Category"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>

              <button 
                onClick={() => setIsTaskModalOpen(true)}
                disabled={!(currentCategory.type === "tasks" || currentCategory.type === "mixed")}
                className={cn(
                  "flex items-center gap-2 justify-center overflow-hidden rounded-full h-10 px-3 lg:px-5 transition-colors text-white text-xs font-bold shadow-lg",
                  (currentCategory.type === "tasks" || currentCategory.type === "mixed")
                    ? "bg-primary hover:bg-primary-dark shadow-purple-900/20 cursor-pointer"
                    : "bg-white/5 text-white/20 shadow-none cursor-not-allowed"
                )}
              >
                <span className="material-symbols-outlined text-[18px]">add_task</span>
                <span className="hidden lg:inline">Add Task</span>
              </button>
              
              <button 
                onClick={() => setIsPurchaseModalOpen(true)}
                disabled={!(currentCategory.type === "purchases" || currentCategory.type === "mixed")}
                className={cn(
                  "flex items-center gap-2 justify-center overflow-hidden rounded-full h-10 px-3 lg:px-5 transition-colors text-white text-xs font-bold shadow-lg",
                  (currentCategory.type === "purchases" || currentCategory.type === "mixed")
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20 cursor-pointer"
                    : "bg-white/5 text-white/20 shadow-none cursor-not-allowed"
                )}
              >
                <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                <span className="hidden lg:inline">Add Purchase</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full px-8 pb-20">
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
          {loading ? (
            <div className="text-text-secondary text-center py-10">Loading items...</div>
          ) : (
            <>
              {/* Tasks Section */}
              {tasks.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-text-secondary text-[11px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">task_alt</span>
                    Tasks
                  </h3>
                  {tasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      categoryName={currentCategory.title}
                      onToggle={() => handleTaskToggle(task.id)} 
                      onDelete={() => handleTaskDelete(task.id)} 
                    />
                  ))}
                </div>
              )}

              {/* Purchases Section */}
              {purchases.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-text-secondary text-[11px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">shopping_bag</span>
                    Purchases
                  </h3>
                  {purchases.map(purchase => (
                    <PurchaseItem 
                      key={purchase.id} 
                      purchase={purchase} 
                      categoryName={currentCategory.title}
                      onToggle={() => handlePurchaseToggle(purchase.id)} 
                      onDelete={() => handlePurchaseDelete(purchase.id)} 
                    />
                  ))}
                </div>
              )}

              {tasks.length === 0 && purchases.length === 0 && (
                <div className="text-text-secondary text-center py-10">
                  No items in this category.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <button
        onClick={() => setIsCategoryModalOpen(true)}
        className="shrink-0 w-full h-12 bg-background-dark hover:bg-white/5 text-text-secondary hover:text-white transition-all flex items-center justify-center gap-2 border-t border-white/5 text-xs font-bold uppercase tracking-widest group"
      >
        <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">add_circle</span>
        Create New Category
      </button>

      <CreateTaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        onTaskCreated={(newTask) => setTasks([newTask, ...tasks])}
        preselectedCategoryId={currentCategory.id}
      />

      <CreatePurchaseModal 
        isOpen={isPurchaseModalOpen} 
        onClose={() => setIsPurchaseModalOpen(false)} 
        onPurchaseCreated={(newPurchase) => setPurchases([newPurchase, ...purchases])}
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
    </>
  );
}
