import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
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
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Check if the click was inside the portal dropdown
        const portalDropdown = document.getElementById(`dropdown-portal-${keyExtractor(items[0])}`); // This ID strategy is weak if items change or empty
        // Better: just check if target is inside the portal element. 
        // But we don't have a ref to the portal element easily here without more state.
        // Actually, if we use a ref for the portal content, we can check it.
        // However, simpler approach:
        // If we click outside the *trigger*, we close. 
        // But if we click inside the portal, we handle it in the portal's onClick.
        // So we only need to close if click is outside trigger AND outside portal.
        // Let's rely on the fact that clicking an item closes it.
        // Clicking outside: we need to detect.
        // Let's add a ref to the portal content.
      }
    }
    // We'll implement a better click outside handler below
  }, []);

  // Update position when opening
  useLayoutEffect(() => {
    if (isOpen && dropdownRef.current) {
      const updatePosition = () => {
        const rect = dropdownRef.current?.getBoundingClientRect();
        if (rect) {
          setPosition({
            top: rect.top,
            left: rect.left,
            width: rect.width
          });
        }
      };
      
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true); // Capture scroll to handle modal scrolling
      
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Check if click is inside the trigger
      if (dropdownRef.current?.contains(target)) return;
      
      // Check if click is inside the portal (we'll add a data attribute or id)
      const portal = document.getElementById('active-dropdown-portal');
      if (portal?.contains(target)) return;

      setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

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
          "px-4 py-2.5 bg-text-950/5 border-text-950/10 hover:bg-text-950/5",
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

      {isOpen && createPortal(
        <div 
          id="active-dropdown-portal"
          className={cn(
            "fixed bg-surface-dark border border-text-950/10 rounded-xl shadow-xl overflow-hidden z-[100] max-h-60 overflow-y-auto flex flex-col",
            "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']",
            dropdownClassName
          )}
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
          }}
        >
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
                  "px-4 py-2.5 hover:bg-text-950/5",
                  isSelected ? "bg-text-950/5" : ""
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
        </div>,
        document.body
      )}
    </div>
  );
}
