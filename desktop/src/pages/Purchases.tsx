import { useEffect, useState } from "react";
import type { Purchase, Category } from "@/types";
import { getPurchases, togglePurchaseCompletion, deletePurchase, getCategories } from "@/lib/api";
import { PurchaseItem } from "@/components/PurchaseItem";
import { CreatePurchaseModal } from "@/components/CreatePurchaseModal";

export function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "bought">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([loadPurchases(), loadCategories()]);
  }, []);

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories", error);
    }
  }

  async function loadPurchases() {
    try {
      const [active, bought] = await Promise.all([
        getPurchases(false),
        getPurchases(true)
      ]);
      setPurchases([...active, ...bought]);
    } catch (error) {
      console.error("Failed to load purchases", error);
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
      await togglePurchaseCompletion(id);
      setPurchases(purchases.map(p => p.id === id ? { ...p, is_bought: !p.is_bought } : p));
    } catch (error) {
      console.error("Failed to toggle purchase", error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this purchase?")) return;
    try {
      await deletePurchase(id);
      setPurchases(purchases.filter(p => p.id !== id));
    } catch (error) {
      console.error("Failed to delete purchase", error);
    }
  }

  function handlePurchaseCreated(newPurchase: Purchase) {
    setPurchases([newPurchase, ...purchases]);
  }

  const activePurchases = purchases.filter(p => !p.is_bought);
  const boughtPurchases = purchases.filter(p => p.is_bought);

  const displayedPurchases = filter === "bought" ? boughtPurchases : filter === "active" ? activePurchases : purchases;

  return (
    <>
      <div className="shrink-0 z-20 bg-background-dark sticky top-0">
        <div className="w-full max-w-7xl mx-auto flex flex-col p-8 pb-4">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-white text-2xl font-bold leading-tight tracking-tight">Purchases</h2>
            </div>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 cursor-pointer justify-center overflow-hidden rounded-full h-10 px-5 bg-primary hover:bg-primary-dark transition-colors text-white text-xs font-bold shadow-lg shadow-purple-900/20 group"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Purchase</span>
            </button>
          </div>
          <div className="flex flex-col lg:flex-row lg:flex-wrap gap-6 items-center justify-between">
            <div className="w-full lg:max-w-md min-w-[300px]">
              <div className="flex w-full items-center rounded-2xl h-11 bg-[#1e1e21] group focus-within:ring-1 focus-within:ring-white/10 transition-all border border-transparent">
                <div className="text-text-secondary flex items-center justify-center pl-4">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </div>
                <input className="flex w-full min-w-0 flex-1 resize-none bg-transparent border-none text-white focus:ring-0 h-full placeholder:text-text-secondary/70 px-3 text-sm font-medium outline-none" placeholder="Search purchases..." />
              </div>
            </div>
            <div className="flex gap-4 items-center overflow-x-auto w-full lg:w-auto scrollbar-hide">
              <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label="All Purchases" />
              <FilterButton active={filter === "active"} onClick={() => setFilter("active")} label="To Buy" count={activePurchases.length} />
              <FilterButton active={filter === "bought"} onClick={() => setFilter("bought")} label="Bought" count={boughtPurchases.length} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full px-8 pb-20">
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
          
          {loading ? (
            <div className="text-text-secondary text-center py-10">Loading purchases...</div>
          ) : (
            <>
              {filter === "all" ? (
                <>
                  {/* To Buy Section */}
                  {activePurchases.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <h3 className="text-text-secondary text-[11px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">shopping_cart</span>
                        To Buy
                      </h3>
                      {activePurchases.map(purchase => (
                        <PurchaseItem 
                          key={purchase.id} 
                          purchase={purchase} 
                          categoryName={getCategoryName(purchase.category_id)} 
                          onToggle={() => handleToggle(purchase.id)} 
                          onDelete={() => handleDelete(purchase.id)} 
                        />
                      ))}
                    </div>
                  )}

                  {/* Bought Section */}
                  {boughtPurchases.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2">
                      <h3 className="text-text-secondary text-[11px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Bought
                      </h3>
                      {boughtPurchases.map(purchase => (
                        <PurchaseItem 
                          key={purchase.id} 
                          purchase={purchase} 
                          categoryName={getCategoryName(purchase.category_id)} 
                          onToggle={() => handleToggle(purchase.id)} 
                          onDelete={() => handleDelete(purchase.id)} 
                        />
                      ))}
                    </div>
                  )}
                  
                  {purchases.length === 0 && (
                    <div className="text-text-secondary text-center py-10">No purchases found.</div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  {displayedPurchases.map(purchase => (
                    <PurchaseItem 
                      key={purchase.id} 
                      purchase={purchase} 
                      categoryName={getCategoryName(purchase.category_id)} 
                      onToggle={() => handleToggle(purchase.id)} 
                      onDelete={() => handleDelete(purchase.id)} 
                    />
                  ))}
                  {displayedPurchases.length === 0 && (
                    <div className="text-text-secondary text-center py-10">
                      {filter === "active" ? "No items to buy" : "No bought items"}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CreatePurchaseModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onPurchaseCreated={handlePurchaseCreated} 
      />
    </>
  );
}

import { cn } from "@/lib/utils";

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
