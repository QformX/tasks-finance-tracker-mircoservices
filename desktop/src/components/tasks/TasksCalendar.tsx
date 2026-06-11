import { useState, useEffect } from "react";
import type { Task } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface TasksCalendarProps {
  loading: boolean;
  tasks: Task[];
  getCategoryColor: (categoryId: string | null) => string | undefined;
  onToggle: (id: string) => void;
  onUpdateTaskDates: (taskId: string, newStartDate: string | null, newDueDate: string | null) => Promise<void>;
  viewType: "week" | "day";
  setViewType: (view: "week" | "day") => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const priorityWeight = (priority: string | undefined | null) => {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  if (priority === "low") return 1;
  return 0;
};

const isAllDayTask = (task: Task) => {
  if (!task.start_date) return true;
  const startObj = new Date(task.start_date);
  const isMidnightStart = startObj.getHours() === 0 && startObj.getMinutes() === 0;
  if (!isMidnightStart) return false;
  
  if (!task.due_date) return true;
  const dueObj = new Date(task.due_date);
  const isMidnightDue = dueObj.getHours() === 0 && dueObj.getMinutes() === 0;
  
  const diffMs = dueObj.getTime() - startObj.getTime();
  if (isMidnightDue && (diffMs === 0 || diffMs % (24 * 60 * 60 * 1000) === 0)) {
    return true;
  }
  return false;
};

const getMinutesForTask = (task: Task, targetDateStr: string) => {
  if (!task.start_date) return { start: 0, end: 60 };
  const startObj = new Date(task.start_date);
  const dueObj = task.due_date ? new Date(task.due_date) : new Date(startObj.getTime() + 60 * 60 * 1000);

  const targetDayStart = new Date(`${targetDateStr}T00:00:00`);
  const targetDayEnd = new Date(`${targetDateStr}T23:59:59.999`);

  const startMs = Math.max(startObj.getTime(), targetDayStart.getTime());
  const endMs = Math.min(dueObj.getTime(), targetDayEnd.getTime());

  const startMinutes = (startMs - targetDayStart.getTime()) / (60 * 1000);
  const endMinutes = (endMs - targetDayStart.getTime()) / (60 * 1000);

  return {
    start: Math.max(0, Math.min(24 * 60, startMinutes)),
    end: Math.max(0, Math.min(24 * 60, endMinutes)),
  };
};

interface TaskLayout {
  task: Task;
  startMin: number;
  endMin: number;
  top: number;
  height: number;
  column: number;
  totalColumns: number;
}

interface TaskWithMin {
  task: Task;
  startMin: number;
  endMin: number;
  duration: number;
}

const layoutTasks = (tasks: Task[], targetDateStr: string): TaskLayout[] => {
  const tasksWithMinutes = tasks.map(task => {
    const { start, end } = getMinutesForTask(task, targetDateStr);
    return {
      task,
      startMin: start,
      endMin: end,
      duration: end - start
    };
  });

  tasksWithMinutes.sort((a, b) => {
    if (a.startMin !== b.startMin) {
      return a.startMin - b.startMin;
    }
    return b.duration - a.duration;
  });

  const groups: TaskWithMin[][] = [];
  for (const item of tasksWithMinutes) {
    let placed = false;
    for (const group of groups) {
      const overlaps = group.some(gItem => {
        return item.startMin < gItem.endMin && item.endMin > gItem.startMin;
      });
      if (overlaps) {
        group.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push([item]);
    }
  }

  const layouts: TaskLayout[] = [];
  for (const group of groups) {
    const columns: TaskWithMin[][] = [];
    for (const item of group) {
      let colIdx = 0;
      while (true) {
        if (!columns[colIdx]) {
          columns[colIdx] = [];
        }
        const hasOverlap = columns[colIdx].some(cItem => {
          return item.startMin < cItem.endMin && item.endMin > cItem.startMin;
        });
        if (!hasOverlap) {
          columns[colIdx].push(item);
          break;
        }
        colIdx++;
      }
    }

    const totalColumns = columns.length;
    for (let colIdx = 0; colIdx < totalColumns; colIdx++) {
      for (const item of columns[colIdx]) {
        const top = (item.startMin / 60) * 56;
        const height = Math.max(32, ((item.endMin - item.startMin) / 60) * 56 - 4);
        layouts.push({
          task: item.task,
          startMin: item.startMin,
          endMin: item.endMin,
          top,
          height,
          column: colIdx,
          totalColumns
        });
      }
    }
  }

  return layouts;
};

export function TasksCalendar({
  loading,
  tasks,
  getCategoryColor,
  onToggle,
  onUpdateTaskDates,
  viewType,
  setViewType,
  currentDate,
  setCurrentDate
}: TasksCalendarProps) {
  const { t, language } = useLanguage();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Mouse gestures state (move, resize-top, resize-bottom)
  const [activeGesture, setActiveGesture] = useState<{
    type: "move" | "resize-top" | "resize-bottom";
    taskId: string;
    initialStartMin: number;
    initialEndMin: number;
    initialY: number;
    currentStartMin: number;
    currentEndMin: number;
  } | null>(null);

  // Helper to format date strings for comparison (YYYY-MM-DD)
  const getLocalDateStr = (date: Date) => {
    return date.toLocaleDateString("en-CA");
  };

  const getTaskDateStr = (task: Task) => {
    const dateStr = task.start_date || task.due_date;
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-CA");
  };

  const getTaskDurationHours = (task: Task) => {
    if (!task.start_date || !task.due_date) return 1;
    const start = new Date(task.start_date).getTime();
    const due = new Date(task.due_date).getTime();
    const diffMs = due - start;
    if (diffMs <= 0) return 1;
    return Math.max(1, diffMs / (1000 * 60 * 60));
  };

  // HTML5 Drag and Drop handlers (for Week View / All-day)
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };

  const handleDrop = async (dateStr: string, hour: number, e?: React.DragEvent) => {
    const taskId = e?.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let newStartDate: string | null = null;
    let newDueDate: string | null = null;

    if (viewType === "week") {
      const startHour = task.start_date ? new Date(task.start_date).getHours() : 0;
      const startMin = task.start_date ? new Date(task.start_date).getMinutes() : 0;
      
      const startObj = new Date(`${dateStr}T${startHour.toString().padStart(2, "0")}:${startMin.toString().padStart(2, "0")}:00`);
      newStartDate = startObj.toISOString();

      const durationHours = getTaskDurationHours(task);
      const dueObj = new Date(startObj.getTime() + durationHours * 60 * 60 * 1000);
      newDueDate = dueObj.toISOString();
    } else {
      if (hour === -1) {
        newStartDate = new Date(`${dateStr}T00:00:00`).toISOString();
        newDueDate = new Date(`${dateStr}T00:00:00`).toISOString();
      } else {
        const durationHours = getTaskDurationHours(task);
        const startObj = new Date(`${dateStr}T${hour.toString().padStart(2, "0")}:00:00`);
        newStartDate = startObj.toISOString();
        const dueObj = new Date(startObj.getTime() + durationHours * 60 * 60 * 1000);
        newDueDate = dueObj.toISOString();
      }
    }

    await onUpdateTaskDates(taskId, newStartDate, newDueDate);
    setDraggedTaskId(null);
  };

  const targetDateStr = getLocalDateStr(currentDate);

  // Mouse gestures handler effect
  useEffect(() => {
    if (!activeGesture) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - activeGesture.initialY;
      const deltaMinutes = Math.round((deltaY / 56) * 60);

      if (activeGesture.type === "move") {
        const duration = activeGesture.initialEndMin - activeGesture.initialStartMin;
        let newStart = activeGesture.initialStartMin + deltaMinutes;
        let newEnd = activeGesture.initialEndMin + deltaMinutes;
        if (newStart < 0) {
          newStart = 0;
          newEnd = duration;
        } else if (newEnd > 24 * 60) {
          newEnd = 24 * 60;
          newStart = 24 * 60 - duration;
        }
        setActiveGesture(prev => prev ? { ...prev, currentStartMin: newStart, currentEndMin: newEnd } : null);
      } else if (activeGesture.type === "resize-top") {
        const newStart = Math.max(0, Math.min(activeGesture.initialEndMin - 5, activeGesture.initialStartMin + deltaMinutes));
        setActiveGesture(prev => prev ? { ...prev, currentStartMin: newStart } : null);
      } else if (activeGesture.type === "resize-bottom") {
        const newEnd = Math.max(activeGesture.initialStartMin + 5, Math.min(24 * 60, activeGesture.initialEndMin + deltaMinutes));
        setActiveGesture(prev => prev ? { ...prev, currentEndMin: newEnd } : null);
      }
    };

    const handleMouseUp = async (e: MouseEvent) => {
      const task = tasks.find(t => t.id === activeGesture.taskId);
      if (task) {
        // Check if cursor is above the timeline grid (i.e. dragged to all-day row)
        const gridElement = document.querySelector(".timeline-grid-container");
        let isAllDayDrop = false;
        if (gridElement) {
          const rect = gridElement.getBoundingClientRect();
          if (e.clientY < rect.top) {
            isAllDayDrop = true;
          }
        }

        if (isAllDayDrop) {
          const startObj = new Date(`${targetDateStr}T00:00:00`);
          const endObj = new Date(`${targetDateStr}T00:00:00`);
          await onUpdateTaskDates(task.id, startObj.toISOString(), endObj.toISOString());
        } else {
          const startHour = Math.floor(activeGesture.currentStartMin / 60);
          const startMinVal = activeGesture.currentStartMin % 60;
          const endHour = Math.floor(activeGesture.currentEndMin / 60);
          const endMinVal = activeGesture.currentEndMin % 60;

          const startObj = new Date(`${targetDateStr}T${startHour.toString().padStart(2, "0")}:${startMinVal.toString().padStart(2, "0")}:00`);
          let endObj: Date;
          if (endHour === 24) {
            const nextDay = new Date(startObj);
            nextDay.setDate(nextDay.getDate() + 1);
            nextDay.setHours(0, 0, 0, 0);
            endObj = nextDay;
          } else {
            endObj = new Date(`${targetDateStr}T${endHour.toString().padStart(2, "0")}:${endMinVal.toString().padStart(2, "0")}:00`);
          }

          await onUpdateTaskDates(task.id, startObj.toISOString(), endObj.toISOString());
        }
      }
      setActiveGesture(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeGesture, tasks, onUpdateTaskDates, targetDateStr]);

  // Weekly View Helpers
  const getWeekDays = () => {
    const tempDate = new Date(currentDate);
    const dayOfWeek = tempDate.getDay();
    const adjust = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    tempDate.setDate(tempDate.getDate() + adjust);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(tempDate);
      dayDate.setDate(tempDate.getDate() + i);
      weekDays.push({
        date: dayDate,
        dateStr: getLocalDateStr(dayDate),
      });
    }
    return weekDays;
  };

  const todayStr = getLocalDateStr(new Date());
  const weekDays = getWeekDays();

  // Day view items grouping
  const dayTasks = tasks.filter((task) => getTaskDateStr(task) === targetDateStr);
  const allDayTasks = dayTasks.filter(isAllDayTask);
  const timedTasks = dayTasks.filter(task => !isAllDayTask(task));

  const hoursArray = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex-1 flex flex-col w-full px-8 pb-10 overflow-hidden">
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col gap-6 min-h-0">
        {loading ? (
          <div className="text-text-secondary text-center py-20 flex-1">{t("loading_tasks")}</div>
        ) : (
          <div className="bg-surface-dark border border-text-950/10 rounded-2xl shadow-xl overflow-hidden flex-1 flex flex-col min-h-0">


            {/* Grid Body */}
            {viewType === "week" ? (
              // WEEK VIEW
              <div 
                className="flex-1 grid divide-x divide-text-950/10 bg-surface-dark min-h-0 overflow-x-auto"
                style={{ gridTemplateColumns: "repeat(7, minmax(130px, 1fr))" }}
              >
                {weekDays.map((day, idx) => {
                  const dayTasks = tasks.filter((task) => getTaskDateStr(task) === day.dateStr);
                  const isToday = day.dateStr === todayStr;

                  // Sort dayTasks: weight descending, then uncompleted first
                  const sortedDayTasks = [...dayTasks].sort((a, b) => {
                    const pA = priorityWeight(a.priority);
                    const pB = priorityWeight(b.priority);
                    if (pA !== pB) return pB - pA;
                    
                    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
                    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
                  });

                  const displayedDayTasks = sortedDayTasks.slice(0, 3);
                  const remainingCount = dayTasks.length - 3;

                  return (
                    <div
                      key={idx}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => handleDrop(day.dateStr, -1, e)}
                      className={cn(
                        "flex flex-col p-4 min-h-0 transition-colors relative hover:bg-text-950/[0.01]",
                        isToday ? "bg-primary-500/[0.02]" : ""
                      )}
                    >
                      {/* Day Header */}
                      <div className="flex items-baseline justify-between mb-4 shrink-0 pb-2 border-b border-text-950/5">
                        <span className="text-xs font-bold text-text-secondary uppercase select-none">
                          {day.date.toLocaleDateString(language, { weekday: "short" })}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-bold flex items-center justify-center size-8 rounded-full transition-all select-none",
                            isToday
                              ? "bg-primary-500 text-white shadow-md shadow-primary-500/20"
                              : "text-text-950"
                          )}
                        >
                          {day.date.getDate()}
                        </span>
                      </div>

                      {/* Day Tasks List */}
                      <div className="flex-1 space-y-2.5 pr-1 py-1 overflow-y-auto">
                        {displayedDayTasks.map((task) => {
                          const catColor = getCategoryColor(task.category_id) || "#a855f7";
                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragEnd={handleDragEnd}
                              onDoubleClick={async (e) => {
                                e.stopPropagation();
                                const startObj = new Date(`${targetDateStr}T09:00:00`);
                                const endObj = new Date(`${targetDateStr}T10:00:00`);
                                await onUpdateTaskDates(task.id, startObj.toISOString(), endObj.toISOString());
                              }}
                              className={cn(
                                "group/task flex flex-col gap-1.5 p-2 rounded-xl border text-left cursor-pointer hover:border-text-950/20 hover:shadow-md transition-all select-none",
                                task.is_completed
                                  ? "bg-text-950/[0.02] border-text-950/5 opacity-55 hover:opacity-90"
                                  : "bg-surface border-text-950/10 hover:border-text-950/20 hover:shadow-md"
                              )}
                              style={
                                !task.is_completed
                                  ? { borderLeft: `3px solid ${catColor}` }
                                  : undefined
                              }
                            >
                              <div className="flex items-start gap-1.5">
                                {/* Completion Checkbox */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggle(task.id);
                                  }}
                                  className={cn(
                                    "size-3.5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer mt-0.5",
                                    task.is_completed
                                      ? "bg-primary-500 border-primary-500 text-white"
                                      : "border-text-secondary/40 hover:border-text-950/60"
                                  )}
                                >
                                  {task.is_completed && (
                                    <span className="material-symbols-outlined text-[9px] font-bold">
                                      check
                                    </span>
                                  )}
                                </button>

                                {/* Task Title & Description */}
                                <div className="flex-1 min-w-0">
                                  <span
                                    className={cn(
                                      "text-[10px] font-bold leading-normal truncate block",
                                      task.is_completed
                                        ? "text-text-secondary line-through font-medium"
                                        : "text-text-950"
                                    )}
                                    title={task.title}
                                  >
                                    {task.title}
                                  </span>
                                  {task.description && (
                                    <p className="text-[9px] text-text-secondary line-clamp-2 mt-0.5 leading-normal font-normal">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Task Metadata */}
                              {!task.is_completed && (
                                <div className="flex items-center justify-between gap-1 mt-1 shrink-0 flex-wrap">
                                  {task.priority && (
                                    <span
                                      className={cn(
                                        "text-[8px] font-bold px-1 py-0.5 rounded uppercase",
                                        task.priority === "high"
                                          ? "bg-red-500/10 text-red-400"
                                          : task.priority === "medium"
                                          ? "bg-yellow-500/10 text-yellow-400"
                                          : "bg-blue-500/10 text-blue-400"
                                      )}
                                    >
                                      {task.priority}
                                    </span>
                                  )}
                                  {task.due_date && task.due_date.includes("T") && (
                                    <span className="text-[8px] font-semibold text-text-secondary flex items-center gap-0.5 whitespace-nowrap">
                                      <span className="material-symbols-outlined text-[9px]">schedule</span>
                                      {new Date(task.due_date).toLocaleTimeString(language, {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {remainingCount > 0 && (
                          <div 
                            onClick={() => {
                              setCurrentDate(day.date);
                              setViewType("day");
                            }}
                            className="text-[10px] font-bold text-text-secondary text-center py-1.5 bg-text-950/5 hover:bg-text-950/10 rounded-lg border border-text-950/10 cursor-pointer transition-colors select-none"
                          >
                            {language === "ru" ? `+ еще ${remainingCount}` : `+ ${remainingCount} more`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // DAY VIEW
              <div className="flex-1 flex flex-col bg-surface-dark divide-y divide-text-950/10 min-h-0">
                {/* All-day Section */}
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => handleDrop(targetDateStr, -1, e)}
                  className="bg-text-950/2 p-4 shrink-0 flex flex-col gap-2 border-b border-text-950/10 min-h-[70px]"
                >
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider select-none">
                    {t("all_day") || "All-day"}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {allDayTasks.map((task) => {
                      const catColor = getCategoryColor(task.category_id) || "#a855f7";
                      return (
                        <div 
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onDoubleClick={async (e) => {
                            e.stopPropagation();
                            const startObj = new Date(`${targetDateStr}T09:00:00`);
                            const endObj = new Date(`${targetDateStr}T10:00:00`);
                            await onUpdateTaskDates(task.id, startObj.toISOString(), endObj.toISOString());
                          }}
                          className={cn(
                            "group/task flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-surface text-xs font-semibold text-text-950 cursor-pointer hover:border-text-950/20 hover:shadow-md transition-all select-none"
                          )}
                          style={{ borderLeft: `3px solid ${catColor}` }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggle(task.id);
                            }}
                            className={cn(
                              "size-4 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                              task.is_completed
                                ? "bg-primary-500 border-primary-500 text-white"
                                : "border-text-secondary/40 hover:border-text-950/60"
                            )}
                          >
                            {task.is_completed && (
                              <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                            )}
                          </button>
                          <span className={cn(task.is_completed && "line-through text-text-secondary")}>
                            {task.title}
                          </span>
                        </div>
                      );
                    })}
                    {allDayTasks.length === 0 && (
                      <span className="text-xs text-text-secondary italic opacity-40 select-none py-1">
                        {language === "ru" ? "Нет задач на весь день" : "No all-day tasks"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Vertical Hourly Timeline */}
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relativeY = e.clientY - rect.top + e.currentTarget.scrollTop;
                    const dropHour = Math.max(0, Math.min(23, Math.floor(relativeY / 56)));
                    handleDrop(targetDateStr, dropHour);
                  }}
                  className="divide-y divide-text-950/5 relative flex-1 overflow-y-auto min-h-0 timeline-grid-container"
                >
                  {hoursArray.map((hour) => {
                    const hourStr = `${hour.toString().padStart(2, "0")}:00`;
                    return (
                      <div
                        key={hour}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={() => handleDrop(targetDateStr, hour)}
                        className="flex h-14 hover:bg-text-950/[0.01] transition-colors group/row"
                      >
                        {/* Hour label */}
                        <div className="w-20 flex items-center justify-center border-r border-text-950/10 text-[10px] font-bold text-text-secondary select-none shrink-0">
                          {hourStr}
                        </div>

                        {/* Drop Zone spacer */}
                        <div className="flex-1" />
                      </div>
                    );
                  })}

                  {/* Absolute overlay container for timed task cards */}
                  <div className="absolute left-20 right-0 top-0 bottom-0 pointer-events-none">
                    {layoutTasks(timedTasks, targetDateStr).map((layout) => {
                      const { task } = layout;
                      const catColor = getCategoryColor(task.category_id) || "#a855f7";
                      
                      const isCurrentGesture = activeGesture?.taskId === task.id;
                      const startMin = isCurrentGesture ? activeGesture.currentStartMin : layout.startMin;
                      const endMin = isCurrentGesture ? activeGesture.currentEndMin : layout.endMin;

                      const cardTop = (startMin / 60) * 56;
                      const cardHeight = Math.max(32, ((endMin - startMin) / 60) * 56 - 4);
                      const widthPct = 100 / layout.totalColumns;
                      const leftPct = layout.column * widthPct;

                      const formatTimeLabel = (minutes: number) => {
                        const hr = Math.floor(minutes / 60);
                        const mn = minutes % 60;
                        return `${hr.toString().padStart(2, "0")}:${mn.toString().padStart(2, "0")}`;
                      };

                      const startLabel = isCurrentGesture 
                        ? formatTimeLabel(activeGesture.currentStartMin)
                        : task.start_date 
                          ? new Date(task.start_date).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" })
                          : "";

                      const endLabel = isCurrentGesture
                        ? formatTimeLabel(activeGesture.currentEndMin)
                        : task.due_date
                          ? new Date(task.due_date).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" })
                          : "";

                      return (
                        <div
                          key={task.id}
                          onMouseDown={(e) => {
                            if (task.is_completed) return;
                            if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
                            
                            e.stopPropagation();
                            setActiveGesture({
                              type: "move",
                              taskId: task.id,
                              initialStartMin: layout.startMin,
                              initialEndMin: layout.endMin,
                              initialY: e.clientY,
                              currentStartMin: layout.startMin,
                              currentEndMin: layout.endMin
                            });
                          }}
                          onDoubleClick={async (e) => {
                            e.stopPropagation();
                            const startObj = new Date(`${targetDateStr}T00:00:00`);
                            const endObj = new Date(`${targetDateStr}T00:00:00`);
                            await onUpdateTaskDates(task.id, startObj.toISOString(), endObj.toISOString());
                          }}
                          className={cn(
                            "group/task flex flex-col gap-1.5 p-3 rounded-xl border text-left pointer-events-auto select-none transition-shadow absolute overflow-hidden shadow-sm cursor-pointer",
                            task.is_completed
                              ? "bg-text-950/[0.02] border-text-950/5 opacity-55 hover:opacity-90"
                              : "bg-surface border-text-950/10 hover:border-text-950/20",
                            isCurrentGesture ? "shadow-lg scale-[1.01] border-primary-500/50 cursor-grabbing z-30" : "z-10 hover:shadow-md"
                          )}
                          style={{
                            borderLeft: !task.is_completed ? `3px solid ${catColor}` : undefined,
                            top: `${cardTop + 2}px`,
                            left: `calc(${leftPct}% + 4px)`,
                            width: `calc(${widthPct}% - 8px)`,
                            height: `${cardHeight}px`,
                          }}
                        >
                          {/* Top Resize Handle */}
                          {!task.is_completed && (
                            <div 
                              className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-primary-500/25 active:bg-primary-500/50 z-20"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setActiveGesture({
                                  type: "resize-top",
                                  taskId: task.id,
                                  initialStartMin: layout.startMin,
                                  initialEndMin: layout.endMin,
                                  initialY: e.clientY,
                                  currentStartMin: layout.startMin,
                                  currentEndMin: layout.endMin
                                });
                              }}
                            />
                          )}

                          {/* Card Content */}
                          <div className="flex items-start gap-2 overflow-hidden shrink-0">
                            {/* Completion Checkbox */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggle(task.id);
                              }}
                              className={cn(
                                "size-4 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer mt-0.5",
                                task.is_completed
                                  ? "bg-primary-500 border-primary-500 text-white"
                                  : "border-text-secondary/40 hover:border-text-950/60"
                              )}
                            >
                              {task.is_completed && (
                                <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className={cn("text-[11px] font-bold leading-normal truncate block", task.is_completed && "line-through text-text-secondary")}>
                                {task.title}
                              </span>
                              {task.description && cardHeight >= 50 && (
                                <p className="text-[10px] text-text-secondary line-clamp-2 mt-0.5 leading-normal font-normal">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Task Details / Priority & Time */}
                          {cardHeight >= 40 && !task.is_completed && (
                            <div className="flex items-center gap-1.5 mt-auto text-[9px] font-bold text-text-secondary select-none opacity-80 shrink-0">
                              {task.priority && (
                                <span
                                  className={cn(
                                    "px-1 rounded uppercase",
                                    task.priority === "high"
                                      ? "bg-red-500/10 text-red-400"
                                      : task.priority === "medium"
                                      ? "bg-yellow-500/10 text-yellow-400"
                                      : "bg-blue-500/10 text-blue-400"
                                  )}
                                >
                                  {task.priority}
                                </span>
                              )}
                              <span className="flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px]">schedule</span>
                                {startLabel}
                                {endLabel && ` - ${endLabel}`}
                              </span>
                            </div>
                          )}

                          {/* Bottom Resize Handle */}
                          {!task.is_completed && (
                            <div 
                              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-primary-500/25 active:bg-primary-500/50 z-20"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setActiveGesture({
                                  type: "resize-bottom",
                                  taskId: task.id,
                                  initialStartMin: layout.startMin,
                                  initialEndMin: layout.endMin,
                                  initialY: e.clientY,
                                  currentStartMin: layout.startMin,
                                  currentEndMin: layout.endMin
                                });
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>


                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
