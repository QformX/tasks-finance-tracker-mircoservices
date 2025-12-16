import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { Dropdown } from "@/components/Dropdown";
import { updatePurchase, getCategories } from "@/lib/api";
import type { Category, Purchase } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface EditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  onPurchaseUpdated: (purchase: Purchase) => void;
}

export function EditPurchaseModal({ isOpen, onClose, purchase, onPurchaseUpdated }: EditPurchaseModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cost, setCost] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && purchase) {
      loadCategories();
      setTitle(purchase.title);
      setCategoryId(purchase.category_id || "");
      setCost(purchase.cost ? purchase.cost.toString() : "");
      setQuantity(purchase.quantity.toString());
      setError("");
    }
  }, [isOpen, purchase]);

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !purchase) return;

    setLoading(true);
    setError("");

    try {
      const updates: Partial<Purchase> = {
        title,
        category_id: categoryId || null,
        cost: cost ? parseFloat(cost) : null,
        quantity: parseInt(quantity) || 1
      };

      const updatedPurchase = await updatePurchase(purchase.id, updates);
      onPurchaseUpdated(updatedPurchase);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to update purchase");
    } finally {
      setLoading(false);
    }
  }

  if (!purchase) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("edit_purchase") || "Edit Purchase"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-500/10 text-red-500 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">{t("purchase_title") || "Purchase Title"}</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("purchase_placeholder") || "What needs to be bought?"}
            className="bg-text-950/5 border border-text-950/10 rounded-xl px-4 py-2.5 text-text-950 placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-500/50 transition-colors"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">{t("category") || "Category"}</label>
          <Dropdown
            items={[{ id: "", title: t("no_category") || "No Category", type: "mixed", user_id: "" } as Category, ...categories]}
            selectedItem={categories.find(c => c.id === categoryId) || { id: "", title: t("no_category") || "No Category", type: "mixed", user_id: "" } as Category}
            onSelect={(item) => setCategoryId(item.id)}
            keyExtractor={(item) => item.id}
            renderItem={(item) => item.title}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">{t("cost") || "Cost"}</label>
            <input 
              type="number" 
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              className="bg-text-950/5 border border-text-950/10 rounded-xl px-4 py-2.5 text-text-950 placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-500/50 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">{t("quantity") || "Quantity"}</label>
            <input 
              type="number" 
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-text-950/5 border border-text-950/10 rounded-xl px-4 py-2.5 text-text-950 placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-500/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-text-secondary hover:text-text-950 hover:bg-text-950/5 transition-colors font-medium text-sm"
          >
            {t("cancel") || "Cancel"}
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (t("saving") || "Saving...") : (t("save_changes") || "Save Changes")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
