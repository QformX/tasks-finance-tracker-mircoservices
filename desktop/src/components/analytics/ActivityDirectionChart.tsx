import type { DashboardStats } from "@/types";

export function ActivityDirectionChart({ stats }: { stats: DashboardStats | null }) {
    if (!stats) return null;

    // Center and radius for the chart
    const centerX = 96;
    const centerY = 96;
    const maxRadius = 72; // Max distance from center

    // Calculate max value for normalization
    const maxValue = Math.max(
        stats.tasks_created,
        stats.tasks_completed,
        stats.purchases_created,
        stats.purchases_completed,
        1 // Avoid division by zero
    );

    // Calculate radius for each direction (normalized to maxRadius)
    const topRadius = (stats.tasks_created / maxValue) * maxRadius; // Tasks Created (top)
    const bottomRadius = (stats.tasks_completed / maxValue) * maxRadius; // Tasks Completed (bottom)
    const leftRadius = (stats.purchases_created / maxValue) * maxRadius; // Purchases Created (left)
    const rightRadius = (stats.purchases_completed / maxValue) * maxRadius; // Purchases Bought (right)

    // Calculate actual points
    const topPoint = { x: centerX, y: centerY - topRadius };
    const rightPoint = { x: centerX + rightRadius, y: centerY };
    const bottomPoint = { x: centerX, y: centerY + bottomRadius };
    const leftPoint = { x: centerX - leftRadius, y: centerY };

    const polygonPoints = `${topPoint.x},${topPoint.y} ${rightPoint.x},${rightPoint.y} ${bottomPoint.x},${bottomPoint.y} ${leftPoint.x},${leftPoint.y}`;

    return (
          <div className="flex-1 w-full min-w-[200px] flex flex-col items-center justify-center">
             <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Activity Direction</h4>
             <div className="relative w-48 h-48">
                {/* Axis Lines */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10 -translate-x-1/2"></div>
                <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10 -translate-y-1/2"></div>
                
                {/* Labels */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 text-[10px] text-text-secondary font-medium">
                    Tasks Created ({stats.tasks_created})
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 text-[10px] text-text-secondary font-medium">
                    Tasks Completed ({stats.tasks_completed})
                </div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 text-[10px] text-text-secondary font-medium text-right w-20">
                    Purchases Created ({stats.purchases_created})
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-2 text-[10px] text-text-secondary font-medium w-20">
                    Purchases Bought ({stats.purchases_completed})
                </div>

                <div className="absolute inset-0">
                    <svg className="w-full h-full overflow-visible">
                        <polygon 
                            points={polygonPoints}
                            fill="rgba(124, 58, 237, 0.2)" 
                            stroke="#7c3aed" 
                            strokeWidth="2"
                            className="animate-in fade-in duration-1000"
                        />
                        <circle cx={topPoint.x} cy={topPoint.y} r="3" fill="#7c3aed" />
                        <circle cx={rightPoint.x} cy={rightPoint.y} r="3" fill="#7c3aed" />
                        <circle cx={bottomPoint.x} cy={bottomPoint.y} r="3" fill="#7c3aed" />
                        <circle cx={leftPoint.x} cy={leftPoint.y} r="3" fill="#7c3aed" />
                    </svg>
                </div>
             </div>
          </div>
    );
}
