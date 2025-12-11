import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { createTask, getCategories } from "@/lib/api";
import type { Category, Task } from "@/types";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
}

export function CreateTaskModal({ isOpen, onClose, onTaskCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setTitle("");
      setCategoryId("");
      setDueDate("");
      setError("");
    }
  }, [isOpen]);

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
      const task = await createTask(
        title, 
        categoryId || undefined, 
        dueDate ? new Date(dueDate).toISOString() : undefined
      );
      onTaskCreated(task);
      onClose();
    } catch (err) {
      setError("Failed to create task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-500/10 text-red-500 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Task Title</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 transition-colors"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Category</label>
          <select 
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none"
          >
            <option value="">No Category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.title}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Due Date</label>
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
            className="px-4 py-2 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading || !title.trim()}
            className="px-6 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
