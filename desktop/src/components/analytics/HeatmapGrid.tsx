import { cn } from "@/lib/utils";
import type { ActivityHeatmap } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface HeatmapGridProps {
  heatmap: ActivityHeatmap;
  period: string;
}

export function HeatmapGrid({ heatmap, period }: HeatmapGridProps) {
  const { language } = useLanguage();
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
        <div className="flex flex-col gap-4 items-center w-full">
          <div className="flex items-start gap-2">
            {/* Day Labels */}
            <div className="flex flex-col gap-0.5 mt-[1px]">
               {[0, 1, 2, 3, 4, 5, 6].map(i => (
                   <div key={i} className="h-2 w-6 flex items-center justify-end">
                       {(i === 1 || i === 3 || i === 5) && (
                           <span className="text-[9px] text-text-secondary leading-none capitalize">
                               {new Date(2024, 0, 7 + i).toLocaleDateString(language, { weekday: 'short' })}
                           </span>
                       )}
                   </div>
               ))}
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex gap-0.5 w-full justify-center overflow-x-auto pb-1 scrollbar-hide">
                    {weeks.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-0.5">
                            {week.map((day) => {
                                if (day.activity === -1) return <div key={day.date} className="w-2 h-2" />;
                                
                                const intensity = day.activity === 0 ? 0 : Math.ceil((day.activity / maxActivity) * 4);
                                const bgClass = [
                                    "bg-primary/10", // 0
                                    "bg-primary/40", // 1
                                    "bg-primary/60", // 2
                                    "bg-primary/80", // 3
                                    "bg-primary",    // 4
                                ][Math.min(intensity, 4)];

                                return (
                                    <div 
                                        key={day.date} 
                                        className={cn("w-2 h-2 rounded-[1px] transition-colors", bgClass)}
                                        title={`${day.date}: ${day.activity} events`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Month Labels */}
                <div className="flex gap-0.5 w-full justify-center h-4">
                    {weeks.map((week, wIndex) => {
                        const firstDay = week.find(d => !d.date.startsWith('empty'));
                        if (!firstDay) return <div key={wIndex} className="w-2" />;
                        
                        const date = new Date(firstDay.date);
                        const month = date.toLocaleString(language, { month: 'short' });
                        
                        let showLabel = false;
                        if (wIndex === 0) {
                            showLabel = true;
                        } else {
                            const prevWeek = weeks[wIndex - 1];
                            const prevDay = prevWeek.find(d => !d.date.startsWith('empty'));
                            if (prevDay) {
                                const prevDate = new Date(prevDay.date);
                                if (prevDate.getMonth() !== date.getMonth()) {
                                    showLabel = true;
                                }
                            }
                        }

                        return (
                            <div key={wIndex} className="w-2 relative">
                                {showLabel && (
                                    <span className="absolute top-0 left-0 text-[9px] text-text-secondary whitespace-nowrap capitalize">
                                        {month}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        </div>
      );
  }

  if (period === "month") {
      const displayData = heatmap.heatmap.slice(-30);
      const width = 800;
      const height = 300;
      const padding = 10;
      
      const points = displayData.map((day, i) => {
          const x = (i / (displayData.length - 1)) * width;
          // Invert Y, leave some padding at top
          const y = height - (day.activity / maxActivity) * (height - padding * 2) - padding; 
          return [x, y];
      });

      // Generate path
      let d = `M ${points[0][0]},${points[0][1]}`;
      for (let i = 0; i < points.length - 1; i++) {
          const [x0, y0] = points[i];
          const [x1, y1] = points[i + 1];
          const dx = (x1 - x0) / 2;
          d += ` C ${x0 + dx},${y0} ${x1 - dx},${y1} ${x1},${y1}`;
      }

      const fillPath = `${d} L ${width},${height} L 0,${height} Z`;

      return (
        <div className="w-full h-full min-h-[200px] flex flex-col">
            <div className="relative flex-1 w-full group">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ padding: `${(padding/height)*100}% 0` }}>
                    {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                        <div key={ratio} className="w-full border-t border-text-950/5 relative">
                            <span className="absolute -top-2.5 left-0 text-[10px] text-text-secondary font-medium">
                                {Math.round(maxActivity * ratio)}
                            </span>
                        </div>
                    ))}
                </div>

                <svg className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.2"></stop>
                            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0"></stop>
                        </linearGradient>
                    </defs>
                    <path d={d} fill="none" stroke="#8B5CF6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                    <path d={fillPath} fill="url(#gradient)" stroke="none" />
                    
                    {/* Interactive points */}
                    {points.map((p, i) => (
                        <circle 
                            key={i}
                            cx={p[0]} 
                            cy={p[1]} 
                            r="6" 
                            fill="var(--color-surface-dark)" 
                            stroke="#8B5CF6" 
                            strokeWidth="3"
                            className="opacity-0 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                        >
                            <title>{`${displayData[i].date}: ${displayData[i].activity} events`}</title>
                        </circle>
                    ))}
                </svg>
            </div>
            <div className="flex justify-between mt-4 text-xs text-text-secondary font-medium px-2">
                {displayData.filter((_, i) => i % 6 === 0).map((day, i) => (
                    <span key={i}>{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                ))}
            </div>
        </div>
      );
  }

  // Default / Week / Month view (Bar chart style but nicer)
  const daysCount = period === "week" ? 7 : 30;
  const filledData = [];
  const today = new Date();
  
  // Create a map for quick lookup
  const activityMap = new Map(heatmap.heatmap.map(d => [d.date, d.activity]));

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
    
    filledData.push({
      date: dateStr,
      activity: activityMap.get(dateStr) || 0
    });
  }
  
  const displayData = filledData;
  
  return (
    <div className="h-full min-h-[160px] flex items-end justify-between gap-2 px-2">
      {displayData.map((day) => {
        const height = (day.activity / maxActivity) * 100;
        const intensity = day.activity === 0 ? 0 : Math.ceil((day.activity / maxActivity) * 4);
        
        // Use similar logic to year view but for bars
        const bgClass = day.activity === 0 
            ? "bg-primary/10 hover:bg-primary/20" 
            : [
                "bg-primary/40 hover:bg-primary/50", // 1
                "bg-primary/60 hover:bg-primary/70", // 2
                "bg-primary/80 hover:bg-primary/90", // 3
                "bg-primary hover:bg-primary-dark",    // 4
              ][Math.min(intensity, 4) - 1] || "bg-primary";

        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return (
          <div key={day.date} className="w-full flex flex-col items-center gap-2 h-full justify-end group">
            <div 
              className={cn(
                "w-full rounded-t-sm relative transition-all duration-300 min-w-[4px]",
                bgClass,
                day.activity === maxActivity && maxActivity > 0 && "shadow-[0_0_15px_rgba(124,58,237,0.3)]"
              )}
              style={{ height: `${Math.max(height, 10)}%` }}
              title={`${day.date}: ${day.activity} events`}
            />
            <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-bold text-text-secondary group-hover:text-text-950 transition-colors">{dayName}</span>
                <span className="text-[9px] text-text-secondary/70 group-hover:text-text-950/70 transition-colors">{dateStr}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
