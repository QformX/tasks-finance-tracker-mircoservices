import { useLanguage } from "@/context/LanguageContext";
import { CreateCategoryModal } from "@/components/CreateCategoryModal";
import type { Category } from "@/types";

interface CategoryEmptyStateProps {
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
  onCategoryCreated: (category: Category) => void;
}

export function CategoryEmptyState({
  isModalOpen,
  onCloseModal,
  onOpenModal,
  onCategoryCreated
}: CategoryEmptyStateProps) {
  const { t } = useLanguage();

  return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-text-secondary">{t("no_categories_found")}</div>
        <button 
          onClick={onOpenModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold transition-colors"
        >
          <span className="material-symbols-outlined">add</span>
          {t("create_category")}
        </button>
        <CreateCategoryModal 
          isOpen={isModalOpen} 
          onClose={onCloseModal} 
          onCategoryCreated={onCategoryCreated} 
        />
      </div>
  );
}
