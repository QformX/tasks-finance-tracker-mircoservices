import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardStats, getRecentEvents, getActivityHeatmap, getTasks, getPurchases, getCategories, getBoughtPurchaseIds } from "@/lib/api";
import type { DashboardStats, AnalyticsEvent, ActivityHeatmap, Task, Purchase, Category } from "@/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

export function Analytics() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
  const [heatmap, setHeatmap] = useState<ActivityHeatmap | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [todayPurchases, setTodayPurchases] = useState<Purchase[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allBoughtPurchases, setAllBoughtPurchases] = useState<Purchase[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [totalNeeded, setTotalNeeded] = useState(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("week");

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsData, eventsData, heatmapData, allTasks, activePurchasesList, categoriesData, boughtPurchasesList, boughtIds] = await Promise.all([
        getDashboardStats(period),
        getRecentEvents(20),
        getActivityHeatmap(period === "week" || period === "today" ? 7 : period === "month" ? 30 : 365),
        getTasks("all"),
        getPurchases(false),
        getCategories(),
        getPurchases(true),
        getBoughtPurchaseIds(period)
      ]);
      
      setCategories(categoriesData);
      
      // Filter bought purchases for the period
      const periodBoughtPurchases = boughtPurchasesList.filter(p => boughtIds.includes(p.id));
      setAllBoughtPurchases(periodBoughtPurchases);

      // Calculate overdue tasks
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const overdue = allTasks.filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < now && !t.due_date.startsWith(todayStr));
      setOverdueCount(overdue.length);

      // Calculate total needed for active purchases
      const needed = activePurchasesList.reduce((acc, p) => acc + ((p.cost || 0) * p.quantity), 0);
      setTotalNeeded(needed);

      if (period === "today") {
          const tasks = await getTasks("today");
          setTodayTasks(tasks);
          // We don't need to set todayPurchases manually anymore as we use stats for sums
          // But we need it for the "No items" check if we want to keep it consistent
          // Or we can use stats counts
      }

      setStats(statsData);
      setRecentEvents(eventsData.events);
      setHeatmap(heatmapData);
    } catch (error) {
      console.error("Failed to load analytics data", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        {t("loading_analytics")}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        {t("failed_analytics")}
      </div>
    );
  }

  const completedPurchases = recentEvents.filter(e => e.event_type === "PurchaseCompleted");
  const createdPurchases = recentEvents.filter(e => e.event_type === "PurchaseCreated");

  return (
    <div className="flex-1 overflow-y-auto w-full bg-background-dark">
      <div className="w-full max-w-7xl mx-auto flex flex-col p-8 gap-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-1 whitespace-nowrap shrink-0">{t("dashboard_overview")}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-surface-dark p-1 rounded-lg border border-border-dark">
              {(["today", "week", "month", "year"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-md transition-all capitalize",
                    period === p 
                      ? "bg-border-dark text-white shadow-sm" 
                      : "text-text-secondary hover:text-white"
                  )}
                >
                  {t(p)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-full text-xs font-medium text-gray-300 cursor-default">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* KPI Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard 
            icon="event_note" 
            label={t("total_events")} 
            value={stats?.total_events.toString() ?? "0"} 
            trend="" 
            color="indigo" 
          />
          <StatCard 
            icon="add_task" 
            label={t("tasks_created")} 
            value={stats?.tasks_created.toString() ?? "0"} 
            trend="" 
            color="indigo" 
          />
          <StatCard 
            icon="task_alt" 
            label={t("tasks_completed")} 
            value={stats?.tasks_completed.toString() ?? "0"} 
            trend="" 
            color="indigo" 
          />
           <StatCard 
            icon="warning" 
            label={t("tasks_overdue")} 
            value={overdueCount.toString()} 
            trend="" 
            color="red" 
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon="shopping_cart" 
            label={t("purchases_created")} 
            value={stats?.purchases_created.toString() ?? "0"} 
            trend="" 
            color="indigo" 
          />
          <StatCard 
            icon="local_mall" 
            label={t("purchases_completed")} 
            value={stats?.purchases_completed.toString() ?? "0"} 
            trend="" 
            color="indigo" 
          />
          <StatCard 
            icon="attach_money" 
            label={t("total_spending")} 
            value={`$${stats?.total_spending.toLocaleString() ?? 0}`} 
            trend="" 
            color="indigo" 
          />
           <StatCard 
            icon="savings" 
            label={t("total_needed")} 
            value={`$${totalNeeded.toLocaleString()}`} 
            trend="" 
            color="blue" 
          />
        </div>

        {/* Heatmap & Spending Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            <div className="lg:col-span-8 flex flex-col gap-6">
                {period === "today" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                        {/* Tasks Progress */}
                        <div className="bg-surface-dark rounded-2xl border border-border-dark p-6 flex flex-col min-h-[200px]">
                            <h3 className="text-base font-bold text-white mb-6">{t("todays_tasks")}</h3>
                            <div className="flex-1 flex flex-col items-center justify-center w-full">
                                {todayTasks.length > 0 ? (
                                    <>
                                        <div 
                                            className="relative w-48 h-48 rounded-full mb-6" 
                                            style={{ 
                                                background: `conic-gradient(#7e22ce 0% ${Math.round((todayTasks.filter(t => t.is_completed).length / todayTasks.length) * 100)}%, #27272a ${Math.round((todayTasks.filter(t => t.is_completed).length / todayTasks.length) * 100)}% 100%)` 
                                            }}
                                        >
                                            <div className="absolute inset-0 m-8 bg-surface-dark rounded-full flex flex-col items-center justify-center shadow-inner">
                                                <span className="text-3xl font-bold text-white">
                                                    {Math.round((todayTasks.filter(t => t.is_completed).length / todayTasks.length) * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                                                    <span className="text-gray-300">{t("completed")}</span>
                                                </div>
                                                <span className="font-semibold text-white">{todayTasks.filter(t => t.is_completed).length}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-[#27272a]"></div>
                                                    <span className="text-gray-300">{t("remaining")}</span>
                                                </div>
                                                <span className="font-semibold text-white">{todayTasks.length - todayTasks.filter(t => t.is_completed).length}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-text-secondary">{t("no_tasks_today")}</div>
                                )}
                            </div>
                        </div>

                        {/* Purchases Progress */}
                        <div className="bg-surface-dark rounded-2xl border border-border-dark p-6 flex flex-col min-h-[200px]">
                            <h3 className="text-base font-bold text-white mb-6">{t("shopping_list")}</h3>
                            <div className="flex-1 flex flex-col items-center justify-center">
                                {(stats?.purchases_created || 0) > 0 || (stats?.purchases_completed || 0) > 0 ? (
                                    <div className="flex items-center gap-8 w-full justify-around">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                                <span className="material-symbols-outlined">add_shopping_cart</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-2xl font-bold text-white">
                                                    ${(stats?.total_created_cost || 0).toLocaleString()}
                                                </span>
                                                <span className="text-xs text-text-secondary uppercase tracking-wider font-bold">Created</span>
                                            </div>
                                        </div>
                                        <div className="w-px h-16 bg-white/10"></div>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                <span className="material-symbols-outlined">shopping_cart_checkout</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-2xl font-bold text-white">
                                                    ${(stats?.total_spending || 0).toLocaleString()}
                                                </span>
                                                <span className="text-xs text-text-secondary uppercase tracking-wider font-bold">Spent</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-text-secondary">{t("no_items_in_shopping_list")}</div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-surface-dark rounded-2xl border border-border-dark p-6 h-full">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-base font-bold text-white">{t("activity_heatmap")}</h3>
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                                <span>{t("less")}</span>
                                <div className="flex gap-1">
                                    <div className="w-3 h-3 rounded-sm bg-[#27272a]"></div>
                                    <div className="w-3 h-3 rounded-sm bg-primary/30"></div>
                                    <div className="w-3 h-3 rounded-sm bg-primary/60"></div>
                                    <div className="w-3 h-3 rounded-sm bg-primary"></div>
                                </div>
                                <span>{t("more")}</span>
                            </div>
                        </div>
                        <div className="w-full overflow-x-auto pb-2">
                            {heatmap && <HeatmapGrid heatmap={heatmap} period={period} />}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="lg:col-span-4 bg-surface-dark rounded-2xl border border-border-dark p-6 flex flex-col">
                <SpendingByCategory purchases={allBoughtPurchases} categories={categories} />
            </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Active Tasks */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">{t("recent_tasks")}</h3>
                <Link to="/tasks" className="text-sm text-primary hover:text-primary-dark font-medium cursor-pointer">{t("view_all")}</Link>
              </div>
              <div className="space-y-3">
                {recentEvents.filter(e => e.event_type.includes("Task")).slice(0, 5).map(event => (
                  <TaskEventItem key={event.id} event={event} />
                ))}
                {recentEvents.filter(e => e.event_type.includes("Task")).length === 0 && (
                  <div className="text-text-secondary text-sm text-center py-4 bg-surface-dark rounded-xl border border-border-dark">{t("no_recent_tasks")}</div>
                )}
              </div>
            </div>
            
            {/* Created Purchases List (Shopping List) */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Shopping List (Created)</h3>
                <Link to="/purchases" className="text-sm text-primary hover:text-primary-dark font-medium cursor-pointer">View All</Link>
              </div>
              <div className="space-y-3">
                {createdPurchases.slice(0, 5).map(event => (
                  <PurchaseEventItem key={event.id} event={event} />
                ))}
                {createdPurchases.length === 0 && (
                  <div className="text-text-secondary text-sm text-center py-4 bg-surface-dark rounded-xl border border-border-dark">No items in shopping list</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Productivity & Purchases */}
          <div className="space-y-6">
            {/* Event Distribution */}
            <div className="bg-surface-dark rounded-2xl border border-border-dark p-6">
              <h3 className="text-base font-bold text-white mb-6">{t("event_distribution")}</h3>
              <div className="space-y-4">
                  <DistributionBar 
                    label={t("tasks")} 
                    value={stats ? stats.tasks_created + stats.tasks_completed : 0} 
                    total={stats?.total_events || 1} 
                    color="bg-pink-500" 
                  />
                  <DistributionBar 
                    label={t("purchases")} 
                    value={stats ? stats.purchases_created + stats.purchases_completed : 0} 
                    total={stats?.total_events || 1} 
                    color="bg-indigo-500" 
                  />
              </div>
            </div>

            {/* Recent Purchases (Completed Only) */}
            <div className="bg-surface-dark rounded-2xl border border-border-dark p-6">
              <h2 className="text-lg font-bold text-white mb-6">{t("recent_purchases_bought")}</h2>
              <ul className="space-y-5">
                {completedPurchases.slice(0, 5).map(event => (
                  <PurchaseEventItem key={event.id} event={event} />
                ))}
                {completedPurchases.length === 0 && (
                  <div className="text-text-secondary text-sm text-center">{t("no_recent_purchases")}</div>
                )}
              </ul>
              <Link to="/purchases" className="block w-full mt-6 py-2.5 border border-border-dark rounded-lg text-xs font-semibold text-gray-400 hover:bg-border-dark hover:text-white transition-colors text-center">
                {t("view_all_history")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpendingByCategory({ purchases, categories }: { purchases: Purchase[], categories: Category[] }) {
    const { t } = useLanguage();
    
    const categorySpending = purchases.reduce((acc, p) => {
        const catId = p.category_id || "uncategorized";
        const cost = (p.cost || 0) * p.quantity;
        acc[catId] = (acc[catId] || 0) + cost;
        return acc;
    }, {} as Record<string, number>);

    const totalSpending = Object.values(categorySpending).reduce((a, b) => a + b, 0);

    // Default palette
    const palette = ["#8B5CF6", "#A78BFA", "#C4B5FD", "#4B5563", "#EC4899", "#F59E0B", "#10B981"];

    const spendingData = Object.entries(categorySpending).map(([catId, amount], index) => {
        const category = categories.find(c => c.id === catId);
        return {
            id: catId,
            name: category?.title || t("uncategorized") || "Uncategorized",
            color: category?.color || palette[index % palette.length],
            amount,
            percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0
        };
    }).sort((a, b) => b.amount - a.amount);

    // Generate conic gradient string
    let currentAngle = 0;
    const gradientParts = spendingData.map(item => {
        const start = currentAngle;
        const end = currentAngle + item.percentage;
        currentAngle = end;
        return `${item.color} ${start}% ${end}%`;
    });
    
    const gradient = gradientParts.length > 0 
        ? `conic-gradient(${gradientParts.join(", ")})`
        : "conic-gradient(#27272a 0% 100%)";

    return (
        <>
            <h3 className="text-base font-bold text-white mb-6 self-start">{t("spending_breakdown") || "Spending Breakdown"}</h3>
            <div className="flex flex-col items-center justify-center flex-1 w-full">
                <div className="relative w-48 h-48 rounded-full mb-6" style={{ background: gradient }}>
                    <div className="absolute inset-0 m-8 bg-surface-dark rounded-full flex flex-col items-center justify-center shadow-inner">
                        <span className="text-xs text-text-secondary">{t("total") || "Total"}</span>
                        <span className="text-xl font-bold text-white">${totalSpending.toLocaleString()}</span>
                    </div>
                </div>
                <div className="w-full space-y-3">
                    {spendingData.slice(0, 4).map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className="text-gray-300">{item.name}</span>
                            </div>
                            <span className="font-semibold text-white">{Math.round(item.percentage)}%</span>
                        </div>
                    ))}
                    {spendingData.length > 4 && (
                        <div className="text-center text-xs text-text-secondary pt-2">
                            + {spendingData.length - 4} {t("more_categories") || "more"}
                        </div>
                    )}
                    {spendingData.length === 0 && (
                        <div className="text-center text-text-secondary text-sm">{t("no_spending_data") || "No spending data"}</div>
                    )}
                </div>
            </div>
        </>
    );
}

function StatCard({ icon, label, value, trend, color }: { icon: string, label: string, value: string, trend: string, color: "indigo" | "pink" | "amber" | "emerald" | "red" | "blue" }) {
  const colors = {
    indigo: "text-indigo-400 bg-indigo-400/10",
    pink: "text-pink-400 bg-pink-400/10",
    amber: "text-amber-400 bg-amber-400/10",
    emerald: "text-emerald-400 bg-emerald-400/10",
    red: "text-red-400 bg-red-400/10",
    blue: "text-blue-400 bg-blue-400/10",
  };

  const trendColor = trend.startsWith("+") ? "text-green-400 bg-green-500/10 border-green-500/10" : "text-gray-400 bg-white/5 border-white/5";

  return (
    <div className="bg-surface-dark rounded-2xl p-6 border border-border-dark relative overflow-hidden group hover:border-primary/50 transition-colors">
      <div className="flex justify-between items-start mb-6">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors[color])}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border", trendColor)}>
          {trend}
        </span>
      </div>
      <div>
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">{label}</p>
        <h3 className="text-3xl font-bold text-white">{value}</h3>
      </div>
    </div>
  );
}

function TaskEventItem({ event }: { event: AnalyticsEvent }) {
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

function PurchaseEventItem({ event }: { event: AnalyticsEvent }) {
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

function DistributionBar({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
    const percentage = Math.round((value / total) * 100);
    return (
        <div>
            <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300">{label}</span>
                <span className="text-text-secondary">{value} ({percentage}%)</span>
            </div>
            <div className="w-full h-2 bg-[#27272a] rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", color)} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    )
}

function HeatmapGrid({ heatmap, period }: { heatmap: ActivityHeatmap, period: string }) {
  if (!heatmap || heatmap.heatmap.length === 0) return null;

  const maxActivity = Math.max(...heatmap.heatmap.map(d => d.activity), 1);
  
  if (period === "year") {
      // GitHub style heatmap
      // We need to group by week
      const weeks: Array<Array<{date: string, activity: number}>> = [];
      let currentWeek: Array<{date: string, activity: number}> = [];
      
      // Pad start to align with Sunday/Monday
      const startDate = new Date(heatmap.heatmap[0].date);
      const dayOfWeek = startDate.getDay(); // 0 = Sunday
      
      // Add empty placeholders for days before start date in the first week
      for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push({ date: `empty-${i}`, activity: -1 });
      }
      
      heatmap.heatmap.forEach(day => {
          currentWeek.push(day);
          if (currentWeek.length === 7) {
              weeks.push(currentWeek);
              currentWeek = [];
          }
      });
      if (currentWeek.length > 0) weeks.push(currentWeek);

      return (
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex gap-1 min-w-max overflow-x-auto pb-2">
              {weeks.map((week, wIndex) => (
                  <div key={wIndex} className="flex flex-col gap-0.5">
                      {week.map((day, dIndex) => {
                          if (day.activity === -1) return <div key={day.date} className="w-2.5 h-2.5" />;
                          
                          const intensity = day.activity === 0 ? 0 : Math.ceil((day.activity / maxActivity) * 4);
                          const bgClass = [
                              "bg-[#27272a]", // 0
                              "bg-primary/30", // 1
                              "bg-primary/50", // 2
                              "bg-primary/70", // 3
                              "bg-primary",    // 4
                          ][Math.min(intensity, 4)];

                          return (
                              <div 
                                  key={day.date} 
                                  className={cn("w-2.5 h-2.5 rounded-[1px] transition-colors", bgClass)}
                                  title={`${day.date}: ${day.activity} events`}
                              />
                          );
                      })}
                  </div>
              ))}
          </div>
          
          {/* Activity Direction Chart (Cross/Radar style) */}
          <div className="flex-1 w-full min-w-[200px] flex flex-col items-center justify-center bg-surface-dark/50 rounded-xl p-4 border border-white/5">
             <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Activity Direction</h4>
             <div className="relative w-48 h-48">
                {/* Axis Lines */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10 -translate-x-1/2"></div>
                <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10 -translate-y-1/2"></div>
                
                {/* Labels */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 text-[10px] text-text-secondary font-medium">Tasks Created</div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 text-[10px] text-text-secondary font-medium">Tasks Completed</div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 text-[10px] text-text-secondary font-medium text-right w-20">Purchases Created</div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-2 text-[10px] text-text-secondary font-medium w-20">Purchases Bought</div>

                {/* Data Points (Mocked for now as we don't have granular breakdown in heatmap data, using stats if available or random for visual) */}
                {/* Note: In a real scenario, we'd need 'stats' passed to this component or derived from a more detailed heatmap API */}
                <div className="absolute inset-0">
                    <svg className="w-full h-full overflow-visible">
                        <polygon 
                            points="96,24 168,96 96,168 24,96" 
                            fill="rgba(124, 58, 237, 0.2)" 
                            stroke="#7c3aed" 
                            strokeWidth="2"
                            className="animate-in fade-in duration-1000"
                        />
                        <circle cx="96" cy="24" r="3" fill="#7c3aed" />
                        <circle cx="168" cy="96" r="3" fill="#7c3aed" />
                        <circle cx="96" cy="168" r="3" fill="#7c3aed" />
                        <circle cx="24" cy="96" r="3" fill="#7c3aed" />
                    </svg>
                </div>
             </div>
          </div>
        </div>
      );
  }

  // Default / Week / Month view (Bar chart style but nicer)
  const displayData = heatmap.heatmap.slice(-(period === "week" ? 7 : 30));
  
  return (
    <div className="h-40 flex items-end justify-between gap-2 px-2">
      {displayData.map((day, i) => {
        const height = (day.activity / maxActivity) * 100;
        const isMax = day.activity === maxActivity && maxActivity > 0;
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return (
          <div key={day.date} className="w-full flex flex-col items-center gap-2 h-full justify-end group">
            <div 
              className={cn(
                "w-full rounded-t-sm relative transition-all duration-300 min-w-[4px]",
                isMax 
                  ? "bg-primary hover:bg-primary-dark shadow-[0_0_15px_rgba(124,58,237,0.3)]" 
                  : "bg-[#27272a] hover:bg-[#3f3f46]"
              )}
              style={{ height: `${Math.max(height, 10)}%` }}
              title={`${day.date}: ${day.activity} events`}
            />
            <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-bold text-text-secondary group-hover:text-white transition-colors">{dayName}</span>
                <span className="text-[9px] text-text-secondary/70 group-hover:text-white/70 transition-colors">{dateStr}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
