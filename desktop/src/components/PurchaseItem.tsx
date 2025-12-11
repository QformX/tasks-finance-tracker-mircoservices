import { cn } from "@/lib/utils";
import type { Purchase } from "@/types";

interface PurchaseItemProps {
  purchase: Purchase;
  categoryName?: string;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function PurchaseItem({ purchase, categoryName, onToggle, onDelete }: PurchaseItemProps) {
  return (
    <div className="group flex items-center gap-4 hover:bg-white/[0.03] rounded-2xl p-3 transition-all cursor-pointer">
      <div className="flex shrink-0 items-center justify-center pl-1">
        <input 
          type="checkbox" 
          checked={purchase.is_bought} 
          onChange={() => onToggle(purchase.id)}
          className="size-5 rounded-full border-2 border-text-secondary/50 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:outline-none transition-all cursor-pointer hover:border-text-secondary appearance-none" 
        />
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className={cn("text-white text-sm font-semibold leading-normal", purchase.is_bought && "line-through text-text-secondary")}>{purchase.title}</p>
        <div className="flex items-center gap-2">
          <span className="text-text-secondary text-[11px]">{categoryName || "No Category"}</span>
          <span className="text-text-secondary text-[10px]">•</span>
          <span className="text-text-secondary text-[11px] font-medium">
            {purchase.quantity} pcs
          </span>
        </div>
      </div>
      
      {purchase.cost && (
        <div className="text-green-500 font-bold text-base shrink-0">
          ${purchase.cost}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          {onDelete && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(purchase.id);
              }}
              className="text-text-secondary hover:text-red-400 p-1 rounded-full hover:bg-white/10 transition-colors"
              title="Delete Purchase"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          )}
          <button className="text-text-secondary hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>
        </div>
      </div>
    </div>
  );
}
