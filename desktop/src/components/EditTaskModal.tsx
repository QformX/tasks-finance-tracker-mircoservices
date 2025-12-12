import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { Dropdown } from "@/components/Dropdown";
import { updateTask, getCategories } from "@/lib/api";
import type { Category, Task } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onTaskUpdated: (task: Task) => void;
}

export function EditTaskModal({ isOpen, onClose, task, onTaskUpdated }: EditTaskModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && task) {
      loadCategories();
      setTitle(task.title);
      setCategoryId(task.category_id || "");
      // Format date for datetime-local input: YYYY-MM-DDThh:mm
      if (task.due_date) {
        const date = new Date(task.due_date);
        const isoString = date.toISOString().slice(0, 16);
        setDueDate(isoString);
      } else {
        setDueDate("");
      }
      setError("");
    }
  }, [isOpen, task]);

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
    if (!title.trim() || !task) return;

    setLoading(true);
    setError("");

    try {
      const updates: Partial<Task> = {
        title,
        category_id: categoryId || null, // Allow clearing category
        due_date: dueDate ? new Date(dueDate).toISOString() : null // Allow clearing date
      };

      const updatedTask = await updateTask(task.id, updates);
      onTaskUpdated(updatedTask);
      onClose();
    } catch (err) {
      setError("Failed to update task");
    } finally {
      setLoading(false);
    }
  }

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("edit_task") || "Edit Task"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-500/10 text-red-500 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">{t("task_title") || "Task Title"}</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("task_placeholder") || "What needs to be done?"}
            className="bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 transition-colors"
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

        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">{t("due_date") || "Due Date"}</label>
          <input 
            type="datetime-local" 
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark]"
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors font-medium text-sm"
          >
            {t("cancel") || "Cancel"}
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (t("saving") || "Saving...") : (t("save_changes") || "Save Changes")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
