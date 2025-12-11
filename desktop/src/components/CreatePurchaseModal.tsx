import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { createPurchase, getCategories } from "@/lib/api";
import type { Category, Purchase } from "@/types";

interface CreatePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseCreated: (purchase: Purchase) => void;
  preselectedCategoryId?: string;
}

export function CreatePurchaseModal({ isOpen, onClose, onPurchaseCreated, preselectedCategoryId }: CreatePurchaseModalProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cost, setCost] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setTitle("");
      setCategoryId(preselectedCategoryId || "");
      setCost("");
      setQuantity("1");
      setError("");
    }
  }, [isOpen, preselectedCategoryId]);

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
    if (!title.trim()) return;

    setLoading(true);
    setError("");

    try {
      const purchase = await createPurchase(
        title, 
        categoryId || undefined, 
        cost ? parseFloat(cost) : undefined,
        parseInt(quantity) || 1
      );
      onPurchaseCreated(purchase);
      onClose();
    } catch (err) {
      setError("Failed to create purchase");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Purchase">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="text-red-500 text-sm">{error}</div>}
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Title</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you need to buy?"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-text-secondary/50"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Cost</label>
            <input 
              type="number" 
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-text-secondary/50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Quantity</label>
            <input 
              type="number" 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
              min="1"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-text-secondary/50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Category</label>
          <select 
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
          >
            <option value="" className="bg-surface-dark text-text-secondary">No Category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id} className="bg-surface-dark text-white">
                {category.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading || !title.trim()}
            className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
          >
            {loading ? "Creating..." : "Create Purchase"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
