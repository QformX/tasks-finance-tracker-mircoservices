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
    getCategoryName
  } = useCategories();

  const [filter, setFilter] = useState<"all" | "active" | "bought">("all");
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

  const activePurchases = purchases.filter(p => !p.is_bought);
  const boughtPurchases = purchases.filter(p => p.is_bought);

  const displayedPurchases = filter === "bought" ? boughtPurchases : filter === "active" ? activePurchases : purchases;

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

