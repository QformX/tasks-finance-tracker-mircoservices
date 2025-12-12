import { useState } from "react";
import { Modal } from "@/components/Modal";
import type { Category } from "@/types";

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (strategy: "delete_all" | "move_to_category", targetCategoryId?: string) => Promise<void>;
  category: Category | null;
  categories: Category[];
}

export function DeleteCategoryModal({ isOpen, onClose, onDelete, category, categories }: DeleteCategoryModalProps) {
  const [strategy, setStrategy] = useState<"delete_all" | "move_to_category">("delete_all");
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!category) return null;

  const otherCategories = categories.filter(c => c.id !== category.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (strategy === "move_to_category" && !targetCategoryId) {
      setError("Please select a category to move items to.");
      return;
    }

    setLoading(true);
    try {
      await onDelete(strategy, targetCategoryId || undefined);
      onClose();
    } catch (err) {
      console.error("Failed to delete category", err);
      setError("Failed to delete category. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Delete Category "${category.title}"`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This category contains tasks or purchases. What would you like to do with them?
          </p>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
              <input 
                type="radio" 
                name="strategy" 
                value="delete_all" 
                checked={strategy === "delete_all"} 
                onChange={() => setStrategy("delete_all")}
                className="mt-1"
              />
              <div>
                <span className="block text-sm font-medium text-white">Delete everything</span>
                <span className="block text-xs text-text-secondary mt-1">Permanently delete all tasks and purchases in this category.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
              <input 
                type="radio" 
                name="strategy" 
                value="move_to_category" 
                checked={strategy === "move_to_category"} 
                onChange={() => setStrategy("move_to_category")}
                className="mt-1"
                disabled={otherCategories.length === 0}
              />
              <div>
                <span className="block text-sm font-medium text-white">Move items to another category</span>
                <span className="block text-xs text-text-secondary mt-1">Keep your items but move them to a different category.</span>
              </div>
            </label>
          </div>

          {strategy === "move_to_category" && (
            <div className="pl-8">
              <label className="block text-xs font-medium text-text-secondary mb-1">Select Target Category</label>
              <select
                value={targetCategoryId}
                onChange={(e) => setTargetCategoryId(e.target.value)}
                className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select a category...</option>
                {otherCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-white transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
            Delete Category
          </button>
        </div>
      </form>
    </Modal>
  );
}
