import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { Dropdown } from "@/components/Dropdown";
import { createTask, getCategories } from "@/lib/api";
import type { Category, Task } from "@/types";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
  preselectedCategoryId?: string;
}

export function CreateTaskModal({ isOpen, onClose, onTaskCreated, preselectedCategoryId }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setTitle("");
      setDescription("");
      setCategoryId(preselectedCategoryId || "");
      setDueDate("");
      setPriority("medium");
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
      const task = await createTask(
        title, 
        categoryId || undefined, 
        dueDate ? new Date(dueDate).toISOString() : undefined,
        description || undefined,
        priority
      );
      onTaskCreated(task);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to create task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-text-950 mb-2">Create New Task</h2>
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
            className="bg-text-950/5 border border-text-950/10 rounded-xl px-4 py-2.5 text-text-950 placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-500/50 transition-colors"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Description</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details (Markdown supported)"
            className="bg-text-950/5 border border-text-950/10 rounded-xl px-4 py-2.5 text-text-950 placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-500/50 transition-colors min-h-[100px] resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Priority</label>
            <div className="flex bg-text-950/5 rounded-xl p-1 border border-text-950/10 h-[46px]">
              {(["low", "medium", "high"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 h-full rounded-lg text-sm font-medium capitalize transition-all ${
                    priority === p 
                      ? p === "high" ? "bg-red-500 text-white shadow-sm" :
                        p === "medium" ? "bg-yellow-500 text-white shadow-sm" :
                        "bg-blue-500 text-white shadow-sm"
                      : "text-text-secondary hover:text-text-950"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Category</label>
            <Dropdown
              items={[{ id: "", title: "No Category", type: "mixed", user_id: "" } as Category, ...categories]}
              selectedItem={categories.find(c => c.id === categoryId) || { id: "", title: "No Category", type: "mixed", user_id: "" } as Category}
              onSelect={(item) => setCategoryId(item.id)}
              keyExtractor={(item) => item.id}
              renderItem={(item) => item.title}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Due Date</label>
          <input 
            type="datetime-local" 
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-text-950/5 border border-text-950/10 rounded-xl px-4 py-2.5 text-text-950 focus:outline-none focus:border-primary-500/50 transition-colors [color-scheme:dark] dark:[color-scheme:dark] light:[color-scheme:light]"
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-text-secondary hover:text-text-950 hover:bg-text-950/5 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading || !title.trim()}
            className="px-6 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
