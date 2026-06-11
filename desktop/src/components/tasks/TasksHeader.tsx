import { useLanguage } from "@/context/LanguageContext";
import { FilterButton } from "./FilterButton";
import { CreateButton } from "@/components/CreateButton";
import { cn } from "@/lib/utils";

interface TasksHeaderProps {
  filter: "all" | "today" | "overdue" | "completed";
  setFilter: (filter: "all" | "today" | "overdue" | "completed") => void;
  onOpenCreateModal: () => void;
  counts: {
    today: number;
    overdue: number;
  };
  search: string;
  onSearchChange: (search: string) => void;
  view: "list" | "calendar";
  onViewChange: (view: "list" | "calendar") => void;
  calendarViewType?: "week" | "day";
  setCalendarViewType?: (view: "week" | "day") => void;
  currentDate?: Date;
  onPrevCalendar?: () => void;
  onNextCalendar?: () => void;
  onTodayCalendar?: () => void;
}

export function TasksHeader({
  filter,
  setFilter,
  onOpenCreateModal,
  counts,
  search,
  onSearchChange,
  view,
  onViewChange,
  calendarViewType = "week",
  setCalendarViewType,
  currentDate,
  onPrevCalendar,
  onNextCalendar,
  onTodayCalendar
}: TasksHeaderProps) {
  const { t, language } = useLanguage();

  const getHeaderLabel = () => {
    if (!currentDate) return "";
    
    const getLocalDateStr = (d: Date) => d.toLocaleDateString("en-CA");
    
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

    if (calendarViewType === "day") {
      return currentDate.toLocaleDateString(language, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
    } else {
      const weekDays = getWeekDays();
      const start = weekDays[0].date;
      const end = weekDays[6].date;
      const startMonth = start.toLocaleDateString(language, { month: "short" });
      const endMonth = end.toLocaleDateString(language, { month: "short" });
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();

      if (startYear !== endYear) {
        return `${start.getDate()} ${startMonth} ${startYear} - ${end.getDate()} ${endMonth} ${endYear}`;
      }
      if (startMonth !== endMonth) {
        return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${startYear}`;
      }
      return `${start.getDate()} - ${end.getDate()} ${startMonth} ${startYear}`;
    }
  };

  return (
    <div className="shrink-0 z-20 bg-background-200 dark:bg-background-50 sticky top-0 px-8">
        <div className="w-full max-w-7xl mx-auto flex flex-col pt-8 pb-4">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-text-950 text-xl lg:text-2xl font-bold leading-tight tracking-tight whitespace-nowrap shrink-0">{t("tasks_header")}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-text-950/5 rounded-xl p-1 border border-text-950/10 h-10 items-center">
                <button
                  onClick={() => onViewChange("list")}
                  className={cn(
                    "px-3 h-full rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                    view === "list" 
                      ? "bg-text-950/10 text-text-950 shadow-sm" 
                      : "text-text-secondary hover:text-text-950"
                  )}
                  title={t("list_view")}
                >
                  <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                  <span className="hidden sm:inline">{t("list_view")}</span>
                </button>
                <button
                  onClick={() => onViewChange("calendar")}
                  className={cn(
                    "px-3 h-full rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                    view === "calendar" 
                      ? "bg-text-950/10 text-text-950 shadow-sm" 
                      : "text-text-secondary hover:text-text-950"
                  )}
                  title={t("calendar_view")}
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                  <span className="hidden sm:inline">{t("calendar_view")}</span>
                </button>
              </div>
              <CreateButton onClick={onOpenCreateModal} label={t("new_task")} />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {view === "list" ? (
              <>
                <div className="w-full md:max-w-md">
                  <div className="flex w-full items-center rounded-2xl h-11 bg-text-950/5 group focus-within:ring-1 focus-within:ring-text-950/10 transition-all border border-transparent">
                    <div className="text-text-secondary flex items-center justify-center pl-4">
                      <span className="material-symbols-outlined text-[20px]">search</span>
                    </div>
                    <input 
                      className="flex w-full min-w-0 flex-1 resize-none bg-transparent border-none text-text-950 focus:ring-0 h-full placeholder:text-text-secondary/70 px-3 text-sm font-medium outline-none" 
                      placeholder={t("search_tasks_placeholder")} 
                      value={search}
                      onChange={(e) => onSearchChange(e.target.value)}
                    />
                    {search && (
                      <button
                        onClick={() => onSearchChange("")}
                        className="text-text-secondary hover:text-text-950 transition-colors pr-4 flex items-center justify-center cursor-pointer"
                        title={t("clear") || "Clear"}
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 items-center overflow-x-auto w-full md:w-auto scrollbar-hide py-1">
                  <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label={t("all_tasks")} />
                  <FilterButton active={filter === "today"} onClick={() => setFilter("today")} label={t("today")} count={counts.today} />
                  <FilterButton active={filter === "overdue"} onClick={() => setFilter("overdue")} label={t("overdue")} count={counts.overdue} isError />
                  <FilterButton active={filter === "completed"} onClick={() => setFilter("completed")} label={t("completed")} />
                </div>
              </>
            ) : (
              <>
                {/* Calendar View Type Switcher */}
                <div className="flex bg-text-950/5 rounded-xl p-1 border border-text-950/10 h-10 items-center justify-center w-full md:w-auto select-none">
                  <button
                    onClick={() => setCalendarViewType?.("week")}
                    className={cn(
                      "px-4 h-full rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 md:flex-initial",
                      calendarViewType === "week"
                        ? "bg-text-950/10 text-text-950 shadow-sm"
                        : "text-text-secondary hover:text-text-950"
                    )}
                  >
                    {t("week_view") || (language === "ru" ? "Неделя" : "Week")}
                  </button>
                  <button
                    onClick={() => setCalendarViewType?.("day")}
                    className={cn(
                      "px-4 h-full rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 md:flex-initial",
                      calendarViewType === "day"
                        ? "bg-text-950/10 text-text-950 shadow-sm"
                        : "text-text-secondary hover:text-text-950"
                    )}
                  >
                    {t("day_view") || (language === "ru" ? "День" : "Day")}
                  </button>
                </div>

                {/* Calendar Navigation Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
                  <button
                    onClick={onPrevCalendar}
                    className="size-10 rounded-full bg-text-950/5 hover:bg-text-950/10 flex items-center justify-center text-text-950 transition-colors cursor-pointer shrink-0"
                    title="Previous"
                  >
                    <span className="material-symbols-outlined">keyboard_arrow_left</span>
                  </button>
                  
                  <button
                    onClick={onTodayCalendar}
                    className="px-4 h-10 rounded-xl bg-text-950/5 hover:bg-text-950/10 border border-text-950/10 text-text-950 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    {language === "ru" ? "Сегодня" : "Today"}
                  </button>

                  <span className="text-xs sm:text-sm font-bold text-text-950 px-1 select-none capitalize whitespace-nowrap text-center">
                    {getHeaderLabel()}
                  </span>

                  <button
                    onClick={onNextCalendar}
                    className="size-10 rounded-full bg-text-950/5 hover:bg-text-950/10 flex items-center justify-center text-text-950 transition-colors cursor-pointer shrink-0"
                    title="Next"
                  >
                    <span className="material-symbols-outlined">keyboard_arrow_right</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
  );
}
