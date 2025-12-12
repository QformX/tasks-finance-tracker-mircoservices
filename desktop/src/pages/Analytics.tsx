import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardStats, getRecentEvents, getActivityHeatmap, getTasks, getPurchases, getCategories, getBoughtPurchaseIds } from "@/lib/api";
import type { DashboardStats, AnalyticsEvent, ActivityHeatmap, Task, Purchase, Category } from "@/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { StatCard } from "@/components/StatCard";
import { DistributionBar } from "@/components/DistributionBar";
import { HeatmapGrid } from "@/components/analytics/HeatmapGrid";
import { ActivityDirectionChart } from "@/components/analytics/ActivityDirectionChart";
import { SpendingByCategory } from "@/components/analytics/SpendingByCategory";
import { TaskEventItem, PurchaseEventItem } from "@/components/analytics/EventItems";

export function Analytics() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
  const [heatmap, setHeatmap] = useState<ActivityHeatmap | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allBoughtPurchases, setAllBoughtPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("week");

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsData, eventsData, heatmapData, categoriesData, boughtPurchasesList, boughtIds] = await Promise.all([
        getDashboardStats(period),
        getRecentEvents(20),
        getActivityHeatmap(period === "week" || period === "today" ? 7 : period === "month" ? 30 : 365),
        getCategories(),
        getPurchases(true),
        getBoughtPurchaseIds(period)
      ]);
      
      setCategories(categoriesData);
      
      // Filter bought purchases for the period
      const periodBoughtPurchases = boughtPurchasesList.filter(p => boughtIds.includes(p.id));
      setAllBoughtPurchases(periodBoughtPurchases);

      if (period === "today") {
          const tasks = await getTasks("today");
          setTodayTasks(tasks);
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
            value={stats?.overdue_tasks_count.toString() ?? "0"} 
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
            value={`$${stats?.total_incomplete_purchases_cost.toLocaleString() ?? 0}`} 
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
                    <>
                        <div className="bg-surface-dark rounded-2xl border border-border-dark p-6 flex flex-col">
                            <div className="flex items-center justify-between mb-6 shrink-0">
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
                            <div className="w-full overflow-x-auto pb-2 min-h-0">
                                {heatmap && <HeatmapGrid heatmap={heatmap} period={period} />}
                            </div>
                        </div>

                        <div className="bg-surface-dark rounded-2xl border border-border-dark p-6 flex flex-col">
                             <ActivityDirectionChart stats={stats} />
                        </div>
                    </>
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
