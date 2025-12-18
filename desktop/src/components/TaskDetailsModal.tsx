import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { Dropdown } from "@/components/Dropdown";
import { updateTask, getCategories } from "@/lib/api";
import type { Category, Task } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onTaskUpdated: (task: Task) => void;
  initialEditMode?: boolean;
}

export function TaskDetailsModal({ isOpen, onClose, task, onTaskUpdated, initialEditMode = false }: TaskDetailsModalProps) {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dueDate, setDueDate] = useState("");
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && task) {
      console.log("TaskDetailsModal opened for task:", task);
      loadCategories();
      resetForm(task);
      setIsEditing(initialEditMode);
      setError("");
    }
  }, [isOpen, task, initialEditMode]);

  function resetForm(task: Task) {
    setTitle(task.title);
    setDescription(task.description || "");
    setCategoryId(task.category_id || "");
    if (task.due_date) {
      const date = new Date(task.due_date);
      const isoString = date.toISOString().slice(0, 16);
      setDueDate(isoString);
    } else {
      setDueDate("");
    }
  }

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
        description: description || null,
        category_id: categoryId || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null
      };

      const updatedTask = await updateTask(task.id, updates);
      onTaskUpdated(updatedTask);
      resetForm(updatedTask);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setError("Failed to update task");
    } finally {
      setLoading(false);
    }
  }

  if (!task) return null;

  const category = categories.find(c => c.id === categoryId);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
    >
      <div className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-500/10 text-red-500 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {!isEditing ? (
          // VIEW MODE
          <div className="flex flex-col gap-6">
            {/* Title */}
            <div className="pr-8">
               <h2 className="text-xl font-bold text-text-950">{title}</h2>
            </div>

            {/* Description */}
            <div className="bg-text-950/5 rounded-xl p-4 border border-text-950/10 min-h-[100px]">
              {description ? (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({children}) => <p className="text-base text-text-950/80 leading-relaxed mb-2 last:mb-0">{children}</p>,
                    h1: ({children}) => <h1 className="text-xl font-bold text-text-950 mt-4 mb-2 first:mt-0">{children}</h1>,
                    h2: ({children}) => <h2 className="text-lg font-bold text-text-950 mt-3 mb-2">{children}</h2>,
                    h3: ({children}) => <h3 className="text-base font-bold text-text-950 mt-2 mb-1">{children}</h3>,
                    ul: ({children}) => <ul className="list-disc pl-5 mb-2 text-text-950/80 text-base space-y-1">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal pl-5 mb-2 text-text-950/80 text-base space-y-1">{children}</ol>,
                    li: ({children}) => <li>{children}</li>,
                    a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">{children}</a>,
                    strong: ({children}) => <strong className="font-bold text-text-950">{children}</strong>,
                    blockquote: ({children}) => <blockquote className="border-l-2 border-primary-500/50 pl-4 italic text-text-950/60 my-2">{children}</blockquote>,
                    code: ({children}) => <code className="bg-text-950/10 rounded px-1 py-0.5 font-mono text-sm text-text-950/90">{children}</code>,
                    pre: ({children}) => <pre className="bg-text-950/5 rounded-lg p-3 overflow-x-auto my-2 border border-text-950/10">{children}</pre>,
                  }}
                >
                  {description}
                </ReactMarkdown>
              ) : (
                <span className="text-text-secondary italic text-base">{t("no_description") || "No description provided."}</span>
              )}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-1">{t("category") || "Category"}</span>
                <div className="flex items-center">
                  {category ? (
                    <div 
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium text-white shrink-0 inline-block"
                      style={{ backgroundColor: category.color || '#a855f7' }}
                    >
                      {category.title}
                    </div>
                  ) : (
                    <span className="text-text-secondary text-sm">{t("no_category") || "No Category"}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-text-secondary text-xs font-bold uppercase tracking-wider">{t("due_date") || "Due Date"}</span>
                <span className="text-text-950">
                  {dueDate ? new Date(dueDate).toLocaleString() : (t("no_date") || "No Date")}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-lg text-text-secondary hover:text-text-950 hover:bg-text-950/10 transition-colors"
                title={t("edit") || "Edit"}
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
            </div>
          </div>
        ) : (
          // EDIT MODE
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-text-950 mb-2">{t("edit_task") || "Edit Task"}</h2>
            <div className="flex flex-col gap-1.5">
              <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">{t("task_title") || "Task Title"}</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("task_placeholder") || "What needs to be done?"}
                className="bg-text-950/5 border border-text-950/10 rounded-xl px-4 py-2.5 text-text-950 placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-500/50 transition-colors"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">{t("description") || "Description"}</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("add_description") || "Add details (Markdown supported)"}
                maxLength={2048}
                className="bg-text-950/5 border border-text-950/10 rounded-xl px-4 py-2.5 text-text-950 placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-500/50 transition-colors min-h-[150px] resize-y font-mono text-base"
              />
              <div className="text-right text-xs text-text-secondary">
                {description.length}/2048
              </div>
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
                className="bg-text-950/5 border border-text-950/10 rounded-xl px-4 py-2.5 text-text-950 focus:outline-none focus:border-primary-500/50 transition-colors [color-scheme:dark] dark:[color-scheme:dark] light:[color-scheme:light]"
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
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
        )}
      </div>
    </Modal>
  );
}
