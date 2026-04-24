import type { DashboardStats } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface ProductivityInsightsProps {
  stats: DashboardStats | null;
}

export function ProductivityInsights({ stats }: ProductivityInsightsProps) {
  const { t } = useLanguage();

  if (!stats) return null;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 || 12;
    return `${h} ${period}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Current Streak */}
      <div className="bg-surface-dark rounded-2xl border border-text-950/10 p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="material-symbols-outlined text-8xl text-orange-500">local_fire_department</span>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <span className="material-symbols-outlined text-orange-500 text-xl">local_fire_department</span>
            </div>
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Current Streak</h3>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-bold text-text-950">{stats.current_streak}</span>
            <span className="text-text-secondary ml-2 font-medium">days</span>
          </div>
          <p className="text-xs text-text-secondary mt-2">
            {stats.current_streak > 0 
              ? "Keep the fire burning! Complete a task daily." 
              : "Complete a task today to start a streak!"}
          </p>
        </div>
      </div>

      {/* Peak Productivity */}
      <div className="bg-surface-dark rounded-2xl border border-text-950/10 p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="material-symbols-outlined text-8xl text-blue-500">schedule</span>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <span className="material-symbols-outlined text-blue-500 text-xl">bolt</span>
            </div>
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Peak Hour</h3>
          </div>
          <div className="mt-4">
            {stats.peak_productivity_hour !== null ? (
              <>
                <span className="text-4xl font-bold text-text-950">{formatHour(stats.peak_productivity_hour)}</span>
              </>
            ) : (
              <span className="text-2xl font-bold text-text-secondary">No data</span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-2">
            Your most productive time of day based on completions.
          </p>
        </div>
      </div>

      {/* Average Completion Time */}
      <div className={`bg-surface-dark rounded-2xl border ${stats.burnout_risk ? 'border-red-500/50' : 'border-text-950/10'} p-6 relative overflow-hidden group`}>
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className={`material-symbols-outlined text-8xl ${stats.burnout_risk ? 'text-red-500' : 'text-emerald-500'}`}>
            {stats.burnout_risk ? 'warning' : 'timer'}
          </span>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${stats.burnout_risk ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
              <span className={`material-symbols-outlined text-xl ${stats.burnout_risk ? 'text-red-500' : 'text-emerald-500'}`}>
                {stats.burnout_risk ? 'warning' : 'timer'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
              {stats.burnout_risk ? 'Burnout Risk' : 'Avg. Task Time'}
            </h3>
          </div>
          
          {stats.burnout_risk ? (
            <div className="mt-4">
              <span className="text-2xl font-bold text-red-500">High Load</span>
              <p className="text-xs text-text-secondary mt-2">
                You're creating significantly more tasks than you're completing. Take a break!
              </p>
            </div>
          ) : (
            <div className="mt-4">
              {stats.tasks_completed_avg_time !== null && stats.tasks_completed_avg_time > 0 ? (
                <span className="text-4xl font-bold text-text-950">{formatDuration(stats.tasks_completed_avg_time)}</span>
              ) : (
                <span className="text-2xl font-bold text-text-secondary">--</span>
              )}
              <p className="text-xs text-text-secondary mt-2">
                Average time from creation to completion in this period.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
