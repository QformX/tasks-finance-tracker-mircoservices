import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  trend: string;
  color: "indigo" | "pink" | "amber" | "emerald" | "red" | "blue";
}

export function StatCard({ icon, label, value, trend, color }: StatCardProps) {
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
