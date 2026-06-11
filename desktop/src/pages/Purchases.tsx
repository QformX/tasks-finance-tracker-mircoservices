import { useEffect, useState } from "react";
import type { Purchase } from "@/types";
import { CreatePurchaseModal } from "@/components/CreatePurchaseModal";
import { EditPurchaseModal } from "@/components/EditPurchaseModal";
import { PurchasesHeader } from "@/components/purchases/PurchasesHeader";
import { PurchasesList } from "@/components/purchases/PurchasesList";
import { usePurchases } from "@/hooks/usePurchases";
import { useCategories } from "@/hooks/useCategories";

export function Purchases() {
  const {
    purchases,
    loading: purchasesLoading,
    fetchPurchases,
    togglePurchase,
    deletePurchase,
    addPurchase,
    updatePurchase
  } = usePurchases();

  const {
    loadCategories,
    getCategoryName,
    getCategoryColor
  } = useCategories();

  const [filter, setFilter] = useState<"all" | "active" | "bought">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchPurchases();
    loadCategories();
  }, [fetchPurchases, loadCategories]);

  function handleEdit(purchase: Purchase) {
    setEditingPurchase(purchase);
    setIsEditModalOpen(true);
  }

  const filteredPurchases = purchases.filter(purchase => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const matchesTitle = purchase.title.toLowerCase().includes(query);
    
    const catName = getCategoryName(purchase.category_id);
    const matchesCategory = catName ? catName.toLowerCase().includes(query) : false;
    
    return matchesTitle || matchesCategory;
  });

  const activePurchases = filteredPurchases.filter(p => !p.is_bought);
  const boughtPurchases = filteredPurchases.filter(p => p.is_bought);

  const displayedPurchases = filter === "bought" ? boughtPurchases : filter === "active" ? activePurchases : filteredPurchases;

  return (
    <>
      <PurchasesHeader 
        filter={filter}
        setFilter={setFilter}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        counts={{
          active: activePurchases.length,
          bought: boughtPurchases.length
        }}
        search={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <PurchasesList 
        loading={purchasesLoading}
        filter={filter}
        groupedPurchases={{
          active: activePurchases,
          bought: boughtPurchases,
          displayed: displayedPurchases
        }}
        getCategoryName={getCategoryName}
        getCategoryColor={getCategoryColor}
        onToggle={togglePurchase}
        onDelete={deletePurchase}
        onEdit={handleEdit}
      />

      <CreatePurchaseModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onPurchaseCreated={addPurchase} 
      />
      <EditPurchaseModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        purchase={editingPurchase}
        onPurchaseUpdated={updatePurchase} 
      />
    </>
  );
}

