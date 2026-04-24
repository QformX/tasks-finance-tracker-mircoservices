import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Purchase } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface PurchaseItemProps {
  purchase: Purchase;
  categoryName?: string;
  categoryColor?: string;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (purchase: Purchase) => void;
}

export function PurchaseItem({ purchase, categoryName, categoryColor, onToggle, onDelete, onEdit }: PurchaseItemProps) {
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
    <div className={cn(
      "group flex items-center gap-4 bg-surface border border-text-950/5 rounded-2xl p-4 transition-all duration-300 cursor-pointer",
      purchase.is_bought 
        ? "opacity-50 hover:opacity-80" 
        : "shadow-sm hover:border-primary/30 hover:shadow-md hover:scale-[1.01]",
      isMenuOpen && "relative z-20"
    )}>
      <div className="flex shrink-0 items-center justify-center pl-1">
        <input 
          type="checkbox" 
          checked={purchase.is_bought} 
          onChange={() => onToggle(purchase.id)}
          className="size-5 rounded-full border-2 border-text-secondary/50 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:outline-none transition-all cursor-pointer hover:border-text-secondary appearance-none" 
        />
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className={cn("text-text-950 text-base font-semibold leading-normal", purchase.is_bought && "line-through text-text-secondary")}>{purchase.title}</p>
        <div className="flex items-center gap-2">
          <span className="text-text-secondary text-sm font-medium">
            {purchase.quantity} {t("pcs") || "pcs"}
          </span>
        </div>
      </div>
      
      {purchase.cost && (
        <div className="text-green-500 font-bold text-base shrink-0">
          ${purchase.cost}
        </div>
      )}

      {categoryName && (
        <div 
          className="px-2 py-0.5 rounded-md text-xs font-medium text-white shrink-0"
          style={{ backgroundColor: categoryColor || '#a855f7' }}
        >
          {categoryName}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center relative" ref={menuRef}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="text-text-secondary hover:text-text-950 p-1 rounded-full hover:bg-text-950/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-8 z-[100] w-36 bg-surface-dark border border-text-950/10 rounded-xl shadow-xl overflow-hidden flex flex-col py-1">
               <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onEdit?.(purchase);
                 }}
                 className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-950 hover:bg-text-950/5 transition-colors text-left"
               >
                 <span className="material-symbols-outlined text-[16px]">edit</span>
                 {t("edit") || "Edit"}
               </button>
               <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onDelete?.(purchase.id);
                 }}
                 className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
               >
                 <span className="material-symbols-outlined text-[16px]">delete</span>
                 {t("delete") || "Delete"}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
