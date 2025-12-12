import { cn } from "@/lib/utils";
import type { AnalyticsEvent } from "@/types";

export function TaskEventItem({ event }: { event: AnalyticsEvent }) {
  const isCompleted = event.event_type === "TaskCompleted";
  
  return (
    <div className="bg-surface-dark border border-border-dark rounded-xl p-4 flex items-center justify-between hover:border-gray-600 transition-colors group cursor-pointer">
      <div className="flex items-center gap-4">
        <div className={cn("w-5 h-5 rounded-full border-2 transition-colors flex-shrink-0", isCompleted ? "border-emerald-500 bg-emerald-500/20" : "border-gray-600 group-hover:border-primary")}></div>
        <div>
          <h4 className="text-sm font-semibold text-gray-200 group-hover:text-white">
            {event.payload?.title || "Untitled Task"}
          </h4>
          <p className="text-xs text-text-secondary">
            {new Date(event.created_at).toLocaleDateString()} • {new Date(event.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-semibold border", isCompleted ? "bg-[#064e3b] text-[#34d399] border-[#065f46]" : "bg-[#2e1065] text-[#c084fc] border-[#581c87]")}>
          {isCompleted ? "Completed" : "Created"}
        </span>
        <button className="text-gray-500 hover:text-white"><span className="material-symbols-outlined text-lg">more_vert</span></button>
      </div>
    </div>
  );
}

export function PurchaseEventItem({ event }: { event: AnalyticsEvent }) {
  const cost = event.payload?.total_cost || event.payload?.cost || 0;
  
  return (
    <li className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#27272a] flex items-center justify-center border border-white/10">
          <span className="material-symbols-outlined text-gray-400 text-lg">shopping_bag</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{event.payload?.title || "Purchase"}</p>
          <p className="text-[10px] text-gray-500 uppercase">{event.event_type === "PurchaseCompleted" ? "Bought" : "Created"}</p>
        </div>
      </div>
      <span className="text-sm font-medium text-white">
        {event.event_type === "PurchaseCompleted" ? "-" : ""}${cost}
      </span>
    </li>
  );
}
