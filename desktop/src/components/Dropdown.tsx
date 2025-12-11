import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DropdownProps<T> {
  items: T[];
  selectedItem: T | null;
  onSelect: (item: T) => void;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
}

export function Dropdown<T>({
  items,
  selectedItem,
  onSelect,
  renderItem,
  keyExtractor,
  placeholder = "Select...",
  className,
  buttonClassName,
  dropdownClassName
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // If selected item is present, put it first in the list for the dropdown view
  const displayItems = selectedItem 
    ? [selectedItem, ...items.filter(i => keyExtractor(i) !== keyExtractor(selectedItem))]
    : items;

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex flex-col items-center justify-center w-full group rounded-xl transition-colors border border-transparent",
          "px-4 py-2.5 bg-black/20 border-white/10 hover:bg-white/5",
          isOpen ? "opacity-0 pointer-events-none" : "",
          buttonClassName
        )}
      >
        {selectedItem ? (
            renderItem(selectedItem, false)
        ) : (
            <span className="text-text-secondary font-normal text-sm">{placeholder}</span>
        )}
        
        <span className="absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity text-[20px]">
          arrow_drop_down
        </span>
      </button>

      {isOpen && (
        <div className={cn(
          "absolute top-0 left-0 w-full bg-[#1e1e21] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto flex flex-col",
          dropdownClassName
        )}>
          {displayItems.map((item) => {
            const isSelected = selectedItem && keyExtractor(item) === keyExtractor(selectedItem);
            return (
              <button
                key={keyExtractor(item)}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setIsOpen(false);
                }}
                className={cn(
                  "relative w-full transition-colors flex flex-col items-center justify-center gap-0.5 shrink-0",
                  "px-4 py-2.5 hover:bg-white/5",
                  isSelected ? "bg-white/5" : ""
                )}
              >
                {renderItem(item, !!isSelected)}
                
                {isSelected && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary text-[20px] rotate-180 shrink-0">
                    arrow_drop_down
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
