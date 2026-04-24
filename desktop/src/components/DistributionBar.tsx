import { cn } from "@/lib/utils";

interface DistributionBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

export function DistributionBar({ label, value, total, color }: DistributionBarProps) {
    const percentage = Math.round((value / total) * 100);
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">{label}</span>
                <span className="text-text-secondary">{value} ({percentage}%)</span>
            </div>
            <div className="w-full h-2 bg-text-950/10 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", color)} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    )
}
