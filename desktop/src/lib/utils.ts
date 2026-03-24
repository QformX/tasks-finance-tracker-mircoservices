import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateHeader(dateStr: string): string {
  if (dateStr === "No Date") return "No Date";
  
  // Create date object from YYYY-MM-DD string
  // We append T00:00:00 to ensure local time parsing or handle it manually
  // Actually, new Date("2023-12-13") is UTC. 
  // Let's use the string comparison for Today/Tomorrow which is safer.
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const tStr = today.toLocaleDateString('en-CA');
  const tomStr = tomorrow.toLocaleDateString('en-CA');

  if (dateStr === tStr) return "Today";
  if (dateStr === tomStr) return "Tomorrow";
  
  // For formatting, we want to display it nicely.
  // new Date(dateStr) might be off by a day depending on timezone if treated as UTC.
  // Let's parse manually to be safe: "2023-12-13" -> 2023, 11, 13
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  
  if (date.getFullYear() !== today.getFullYear()) {
      return date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }
  
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function groupItemsByDate<T extends { due_date?: string | null, created_at?: string }>(
  items: T[], 
  dateField: 'due_date' | 'created_at' = 'due_date'
) {
  const groups: Record<string, T[]> = {};
  
  items.forEach(item => {
    const dateVal = item[dateField];
    
    // If using due_date and it's null, use "No Date"
    // If using created_at, it should be present, but if not, "No Date"
    
    let key = "No Date";
    if (dateVal) {
        const date = new Date(dateVal);
        key = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  });
  
  // Sort keys
  const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "No Date") return 1; // Put No Date at the end
      if (b === "No Date") return -1;
      return a.localeCompare(b);
  });
  
  return sortedKeys.map(key => ({
    date: key,
    label: formatDateHeader(key),
    items: groups[key]
  }));
}
