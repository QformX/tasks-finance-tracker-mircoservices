import type { DashboardStats } from "@/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface DashboardStatsGridProps {
  stats: DashboardStats;
}

export function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  const { t } = useLanguage();

  const completedEvents = stats.tasks_completed + stats.purchases_completed;
  const pendingEvents = stats.total_events - completedEvents;
  const completionRate = stats.total_events > 0 ? Math.round((completedEvents / stats.total_events) * 100) : 0;

  const taskCompletionRate = stats.tasks_created > 0 ? Math.round((stats.tasks_completed / stats.tasks_created) * 100) : 0;

  const topCategories = Object.entries(stats.spending_by_category)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* 1. Total Events */}
      <div className="bg-surface-dark rounded-2xl p-5 border border-text-950/10 shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <span className="material-symbols-outlined">event_note</span>
          </div>
          <span className="text-xs font-medium text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            {stats.daily_stats[0]?.tasks + stats.daily_stats[0]?.purchases || 0} today
          </span>
        </div>
        <div className="flex flex-col">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">{t("total_events")}</h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-5xl font-bold text-text-950">{stats.total_events}</span>
            
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-text-950/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
                  <path className="text-blue-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${completionRate}, 100`} strokeWidth="4"></path>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-base font-bold text-text-secondary">{completionRate}%</div>
              </div>
              <div className="flex flex-col gap-1 text-xs w-full">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-text-secondary whitespace-nowrap">{completedEvents} Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-text-950/20"></span>
                  <span className="text-text-secondary whitespace-nowrap">{pendingEvents} Pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tasks Created */}
      <div className="bg-surface-dark rounded-2xl p-5 border border-text-950/10 shadow-sm relative overflow-hidden hover:border-purple-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
            <span className="material-symbols-outlined">task_alt</span>
          </div>
        </div>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">{t("tasks_created")}</h3>
            <div className="text-3xl font-bold text-text-950">{stats.tasks_created}</div>
          </div>
          <div className="flex flex-col gap-1 text-[10px] text-right">
            <div className="flex items-center justify-end gap-1"><span className="w-2 h-2 bg-red-500 rounded-sm"></span> High</div>
            <div className="flex items-center justify-end gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-sm"></span> Medium</div>
            <div className="flex items-center justify-end gap-1"><span className="w-2 h-2 bg-green-500 rounded-sm"></span> Low</div>
          </div>
        </div>
        <div className="flex items-end justify-between gap-2 h-16 mt-2">
          {["High", "Medium", "Low"].map((priority) => {
             const count = stats.tasks_created_by_priority[priority] || 0;
             const max = Math.max(...Object.values(stats.tasks_created_by_priority), 1);
             const height = Math.max((count / max) * 100, 10); // Min height 10%
             const color = priority === "High" ? "bg-red-500" : priority === "Medium" ? "bg-yellow-500" : "bg-green-500";
             
             return (
                <div key={priority} className="flex flex-col items-center gap-1 w-1/3 h-full justify-end">
                    <div className="text-xs font-bold text-text-secondary">{count}</div>
                    <div className={`w-full ${color} rounded-t-sm opacity-90`} style={{ height: `${height}%` }}></div>
                </div>
             );
          })}
        </div>
      </div>

      {/* 3. Tasks Completed */}
      <div className="bg-surface-dark rounded-2xl p-5 border border-text-950/10 shadow-sm relative overflow-hidden hover:border-blue-400/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <span className="text-xs font-medium text-text-secondary capitalize">{stats.period}</span>
        </div>
        <div className="flex justify-between items-end mb-2">
          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">{t("tasks_completed")}</h3>
            <div className="text-3xl font-bold text-text-950">{stats.tasks_completed}</div>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-secondary">Progress</span>
            <span className="font-bold text-text-950">{taskCompletionRate}%</span>
          </div>
          <div className="w-full bg-text-950/10 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${taskCompletionRate}%` }}></div>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center text-xs">
          <span className="text-text-secondary">Avg. Time: <span className="text-text-950 font-semibold">{stats.tasks_completed_avg_time.toFixed(1)} days</span></span>
        </div>
      </div>

      {/* 4. Tasks Overdue */}
      <div className="bg-red-500/5 rounded-2xl p-5 border border-red-500/20 shadow-sm relative overflow-hidden group hover:border-red-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-full uppercase tracking-wide">Action Needed</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">{t("tasks_overdue")}</h3>
            <div className="text-4xl font-bold text-red-500">{stats.overdue_tasks_count.toString().padStart(2, '0')}</div>
          </div>
          <div className="relative w-20 h-12 overflow-hidden flex justify-center">
             {/* Simple visual for urgency */}
             <span className="material-symbols-outlined text-4xl text-red-500/50">priority_high</span>
          </div>
        </div>
        <p className="text-xs text-red-400 mb-4 text-right">Requires immediate<br/>attention</p>
        <div className="flex justify-between items-end border-t border-red-500/20 pt-3">
          <div className="text-xs text-red-400 font-medium">
            <div className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span> {stats.overdue_tasks_count} Critical</div>
          </div>
        </div>
      </div>

      {/* 5. Purchases Created */}
      <div className="bg-surface-dark rounded-2xl p-5 border border-text-950/10 shadow-sm relative overflow-hidden hover:border-indigo-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <span className="material-symbols-outlined">shopping_cart</span>
          </div>
          <span className="text-xs font-medium text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded-full">+{stats.purchases_pending_count} Pending</span>
        </div>
        <div className="mb-4 text-right">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 text-left">{t("purchases_created")}</h3>
          <div className="text-3xl font-bold text-text-950">{stats.purchases_created}</div>
        </div>
        <div className="flex items-end justify-between">
           {/* Simplified chart */}
           <div className="flex flex-col items-center w-1/3 space-y-0.5">
                <div className="w-full bg-indigo-400 h-6 text-[9px] text-white flex items-center justify-center font-bold opacity-50"></div>
                <div className="w-[80%] bg-indigo-500 h-6 text-[9px] text-white flex items-center justify-center font-bold opacity-70"></div>
                <div className="w-[60%] bg-indigo-600 h-4 text-[9px] text-white flex items-center justify-center font-bold"></div>
            </div>
          <div className="flex flex-col w-2/3 pl-2">
            <div className="text-[10px] text-text-secondary leading-tight mb-2 text-right">
                New requests<br/>this {stats.period}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Purchases Completed */}
      <div className="bg-surface-dark rounded-2xl p-5 border border-text-950/10 shadow-sm relative overflow-hidden hover:border-amber-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <span className="material-symbols-outlined">shopping_bag</span>
          </div>
          <span className="text-xs font-medium text-text-secondary flex items-center gap-1"><span className="material-symbols-outlined text-xs">schedule</span> Avg {stats.purchases_completed_avg_time.toFixed(1)} days</span>
        </div>
        <div className="mb-2">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">{t("purchases_completed")}</h3>
          <div className="text-3xl font-bold text-text-950 text-right">{stats.purchases_completed}</div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-amber-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="40, 100" strokeWidth="5"></path>
              <path className="text-blue-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="30, 100" strokeDashoffset="-40" strokeWidth="5"></path>
            </svg>
          </div>
          <div className="w-full">
            <span className="text-[10px] text-green-500 bg-green-500/10 px-2 py-1 rounded block w-fit mb-2 ml-auto">Processing<br/>efficient</span>
          </div>
        </div>
        <div className="flex justify-between items-end mt-2">
          <div className="text-xs text-text-secondary">
             Categories:<br/>
             <span className="text-text-950 font-medium">
                {topCategories.map(([cat]) => cat).join(", ")}
             </span>
          </div>
        </div>
      </div>

      {/* 7. Total Spending */}
      <div className="bg-emerald-500/5 rounded-2xl p-5 border border-emerald-500/20 shadow-sm relative overflow-hidden hover:border-emerald-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <span className="material-symbols-outlined">attach_money</span>
          </div>
          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">trending_up</span> {stats.roi}% ROI
          </span>
        </div>
        <div className="mb-2 text-right">
          <div className="text-[10px] text-emerald-500 mb-1">Within expected<br/>range</div>
        </div>
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">{t("total_spending")}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">${stats.total_spending.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex justify-between items-end border-t border-emerald-500/20 pt-2">
          <div className="text-xs text-emerald-600 dark:text-emerald-400">
             Top Categories:<br/>
             <span className="font-medium">
                {topCategories.map(([cat, cost]) => `$${cost.toLocaleString()} ${cat}`).join(", ")}
             </span>
          </div>
        </div>
      </div>

      {/* 8. Total Needed */}
      <div className="bg-orange-500/5 rounded-2xl p-5 border border-orange-500/20 shadow-sm relative overflow-hidden hover:border-orange-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
            <span className="material-symbols-outlined">savings</span>
          </div>
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full">Forecast</span>
        </div>
        <div className="mb-4 text-right relative z-10">
          <div className="text-[10px] text-orange-500 mb-1">Estimated for next<br/>week</div>
        </div>
        <div className="mb-4 relative z-10">
          <h3 className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">{t("total_needed")}</h3>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-orange-700 dark:text-orange-300">${stats.forecast_needed.toLocaleString()}</span>
            <span className="material-symbols-outlined text-orange-300 dark:text-orange-700">calendar_month</span>
          </div>
        </div>
        <div className="w-full h-3 flex rounded-full overflow-hidden mb-4 bg-orange-500/20">
          <div className="bg-red-500 w-1/3"></div>
          <div className="bg-orange-500 w-1/2"></div>
          <div className="bg-transparent w-1/6"></div>
        </div>
        <div className="flex justify-between items-end border-t border-orange-500/20 pt-2 relative z-10">
          <div className="text-xs text-orange-600 dark:text-orange-400">
             Urgency:<br/>
             <span className="font-medium">${stats.urgency_breakdown["High"]?.toLocaleString() ?? 0} High</span>
          </div>
        </div>
      </div>
    </div>
  );
}
