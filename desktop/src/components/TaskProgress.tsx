import { useEffect, useState, useLayoutEffect } from "react";
import { useTasks } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

interface TaskProgressProps {
  isCollapsed: boolean;
}

export function TaskProgress({ isCollapsed }: TaskProgressProps) {
  const { tasks, fetchTasks } = useTasks();
  const [displayedPercentage, setDisplayedPercentage] = useState(0);
  
  useEffect(() => {
    // Fetch only today's tasks for the progress bar
    fetchTasks("today");
    
    // Listen for task updates
    const handleTaskUpdate = () => {
        fetchTasks("today");
    };
    window.addEventListener("task-updated", handleTaskUpdate);

    // Optional: Set up a polling interval to keep it relatively fresh
    const interval = setInterval(() => {
        fetchTasks("today");
    }, 30000); // Every 30 seconds

    return () => {
        clearInterval(interval);
        window.removeEventListener("task-updated", handleTaskUpdate);
    };
  }, [fetchTasks]);

  const total = tasks.length;
  const completed = tasks.filter(t => t.is_completed).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  // Reset animation when switching modes
  useLayoutEffect(() => {
    setDisplayedPercentage(0);
  }, [isCollapsed]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayedPercentage(percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [isCollapsed, percentage]);

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center justify-center py-2 w-full animate-in fade-in duration-300">
         <div className="relative flex flex-col items-center justify-between w-[52px] h-36 bg-gradient-to-b from-text-950/5 to-transparent rounded-3xl overflow-hidden border border-text-950/5 group shadow-inner">
            
            {/* Progress Fill (Vertical) */}
            <div 
                key="vertical-fill"
                className="absolute bottom-0 w-full bg-accent-500/20 transition-all duration-1000 ease-out"
                style={{ height: `${displayedPercentage}%` }}
            >
                <div className="absolute top-0 w-full h-[2px] bg-accent-500 shadow-[0_0_10px_hsl(var(--accent-500)/0.5)]" />
            </div>

            {/* Percentage Text */}
            <div className="relative z-10 mt-4 flex flex-col items-center">
                <span className="text-lg font-bold text-text-950 drop-shadow-md">{percentage}</span>
                <span className="text-xs text-text-950/60 -mt-1">%</span>
            </div>

            {/* Label */}
            <div className="relative z-10 mb-4">
                <span className="text-xs font-bold text-text-950/80 tracking-widest uppercase">To Do</span>
            </div>
         </div>
      </div>
    );
  }

  // Expanded State
  return (
    <div className="py-2 animate-in fade-in duration-300 w-full overflow-hidden">
         <div className="relative flex items-center justify-between w-full h-14 bg-gradient-to-r from-text-950/5 to-transparent rounded-2xl overflow-hidden border border-text-950/5 group shadow-inner px-4 min-w-[240px] transition-all duration-300 ease-in-out">
            
            {/* Progress Fill (Horizontal) */}
            <div 
                key="horizontal-fill"
                className="absolute left-0 h-full bg-accent-500/20 transition-all duration-1000 ease-out"
                style={{ width: `${displayedPercentage}%` }}
            >
                <div className="absolute right-0 h-full w-[2px] bg-accent-500 shadow-[0_0_10px_hsl(var(--accent-500)/0.5)]" />
            </div>

            {/* Label */}
            <div className="relative z-10 flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-text-950/80 tracking-widest uppercase whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">To Do</span>
                <span className="text-xs text-text-950/50 whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300 delay-75">{completed}/{total} Tasks</span>
            </div>

            {/* Percentage Text */}
            <div className="relative z-10 flex items-baseline gap-0.5 overflow-hidden">
                <span className="text-2xl font-bold text-text-950 drop-shadow-md whitespace-nowrap animate-in fade-in slide-in-from-right-2 duration-300">{percentage}</span>
                <span className="text-sm text-text-950/60 whitespace-nowrap animate-in fade-in slide-in-from-right-2 duration-300">%</span>
            </div>
         </div>
    </div>
  );
}
