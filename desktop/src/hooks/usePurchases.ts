import { useState, useCallback } from "react";
import type { Purchase } from "@/types";
import { getPurchases, togglePurchaseCompletion, deletePurchase as apiDeletePurchase } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

export function usePurchases() {
  const { t } = useLanguage();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPurchases = useCallback(async (categoryId?: string) => {
    setLoading(true);
    try {
      const [active, bought] = await Promise.all([
        getPurchases(false, categoryId),
        getPurchases(true, categoryId)
      ]);
      setPurchases([...active, ...bought]);
    } catch (error) {
      console.error("Failed to load purchases", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const togglePurchase = useCallback(async (id: string) => {
    try {
      await togglePurchaseCompletion(id);
      setPurchases(prev => prev.map(p => p.id === id ? { ...p, is_bought: !p.is_bought } : p));
    } catch (error) {
      console.error("Failed to toggle purchase", error);
    }
  }, []);

  const deletePurchase = useCallback(async (id: string) => {
    if (!confirm(t("delete_purchase_confirm"))) return;
    try {
      await apiDeletePurchase(id);
      setPurchases(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Failed to delete purchase", error);
    }
  }, [t]);

  const addPurchase = useCallback((purchase: Purchase) => {
    setPurchases(prev => [purchase, ...prev]);
  }, []);

  const updatePurchase = useCallback((updatedPurchase: Purchase) => {
    setPurchases(prev => prev.map(p => p.id === updatedPurchase.id ? updatedPurchase : p));
  }, []);

  const updatePurchaseInList = useCallback((updatedPurchase: Purchase, currentCategoryId?: string) => {
    setPurchases(prev => {
      if (currentCategoryId && updatedPurchase.category_id !== currentCategoryId) {
        return prev.filter(p => p.id !== updatedPurchase.id);
      }
      return prev.map(p => p.id === updatedPurchase.id ? updatedPurchase : p);
    });
  }, []);

  const setPurchasesList = useCallback((newPurchases: Purchase[]) => {
    setPurchases(newPurchases);
  }, []);

  return {
    purchases,
    loading,
    fetchPurchases,
    togglePurchase,
    deletePurchase,
    addPurchase,
    updatePurchase,
    updatePurchaseInList,
    setPurchasesList
  };
}
