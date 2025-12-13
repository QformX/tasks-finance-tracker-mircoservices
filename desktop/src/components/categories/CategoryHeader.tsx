import { useState, useRef, useEffect } from "react";
import { Dropdown } from "@/components/Dropdown";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import type { Category } from "@/types";

interface CategoryHeaderProps {
  categories: Category[];
  currentCategory: Category;
  onPrev: () => void;
  onNext: () => void;
  onSelectCategory: (category: Category) => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onAddTaskClick: () => void;
  onAddPurchaseClick: () => void;
}

export function CategoryHeader({
  categories,
  currentCategory,
  onPrev,
  onNext,
  onSelectCategory,
  onEditClick,
  onDeleteClick,
  onAddTaskClick,
  onAddPurchaseClick,
}: CategoryHeaderProps) {
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="shrink-0 z-20 bg-background-dark sticky top-0 px-4 lg:px-8">
        <div className="w-full max-w-7xl mx-auto flex flex-col pt-4 lg:pt-8 pb-4">
          <div className="flex items-center justify-between gap-2 lg:gap-4 mb-6">
            <h2 className="text-white text-xl lg:text-2xl font-bold leading-tight tracking-tight whitespace-nowrap shrink-0 hidden sm:block">{t("categories_header")}</h2>
            
            <div className="flex items-center gap-2 lg:gap-4 flex-1 justify-center sm:justify-start sm:flex-none">
              <button 
                onClick={onPrev}
                className="size-8 lg:size-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors shrink-0"
              >
                <span className="material-symbols-outlined">keyboard_arrow_left</span>
              </button>
              
              <Dropdown
                className="w-40 sm:w-56 lg:w-64"
                buttonClassName="px-8 py-1"
                items={categories}
                selectedItem={currentCategory}
                onSelect={onSelectCategory}
                keyExtractor={(cat) => cat.id}
                renderItem={(cat, isSelected) => (
                  <>
                    <span className={cn("font-bold text-base lg:text-lg truncate max-w-full", isSelected ? "text-primary" : "text-white")}>{cat.title}</span>
                    <span className="text-text-secondary text-[10px] lg:text-xs uppercase tracking-wider font-bold">{cat.type}</span>
                  </>
                )}
              />

              <button 
                onClick={onNext}
                className="size-8 lg:size-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors shrink-0"
              >
                <span className="material-symbols-outlined">keyboard_arrow_right</span>
              </button>
            </div>

            <div className="flex gap-2 shrink-0">
              <div className="relative" ref={menuRef}>
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="size-10 rounded-full bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white flex items-center justify-center transition-colors mr-2"
                    title={t("category_settings") || "Category Settings"}
                  >
                    <span className="material-symbols-outlined text-[20px]">settings</span>
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 top-12 z-50 w-48 bg-[#1e1e21] border border-white/10 rounded-xl shadow-xl overflow-hidden flex flex-col py-1">
                       <button 
                         onClick={() => {
                            setIsMenuOpen(false);
                            onEditClick();
                         }}
                         className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors text-left"
                       >
                         <span className="material-symbols-outlined text-[18px]">edit</span>
                         {t("edit_category") || "Edit Category"}
                       </button>
                       <button 
                         onClick={() => {
                            setIsMenuOpen(false);
                            onDeleteClick();
                         }}
                         className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                       >
                         <span className="material-symbols-outlined text-[18px]">delete</span>
                         {t("delete_category") || "Delete Category"}
                       </button>
                    </div>
                  )}
              </div>

              <button 
                onClick={onAddTaskClick}
                disabled={!(currentCategory.type === "tasks" || currentCategory.type === "mixed")}
                className={cn(
                  "flex items-center gap-2 justify-center overflow-hidden rounded-full h-10 px-3 xl:px-5 transition-colors text-white text-xs font-bold shadow-lg",
                  (currentCategory.type === "tasks" || currentCategory.type === "mixed")
                    ? "bg-primary hover:bg-primary-dark shadow-purple-900/20 cursor-pointer"
                    : "bg-white/5 text-white/20 shadow-none cursor-not-allowed"
                )}
              >
                <span className="material-symbols-outlined text-[18px]">add_task</span>
                <span className="hidden xl:inline">{t("add_task")}</span>
              </button>
              
              <button 
                onClick={onAddPurchaseClick}
                disabled={!(currentCategory.type === "purchases" || currentCategory.type === "mixed")}
                className={cn(
                  "flex items-center gap-2 justify-center overflow-hidden rounded-full h-10 px-3 xl:px-5 transition-colors text-white text-xs font-bold shadow-lg",
                  (currentCategory.type === "purchases" || currentCategory.type === "mixed")
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20 cursor-pointer"
                    : "bg-white/5 text-white/20 shadow-none cursor-not-allowed"
                )}
              >
                <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                <span className="hidden xl:inline">{t("add_purchase")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
