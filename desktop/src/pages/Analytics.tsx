import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardStats, getRecentEvents, getActivityHeatmap, getTasks, getPurchases } from "@/lib/api";
import type { DashboardStats, AnalyticsEvent, ActivityHeatmap, Task, Purchase } from "@/types";
import { cn } from "@/lib/utils";

export function Analytics() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
  const [heatmap, setHeatmap] = useState<ActivityHeatmap | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [todayPurchases, setTodayPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("week");

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsData, eventsData, heatmapData] = await Promise.all([
        getDashboardStats(period === "today" ? "week" : period), // Backend doesn't support "today" for stats yet, fallback to week
        getRecentEvents(20), // Fetch more to filter client-side
        getActivityHeatmap(period === "week" || period === "today" ? 7 : period === "month" ? 30 : 365)
      ]);
      
      if (period === "today") {
          const [tasks, activePurchases, boughtPurchases] = await Promise.all([
            getTasks("today"),
            getPurchases(false),
            getPurchases(true)
          ]);
          setTodayTasks(tasks);
          setTodayPurchases([...activePurchases, ...boughtPurchases]);
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
        Loading analytics...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        Failed to load analytics.
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
            <h2 className="text-2xl font-bold text-white mb-1">Dashboard Overview</h2>
            <p className="text-sm text-text-secondary">Welcome back, here's what's happening today.</p>
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
                  {p}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            icon="shopping_bag" 
            label="Total Spending" 
            value={`$${stats?.total_spending.toLocaleString() ?? 0}`} 
            trend="" 
            color="indigo" 
          />
          <StatCard 
            icon="check_circle" 
            label="Tasks Completed" 
            value={stats?.tasks_completed.toString() ?? "0"} 
            trend="" 
            color="pink" 
          />
          <StatCard 
            icon="pending_actions" 
            label="Tasks Created" 
            value={stats?.tasks_created.toString() ?? "0"} 
            trend="" 
            color="amber" 
          />
           <StatCard 
            icon="event" 
            label="Total Events" 
            value={stats?.total_events.toString() ?? "0"} 
            trend="" 
            color="emerald" 
          />
        </div>

        {/* Heatmap / Today's Progress Section */}
        {period === "today" ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Tasks Progress */}
                 <div className="bg-surface-dark rounded-2xl border border-border-dark p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <h3 className="text-base font-bold text-white mb-6 self-start">Today's Tasks</h3>
                    {todayTasks.length > 0 ? (
                        <div className="flex items-center gap-8">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                 <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="56" stroke="#27272a" strokeWidth="12" fill="transparent" />
                                    <circle 
                                        cx="64" cy="64" r="56" 
                                        stroke="#7e22ce" 
                                        strokeWidth="12" 
                                        fill="transparent" 
                                        strokeDasharray={351.86} 
                                        strokeDashoffset={351.86 - (351.86 * (todayTasks.filter(t => t.is_completed).length / todayTasks.length))} 
                                        className="transition-all duration-1000 ease-out"
                                    />
                                 </svg>
                                 <span className="absolute text-2xl font-bold text-white">
                                     {Math.round((todayTasks.filter(t => t.is_completed).length / todayTasks.length) * 100)}%
                                 </span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                                    <span className="text-sm text-gray-300">{todayTasks.filter(t => t.is_completed).length} Completed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-[#27272a]"></div>
                                    <span className="text-sm text-gray-300">{todayTasks.length - todayTasks.filter(t => t.is_completed).length} Remaining</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-text-secondary">No tasks assigned for today.</div>
                    )}
                 </div>

                 {/* Purchases Progress */}
                 <div className="bg-surface-dark rounded-2xl border border-border-dark p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <h3 className="text-base font-bold text-white mb-6 self-start">Shopping List</h3>
                    {todayPurchases.length > 0 ? (
                        <div className="flex items-center gap-8">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                 <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="56" stroke="#27272a" strokeWidth="12" fill="transparent" />
                                    <circle 
                                        cx="64" cy="64" r="56" 
                                        stroke="#10b981" 
                                        strokeWidth="12" 
                                        fill="transparent" 
                                        strokeDasharray={351.86} 
                                        strokeDashoffset={351.86 - (351.86 * (todayPurchases.filter(p => p.is_bought).length / todayPurchases.length))} 
                                        className="transition-all duration-1000 ease-out"
                                    />
                                 </svg>
                                 <span className="absolute text-2xl font-bold text-white">
                                     {Math.round((todayPurchases.filter(p => p.is_bought).length / todayPurchases.length) * 100)}%
                                 </span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                    <span className="text-sm text-gray-300">{todayPurchases.filter(p => p.is_bought).length} Bought</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-[#27272a]"></div>
                                    <span className="text-sm text-gray-300">{todayPurchases.length - todayPurchases.filter(p => p.is_bought).length} To Buy</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-text-secondary">No items in shopping list.</div>
                    )}
                 </div>
             </div>
        ) : (
            <div className="bg-surface-dark rounded-2xl border border-border-dark p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-white">Activity Heatmap</h3>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-sm bg-[#27272a]"></div>
                            <div className="w-3 h-3 rounded-sm bg-primary/30"></div>
                            <div className="w-3 h-3 rounded-sm bg-primary/60"></div>
                            <div className="w-3 h-3 rounded-sm bg-primary"></div>
                        </div>
                        <span>More</span>
                    </div>
                </div>
                <div className="w-full overflow-x-auto pb-2">
                    {heatmap && <HeatmapGrid heatmap={heatmap} period={period} />}
                </div>
            </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Active Tasks */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Recent Tasks</h3>
                <Link to="/tasks" className="text-sm text-primary hover:text-primary-dark font-medium cursor-pointer">View All</Link>
              </div>
              <div className="space-y-3">
                {recentEvents.filter(e => e.event_type.includes("Task")).slice(0, 5).map(event => (
                  <TaskEventItem key={event.id} event={event} />
                ))}
                {recentEvents.filter(e => e.event_type.includes("Task")).length === 0 && (
                  <div className="text-text-secondary text-sm text-center py-4 bg-surface-dark rounded-xl border border-border-dark">No recent tasks</div>
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
              <h3 className="text-base font-bold text-white mb-6">Event Distribution</h3>
              <div className="space-y-4">
                  <DistributionBar 
                    label="Tasks" 
                    value={stats ? stats.tasks_created + stats.tasks_completed : 0} 
                    total={stats?.total_events || 1} 
                    color="bg-pink-500" 
                  />
                  <DistributionBar 
                    label="Purchases" 
                    value={stats ? stats.purchases_created + stats.purchases_completed : 0} 
                    total={stats?.total_events || 1} 
                    color="bg-indigo-500" 
                  />
              </div>
            </div>

            {/* Recent Purchases (Completed Only) */}
            <div className="bg-surface-dark rounded-2xl border border-border-dark p-6">
              <h2 className="text-lg font-bold text-white mb-6">Recent Purchases (Bought)</h2>
              <ul className="space-y-5">
                {completedPurchases.slice(0, 5).map(event => (
                  <PurchaseEventItem key={event.id} event={event} />
                ))}
                {completedPurchases.length === 0 && (
                  <div className="text-text-secondary text-sm text-center">No recent purchases</div>
                )}
              </ul>
              <Link to="/purchases" className="block w-full mt-6 py-2.5 border border-border-dark rounded-lg text-xs font-semibold text-gray-400 hover:bg-border-dark hover:text-white transition-colors text-center">
                View All History
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color }: { icon: string, label: string, value: string, trend: string, color: "indigo" | "pink" | "amber" | "emerald" }) {
  const colors = {
    indigo: "text-indigo-400 bg-indigo-400/10",
    pink: "text-pink-400 bg-pink-400/10",
    amber: "text-amber-400 bg-amber-400/10",
    emerald: "text-emerald-400 bg-emerald-400/10",
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
        <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">{label}</p>
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

  // Determine grid size based on period
  // Week: 1 row, 7 cols
  // Month: ~5 rows, 7 cols (calendar view) or 1 row 30 cols
  // Year: 7 rows (days), 52 cols (weeks) - GitHub style
  
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

      // Transpose for rendering: 7 rows (days), N cols (weeks)
      const rows = Array.from({ length: 7 }, (_, i) => i);

      return (
          <div className="flex gap-1 min-w-max">
              {weeks.map((week, wIndex) => (
                  <div key={wIndex} className="flex flex-col gap-1">
                      {week.map((day, dIndex) => {
                          if (day.activity === -1) return <div key={day.date} className="w-3 h-3" />;
                          
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
                                  className={cn("w-3 h-3 rounded-sm transition-colors", bgClass)}
                                  title={`${day.date}: ${day.activity} events`}
                              />
                          );
                      })}
                  </div>
              ))}
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
          </div>
        );
      })}
    </div>
  );
}
