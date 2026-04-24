import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { updateCategory } from "@/lib/api";
import type { Category } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  onCategoryUpdated: (category: Category) => void;
}

const COLORS = [
  { name: "Purple", value: "#a855f7" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
];

export function EditCategoryModal({ isOpen, onClose, category, onCategoryUpdated }: EditCategoryModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#a855f7");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && category) {
      setTitle(category.title);
      setColor(category.color || "#a855f7");
      setError("");
    }
  }, [isOpen, category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !category) return;

    setLoading(true);
    setError("");

    try {
      const updatedCategory = await updateCategory(category.id, { title, color });
      onCategoryUpdated(updatedCategory);
      onClose();
    } catch (err) {
      console.error("Failed to update category", err);
      setError("Failed to update category. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!category) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("edit_category") || "Edit Category"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          <label htmlFor="edit-category-title" className="text-sm font-medium text-text-secondary">
            {t("category_name") || "Category Name"}
          </label>
          <input
            id="edit-category-title"
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
            {t("category_color") || "Category Color"}
          </label>
          <div className="grid grid-cols-6 gap-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={`w-full aspect-square rounded-lg border-2 transition-all ${
                  color === c.value 
                    ? "border-white scale-110" 
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-white transition-colors"
            disabled={loading}
          >
            {t("cancel") || "Cancel"}
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (t("saving") || "Saving...") : (t("save_changes") || "Save Changes")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
