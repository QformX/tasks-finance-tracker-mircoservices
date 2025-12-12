import { PurchaseItem } from "@/components/PurchaseItem";
import { useLanguage } from "@/context/LanguageContext";
import type { Purchase } from "@/types";

interface PurchasesListProps {
  loading: boolean;
  filter: "all" | "active" | "bought";
  groupedPurchases: {
    active: Purchase[];
    bought: Purchase[];
    displayed: Purchase[];
  };
  getCategoryName: (categoryId: string | null) => string | undefined;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (purchase: Purchase) => void;
}

export function PurchasesList({
  loading,
  filter,
  groupedPurchases,
  getCategoryName,
  onToggle,
  onDelete,
  onEdit
}: PurchasesListProps) {
  const { t } = useLanguage();
  const { active, bought, displayed } = groupedPurchases;

  return (
    <div className="flex-1 overflow-y-auto w-full px-8 pb-20">
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
          
          {loading ? (
            <div className="text-text-secondary text-center py-10">{t("loading_purchases")}</div>
          ) : (
            <>
              {filter === "all" ? (
                <>
                  {/* To Buy Section */}
                  {active.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <h3 className="text-text-secondary text-[11px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">shopping_cart</span>
                        {t("to_buy")}
                      </h3>
                      {active.map(purchase => (
                        <PurchaseItem 
                          key={purchase.id} 
                          purchase={purchase} 
                          categoryName={getCategoryName(purchase.category_id)} 
                          onToggle={() => onToggle(purchase.id)} 
                          onDelete={() => onDelete(purchase.id)} 
                          onEdit={() => onEdit(purchase)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Bought Section */}
                  {bought.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2">
                      <h3 className="text-text-secondary text-[11px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        {t("bought")}
                      </h3>
                      {bought.map(purchase => (
                        <PurchaseItem 
                          key={purchase.id} 
                          purchase={purchase} 
                          categoryName={getCategoryName(purchase.category_id)} 
                          onToggle={() => onToggle(purchase.id)} 
                          onDelete={() => onDelete(purchase.id)} 
                          onEdit={() => onEdit(purchase)}
                        />
                      ))}
                    </div>
                  )}
                  
                  {active.length === 0 && bought.length === 0 && (
                    <div className="text-text-secondary text-center py-10">{t("no_purchases_found")}</div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  {displayed.map(purchase => (
                    <PurchaseItem 
                      key={purchase.id} 
                      purchase={purchase} 
                      categoryName={getCategoryName(purchase.category_id)} 
                      onToggle={() => onToggle(purchase.id)} 
                      onDelete={() => onDelete(purchase.id)} 
                      onEdit={() => onEdit(purchase)}
                    />
                  ))}
                  {displayed.length === 0 && (
                    <div className="text-text-secondary text-center py-10">
                      {filter === "active" ? t("no_items_to_buy") : t("no_bought_items")}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
  );
}
