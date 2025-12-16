import { useLanguage } from "@/context/LanguageContext";
import { FilterButton } from "./FilterButton";
import { CreateButton } from "@/components/CreateButton";

interface PurchasesHeaderProps {
  filter: "all" | "active" | "bought";
  setFilter: (filter: "all" | "active" | "bought") => void;
  onOpenCreateModal: () => void;
  counts: {
    active: number;
    bought: number;
  };
}

export function PurchasesHeader({ filter, setFilter, onOpenCreateModal, counts }: PurchasesHeaderProps) {
  const { t } = useLanguage();

  return (
    <div className="shrink-0 z-20 bg-background-200 dark:bg-background-50 sticky top-0 px-8">
        <div className="w-full max-w-7xl mx-auto flex flex-col pt-8 pb-4">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-text-950 text-xl lg:text-2xl font-bold leading-tight tracking-tight whitespace-nowrap shrink-0">{t("purchases_header")}</h2>
            </div>
            <CreateButton onClick={onOpenCreateModal} label={t("new_purchase")} />
          </div>
          <div className="flex flex-col min-[1143px]:flex-row min-[1143px]:flex-wrap gap-6 items-center justify-between">
            <div className="w-full min-[1143px]:max-w-md min-w-[300px]">
              <div className="flex w-full items-center rounded-2xl h-11 bg-text-950/5 group focus-within:ring-1 focus-within:ring-text-950/10 transition-all border border-transparent">
                <div className="text-text-secondary flex items-center justify-center pl-4">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </div>
                <input className="flex w-full min-w-0 flex-1 resize-none bg-transparent border-none text-text-950 focus:ring-0 h-full placeholder:text-text-secondary/70 px-3 text-sm font-medium outline-none" placeholder={t("search_purchases_placeholder")} />
              </div>
            </div>
            <div className="flex gap-4 items-center overflow-x-auto w-full min-[1143px]:w-auto scrollbar-hide">
              <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label={t("all_purchases")} />
              <FilterButton active={filter === "active"} onClick={() => setFilter("active")} label={t("to_buy")} count={counts.active} />
              <FilterButton active={filter === "bought"} onClick={() => setFilter("bought")} label={t("bought")} count={counts.bought} />
            </div>
          </div>
        </div>
      </div>
  );
}
