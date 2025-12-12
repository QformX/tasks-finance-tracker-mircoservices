import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { createCategory } from "@/lib/api";
import type { Category } from "@/types";

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated: (category: Category) => void;
}

export function CreateCategoryModal({ isOpen, onClose, onCategoryCreated }: CreateCategoryModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"tasks" | "purchases" | "mixed">("mixed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setType("mixed");
      setError("");
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError("");

    try {
      const newCategory = await createCategory(title, type);
      onCategoryCreated(newCategory);
      onClose();
    } catch (err) {
      console.error("Failed to create category", err);
      setError("Failed to create category. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Category">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-sm font-medium text-text-secondary">
            Category Name
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Work, Home, Groceries"
            className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-primary transition-colors"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">
            Category Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType("tasks")}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                type === "tasks" 
                  ? "bg-primary/20 border-primary text-white" 
                  : "bg-background-dark border-white/10 text-text-secondary hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined">task_alt</span>
              <span className="text-xs font-medium">Tasks</span>
            </button>
            <button
              type="button"
              onClick={() => setType("purchases")}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                type === "purchases" 
                  ? "bg-emerald-500/20 border-emerald-500 text-white" 
                  : "bg-background-dark border-white/10 text-text-secondary hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined">shopping_bag</span>
              <span className="text-xs font-medium">Purchases</span>
            </button>
            <button
              type="button"
              onClick={() => setType("mixed")}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                type === "mixed" 
                  ? "bg-blue-500/20 border-blue-500 text-white" 
                  : "bg-background-dark border-white/10 text-text-secondary hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined">layers</span>
              <span className="text-xs font-medium">Mixed</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || loading}
            className="px-6 py-2 rounded-lg bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors shadow-lg shadow-purple-900/20"
          >
            {loading ? "Creating..." : "Create Category"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
