import type { DashboardStats, Task } from "@/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface DashboardStatsGridProps {
  stats: DashboardStats;
  overdueTasks?: Task[];
  onOpenCriticalModal?: () => void;
}

export function DashboardStatsGrid({ stats, overdueTasks, onOpenCriticalModal }: DashboardStatsGridProps) {
  const { t } = useLanguage();

  // Total Events now only includes Tasks (Created + Completed)
  const completedEvents = stats.tasks_completed;
  const pendingEvents = stats.total_events - completedEvents;
  const completionRate = stats.total_events > 0 ? Math.round((completedEvents / stats.total_events) * 100) : 0;

  // Calculate task completion rate based on tasks due in period + overdue
  const tasksTarget = (stats.tasks_due_period || 0) + (stats.overdue_tasks_count || 0) + (stats.completed_overdue_tasks_count || 0);
  const tasksDone = stats.tasks_completed;
  const taskCompletionRate = tasksTarget > 0 ? Math.round((tasksDone / tasksTarget) * 100) : 0;

  const topCategories = Object.entries(stats.spending_by_category)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2);

  const highOverdue = overdueTasks?.filter(t => t.priority === 'high').length || 0;
  const mediumOverdue = overdueTasks?.filter(t => t.priority === 'medium').length || 0;
  const lowOverdue = overdueTasks?.filter(t => t.priority === 'low').length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* 1. Total Events */}
      <div className="bg-surface-dark rounded-2xl p-4 border border-text-950/10 shadow-sm relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
            <span className="material-symbols-outlined">event_note</span>
          </div>
          <span className="text-xs font-medium text-purple-500 bg-purple-500/10 px-2 py-1 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            {stats.daily_stats[0]?.tasks || 0} today
          </span>
        </div>
        <div className="flex flex-col">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">{t("total_events")}</h3>
          <div className="flex items-end justify-between mt-2">
            <span className={cn(
              "font-bold text-text-950 transition-all mb-1",
              stats.total_events >= 100 ? "text-3xl" : "text-4xl"
            )}>{stats.total_events}</span>
            
            <div className="flex flex-col items-center justify-end gap-2 h-36 w-36">
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-text-950/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
                  <path className="text-purple-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${completionRate}, 100`} strokeWidth="4"></path>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-text-secondary">{completionRate}%</div>
              </div>
              <div className="flex flex-col gap-0.5 text-[10px] w-full items-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                  <span className="text-text-secondary whitespace-nowrap">{completedEvents} Done</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-text-950/20"></span>
                  <span className="text-text-secondary whitespace-nowrap">{pendingEvents} Pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tasks Created */}
      <div className="bg-surface-dark rounded-2xl p-4 border border-text-950/10 shadow-sm relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
            <span className="material-symbols-outlined">task_alt</span>
          </div>
          <span className="text-xs font-medium text-purple-500 bg-purple-500/10 px-2 py-1 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">priority_high</span>
            {stats.tasks_created_by_priority["High"] || 0} High
          </span>
        </div>
        <div className="flex flex-col">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">{t("tasks_created")}</h3>
          <div className="flex items-end justify-between mt-2">
            <span className={cn(
              "font-bold text-text-950 transition-all mb-1",
              stats.tasks_created >= 100 ? "text-3xl" : "text-4xl"
            )}>{stats.tasks_created}</span>
            
            <div className="flex flex-col items-center justify-end gap-2 h-36 w-36">
                <div className="flex items-end gap-1 h-28 w-32 pb-1">
                    {["High", "Medium", "Low"].map((priority) => {
                        const count = stats.tasks_created_by_priority[priority] || 0;
                        const max = Math.max(...Object.values(stats.tasks_created_by_priority), 1);
                        // Reduce max height to 80% to leave room for labels
                        const height = Math.max((count / max) * 80, 15);
                        const color = priority === "High" ? "bg-red-500" : priority === "Medium" ? "bg-yellow-500" : "bg-green-500";
                        return (
                            <div key={priority} className="flex flex-col justify-end items-center w-1/3 h-full group/bar relative">
                                <div className={`w-full ${color} rounded-t-sm opacity-80 group-hover/bar:opacity-100 transition-opacity flex items-center justify-center mb-1`} style={{ height: `${height}%` }}>
                                    <span className="text-[10px] font-bold text-white/90">{count}</span>
                                </div>
                                <span className="text-[10px] text-text-secondary font-medium uppercase">{priority.slice(0, 3)}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tasks Completed */}
      <div className="bg-surface-dark rounded-2xl p-4 border border-text-950/10 shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <span className="text-xs font-medium text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full flex items-center gap-1">
             <span className="material-symbols-outlined text-[14px]">schedule</span>
             {stats.tasks_completed_avg_time.toFixed(1)}d avg
          </span>
        </div>
        <div className="flex flex-col">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">{t("tasks_completed")}</h3>
          <div className="flex items-end justify-between mt-2">
            <span className={cn(
              "font-bold text-text-950 transition-all mb-1",
              stats.tasks_completed >= 100 ? "text-3xl" : "text-4xl"
            )}>{stats.tasks_completed}</span>
            
            <div className="flex flex-col items-center justify-center gap-2 h-36 w-36 pb-4">
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-text-950/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
                  <path className="text-blue-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${Math.min(taskCompletionRate, 100)}, 100`} strokeWidth="4"></path>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-text-secondary">{taskCompletionRate}%</div>
              </div>
               <div className="flex flex-col gap-0.5 text-[10px] w-full items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span className="text-text-secondary whitespace-nowrap">Completion Rate</span>
                    </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tasks Overdue */}
      <div className="bg-surface-dark rounded-2xl p-4 border border-text-950/10 shadow-sm relative overflow-hidden group hover:border-red-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-full uppercase tracking-wide">Action Needed</span>
        </div>
        <div className="flex flex-col">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">{t("tasks_overdue")}</h3>
          <div className="flex items-end justify-between mt-2">
            <span className={cn(
              "font-bold text-text-950 transition-all mb-1",
              stats.overdue_tasks_count >= 100 ? "text-3xl" : "text-4xl"
            )}>{stats.overdue_tasks_count.toString().padStart(2, '0')}</span>
            
            <div className="flex flex-col items-center justify-center gap-2 h-36 w-36">
               {stats.overdue_tasks_count > 0 && highOverdue > 0 && onOpenCriticalModal ? (
                 <button 
                   onClick={onOpenCriticalModal}
                   className="w-24 h-24 bg-red-500 hover:bg-red-600 text-white rounded-2xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center group/btn"
                   title={t("view_critical") || "View Critical"}
                 >
                   <span className="material-symbols-outlined text-5xl group-hover/btn:scale-110 transition-transform">warning</span>
                 </button>
               ) : (
                 <div className="w-24 h-24 flex items-center justify-center">
                 </div>
               )}
               <div className="flex gap-2 text-[10px] font-medium">
                  {highOverdue > 0 && <span className="text-red-500">High: {highOverdue}</span>}
                  {mediumOverdue > 0 && <span className="text-yellow-500">Med: {mediumOverdue}</span>}
                  {lowOverdue > 0 && <span className="text-blue-500">Low: {lowOverdue}</span>}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Total Spending */}
      <div className="bg-surface-dark rounded-2xl p-4 border border-text-950/10 shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <span className="material-symbols-outlined">attach_money</span>
          </div>
          <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            {stats.roi}% ROI
          </span>
        </div>
        <div className="flex flex-col">
          <h3 className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">{t("total_spending")}</h3>
          <div className="flex items-end justify-between mt-2">
            <span className={cn(
              "font-bold text-text-950 transition-all mb-1",
              stats.total_spending >= 1000 ? "text-xl" : "text-2xl"
            )}>${stats.total_spending.toLocaleString()}</span>
            
            <div className="flex flex-col items-center justify-end gap-2 h-36 w-36">
               <div className="relative w-32 h-28 flex items-end justify-center gap-1.5 pb-1">
                   <div className="w-3 bg-emerald-500/30 h-[40%] rounded-t-sm"></div>
                   <div className="w-3 bg-emerald-500/50 h-[60%] rounded-t-sm"></div>
                   <div className="w-3 bg-emerald-500/40 h-[50%] rounded-t-sm"></div>
                   <div className="w-3 bg-emerald-500/70 h-[80%] rounded-t-sm"></div>
                   <div className="w-3 bg-emerald-500 h-[70%] rounded-t-sm"></div>
               </div>
               <div className="flex flex-col gap-0.5 text-[10px] w-full items-center">
                 <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-text-secondary truncate max-w-[100px]">
                        {topCategories.map(([cat]) => cat).slice(0, 1).join(", ")}
                    </span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* 8. Total Needed */}
      <div className="bg-surface-dark rounded-2xl p-4 border border-text-950/10 shadow-sm relative overflow-hidden group hover:border-orange-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
            <span className="material-symbols-outlined">savings</span>
          </div>
          <span className="text-xs font-medium text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full flex items-center gap-1">
             <span className="material-symbols-outlined text-[14px]">trending_flat</span>
             Forecast
          </span>
        </div>
        <div className="flex flex-col">
          <h3 className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">{t("total_needed")}</h3>
          <div className="flex items-end justify-between mt-2">
            <span className={cn(
              "font-bold text-text-950 transition-all mb-1",
              stats.forecast_needed >= 1000 ? "text-xl" : "text-2xl"
            )}>${stats.forecast_needed.toLocaleString()}</span>
            
            <div className="flex flex-col items-center justify-end gap-2 h-36 w-36">
               <div className="relative w-32 h-28 flex items-end justify-center gap-1.5 pb-1">
                   <div className="w-3 bg-orange-500/30 h-[40%] rounded-t-sm"></div>
                   <div className="w-3 bg-orange-500/50 h-[60%] rounded-t-sm"></div>
                   <div className="w-3 bg-orange-500/40 h-[50%] rounded-t-sm"></div>
                   <div className="w-3 bg-orange-500/70 h-[80%] rounded-t-sm"></div>
                   <div className="w-3 bg-orange-500 h-[70%] rounded-t-sm"></div>
               </div>
               <div className="flex flex-col gap-0.5 text-[10px] w-full items-center">
                 <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    <span className="text-text-secondary truncate max-w-[100px]">
                        High: ${stats.urgency_breakdown["High"]?.toLocaleString() ?? 0}
                    </span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
