import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, CheckSquare, Grid, ListFilter } from 'lucide-react';
import { Task, Category } from '../types';

interface CalendarViewProps {
  tasks: Task[];
  categories: Category[];
  onOpenCreateTaskWithDate: (dateStr: string) => void;
  onSelectTask: (task: Task) => void;
  onToggleTaskComplete: (task: Task) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  categories,
  onOpenCreateTaskWithDate,
  onSelectTask,
  onToggleTaskComplete,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday

  // Helper to format Date to YYYY-MM-DD in local time
  const formatToISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatToISO(new Date());

  // Week calculation (Sunday to Saturday)
  const getWeekDays = (baseDate: Date) => {
    const currentDay = baseDate.getDay(); // 0 = Sun
    const sunDate = new Date(baseDate);
    sunDate.setDate(baseDate.getDate() - currentDay);

    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunDate);
      d.setDate(sunDate.getDate() + i);
      weekDays.push(d);
    }
    return weekDays;
  };

  const currentWeekDays = getWeekDays(currentDate);

  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const prevW = new Date(currentDate);
      prevW.setDate(currentDate.getDate() - 7);
      setCurrentDate(prevW);
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const nextW = new Date(currentDate);
      nextW.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextW);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to format YYYY-MM-DD for month view days
  const formatDateStr = (dayNum: number) => {
    const m = (month + 1).toString().padStart(2, '0');
    const d = dayNum.toString().padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Tasks mapped by date
  const tasksByDate: Record<string, Task[]> = {};
  tasks.forEach((task) => {
    if (task.dueDate) {
      if (!tasksByDate[task.dueDate]) tasksByDate[task.dueDate] = [];
      tasksByDate[task.dueDate].push(task);
    }
  });

  const tasksForSelectedDate = tasksByDate[selectedDateStr] || [];

  const weekStartStr = currentWeekDays[0]
    ? `${monthNames[currentWeekDays[0].getMonth()]} ${currentWeekDays[0].getDate()}`
    : '';
  const weekEndStr = currentWeekDays[6]
    ? `${monthNames[currentWeekDays[6].getMonth()]} ${currentWeekDays[6].getDate()}, ${currentWeekDays[6].getFullYear()}`
    : '';

  return (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 cols on desktop) */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          {/* Calendar Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {viewMode === 'month'
                  ? `${monthNames[month]} ${year}`
                  : `${weekStartStr} - ${weekEndStr}`}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    viewMode === 'month'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Month View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('week')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    viewMode === 'week'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Weekly View
                </button>
              </div>

              <button
                onClick={() => setCurrentDate(new Date())}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Today
              </button>
              <button
                onClick={prevPeriod}
                className="rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextPeriod}
                className="rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 pt-4 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* MONTH VIEW */}
          {viewMode === 'month' ? (
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Empty slots before first day */}
              {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded-2xl bg-slate-50/40 dark:bg-slate-800/20" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = formatDateStr(dayNum);
                const dayTasks = tasksByDate[dateStr] || [];
                const isSelected = selectedDateStr === dateStr;
                const isToday = todayStr === dateStr;

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`cursor-pointer flex flex-col justify-between h-16 sm:h-20 rounded-2xl p-1.5 border transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/40'
                        : isToday
                        ? 'border-indigo-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
                        : 'border-slate-100 hover:border-slate-300 dark:border-slate-800/80 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          isToday
                            ? 'flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white'
                            : isSelected
                            ? 'text-indigo-600 dark:text-indigo-300'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {dayNum}
                      </span>
                    </div>

                    {/* Task Indicators */}
                    <div className="space-y-1 overflow-hidden">
                      {dayTasks.slice(0, 2).map((t) => (
                        <div
                          key={t.id}
                          className={`truncate rounded-md px-1 py-0.5 text-[9px] font-bold ${
                            t.completed
                              ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 line-through'
                              : t.priority === 'High'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                          }`}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <span className="text-[9px] font-semibold text-slate-400 pl-1">
                          +{dayTasks.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* WEEKLY VIEW (7-day Grid) */
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
              {currentWeekDays.map((dayDate) => {
                const dateStr = formatToISO(dayDate);
                const dayTasks = tasksByDate[dateStr] || [];
                const isSelected = selectedDateStr === dateStr;
                const isToday = todayStr === dateStr;

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`cursor-pointer flex flex-col justify-between min-h-[180px] sm:min-h-[220px] rounded-2xl p-2.5 border transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/40'
                        : isToday
                        ? 'border-indigo-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
                        : 'border-slate-100 hover:border-slate-300 dark:border-slate-800/80 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">
                          {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            isToday
                              ? 'flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white'
                              : isSelected
                              ? 'text-indigo-600 dark:text-indigo-300'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {dayDate.getDate()}
                        </span>
                      </div>

                      {/* Task Cards in Weekly View */}
                      <div className="space-y-1.5 overflow-y-auto max-h-[140px] pr-0.5">
                        {dayTasks.length === 0 ? (
                          <div className="text-[10px] text-slate-400 italic pt-2 text-center">
                            No tasks
                          </div>
                        ) : (
                          dayTasks.map((t) => (
                            <div
                              key={t.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectTask(t);
                              }}
                              className={`group rounded-lg p-1.5 border text-left text-[11px] font-medium transition-all ${
                                t.completed
                                  ? 'border-slate-200 bg-slate-100/60 text-slate-400 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-500 line-through'
                                  : t.priority === 'High'
                                  ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-200'
                                  : 'border-indigo-100 bg-white text-slate-800 dark:border-indigo-900/40 dark:bg-slate-800 dark:text-slate-200 hover:border-indigo-400'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate font-semibold flex-1">{t.title}</span>
                                <input
                                  type="checkbox"
                                  checked={t.completed}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    onToggleTaskComplete(t);
                                  }}
                                  className="h-3 w-3 rounded border-slate-300 text-indigo-600 cursor-pointer shrink-0"
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCreateTaskWithDate(dateStr);
                      }}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 py-1 text-[10px] font-semibold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-800 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar: Selected Date Tasks & Deadlines */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tasks for {selectedDateStr}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedDateStr === todayStr ? 'Today' : 'Selected Date'}
                </p>
              </div>

              <button
                onClick={() => onOpenCreateTaskWithDate(selectedDateStr)}
                className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            <div className="mt-4 space-y-2.5 max-h-80 overflow-y-auto">
              {tasksForSelectedDate.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  No tasks scheduled for this date.
                </div>
              ) : (
                tasksForSelectedDate.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800/80 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggleTaskComplete(task)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 cursor-pointer shrink-0"
                      />
                      <span
                        onClick={() => onSelectTask(task)}
                        className={`truncate text-xs font-semibold cursor-pointer ${
                          task.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white hover:text-indigo-600'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        task.priority === 'High'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
