import React, { useState } from 'react';
import { DailySummaryCard } from '../components/DailySummaryCard';
import {
  FileText,
  CheckSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  Bell,
  Calendar as CalendarIcon,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  Target,
  Flame,
  Trash2,
  Check,
  GripVertical,
  Zap,
  Repeat,
  RotateCcw,
} from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { Note, Task, Reminder, Category, ActiveTab, DailyGoal } from '../types';

const DragDropContextAny = DragDropContext as any;
const DroppableAny = Droppable as any;
const DraggableAny = Draggable as any;

interface DashboardViewProps {
  notes: Note[];
  tasks: Task[];
  reminders: Reminder[];
  categories: Category[];
  dailyGoals?: DailyGoal[];
  setActiveTab: (tab: ActiveTab) => void;
  onQuickAdd: (type: 'note' | 'task' | 'reminder') => void;
  onToggleTaskComplete: (task: Task) => void;
  onSelectNote: (note: Note) => void;
  onSelectTask: (task: Task) => void;
  onAddDailyGoal?: (title: string) => Promise<void>;
  onToggleDailyGoal?: (goal: DailyGoal) => Promise<void>;
  onDeleteDailyGoal?: (goalId: string) => Promise<void>;
}

const DEFAULT_WIDGET_ORDER = [
  'smart-suggestions',
  'recent-activity',
  'productivity-chart',
  'daily-goals',
  'todays-tasks',
  'recent-notes',
  'upcoming-reminders',
];

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = new Date().getTime() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  notes,
  tasks,
  reminders,
  categories,
  dailyGoals = [],
  setActiveTab,
  onQuickAdd,
  onToggleTaskComplete,
  onSelectNote,
  onSelectTask,
  onAddDailyGoal,
  onToggleDailyGoal,
  onDeleteDailyGoal,
}) => {
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  // Widget layout order state
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dashboard_widget_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const set = new Set(parsed);
          DEFAULT_WIDGET_ORDER.forEach((w) => set.add(w));
          return Array.from(set);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_WIDGET_ORDER;
  });

  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(widgetOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setWidgetOrder(items);
    try {
      localStorage.setItem('dashboard_widget_order', JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetWidgetOrder = () => {
    setWidgetOrder(DEFAULT_WIDGET_ORDER);
    try {
      localStorage.removeItem('dashboard_widget_order');
    } catch (e) {
      console.error(e);
    }
  };

  const totalNotes = notes.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = tasks.filter((t) => !t.completed).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter(
    (t) => !t.completed && t.dueDate && t.dueDate < todayStr
  ).length;

  const highPriorityTasks = tasks.filter((t) => !t.completed && t.priority === 'High').length;
  const todaysTasks = tasks.filter((t) => t.dueDate === todayStr);

  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  const upcomingReminders = reminders
    .filter((r) => !r.completed)
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, 4);

  const getCategoryName = (catId?: string) => {
    if (!catId) return null;
    return categories.find((c) => c.id === catId)?.name;
  };

  // Completion Rate calculation
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Last 7 Days Productivity Data for LineChart
  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

    const completedCount = tasks.filter((t) => {
      if (!t.completed) return false;
      const tCompDate = t.completedAt ? t.completedAt.split('T')[0] : t.updatedAt.split('T')[0];
      return tCompDate === dateStr;
    }).length;

    return {
      day: `${dayLabel} ${d.getDate()}`,
      completed: completedCount,
    };
  });

  const total7DayCompleted = last7DaysData.reduce((acc, curr) => acc + curr.completed, 0);

  // Pie Chart Data: Task Status Distribution
  const statusPieData = [
    { name: 'Completed', value: completedTasks, color: '#10B981' },
    { name: 'Pending', value: Math.max(0, pendingTasks - overdueTasks), color: '#F59E0B' },
    { name: 'Overdue', value: overdueTasks, color: '#F43F5E' },
  ].filter((item) => item.value > 0);

  const emptyPieData = [{ name: 'No Tasks', value: 1, color: '#E2E8F0' }];

  // Smart Suggestions calculation logic
  const getSmartSuggestions = () => {
    const pending = tasks.filter((t) => !t.completed);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const currentHour = new Date().getHours();
    const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';

    const scored = pending.map((task) => {
      let score = 0;
      const reasons: string[] = [];

      if (task.priority === 'High') {
        score += 35;
        reasons.push('High Priority');
      }

      if (task.dueDate) {
        if (task.dueDate < todayStr) {
          score += 45;
          reasons.push('Overdue');
        } else if (task.dueDate === todayStr) {
          score += 30;
          reasons.push('Due Today');
        } else if (task.dueDate === tomorrowStr) {
          score += 15;
          reasons.push('Due Tomorrow');
        }
      }

      if (task.recurringInterval && task.recurringInterval !== 'none') {
        score += 20;
        reasons.push(`Recurring (${task.recurringInterval})`);
      }

      if (timeOfDay === 'morning' && task.priority === 'High') {
        score += 10;
        reasons.push('Morning Priority Focus');
      }

      return { task, score, reasons };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  };

  const recentActivities = React.useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      timestamp: string;
      timeAgo: string;
      badge: string;
      badgeColor: string;
      icon: any;
      iconBg: string;
      action?: () => void;
    }> = [];

    // 1. Task completions
    tasks
      .filter((t) => t.completed)
      .forEach((t) => {
        const ts = t.completedAt || t.updatedAt || new Date().toISOString();
        list.push({
          id: `task-${t.id}`,
          title: t.title,
          subtitle: 'Task completed',
          timestamp: ts,
          timeAgo: formatTimeAgo(ts),
          badge: 'Completed',
          badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
          icon: CheckCircle2,
          iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400',
          action: () => onSelectTask(t),
        });
      });

    // 2. Note updates/creations
    notes.forEach((n) => {
      const ts = n.updatedAt || n.createdAt || new Date().toISOString();
      list.push({
        id: `note-${n.id}`,
        title: n.title || 'Untitled Note',
        subtitle: 'Note updated',
        timestamp: ts,
        timeAgo: formatTimeAgo(ts),
        badge: 'Note Event',
        badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300',
        icon: FileText,
        iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/80 dark:text-sky-400',
        action: () => onSelectNote(n),
      });
    });

    // 3. Reminders triggers
    reminders.forEach((r) => {
      const ts = r.dateTime || new Date().toISOString();
      list.push({
        id: `rem-${r.id}`,
        title: r.title,
        subtitle: `Reminder scheduled for ${r.dateTime || 'upcoming'}`,
        timestamp: ts,
        timeAgo: formatTimeAgo(ts),
        badge: 'Reminder',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300',
        icon: Bell,
        iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400',
      });
    });

    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [tasks, notes, reminders, onSelectTask, onSelectNote]);

  const smartSuggestions = getSmartSuggestions();

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !onAddDailyGoal) return;
    try {
      setIsAddingGoal(true);
      await onAddDailyGoal(newGoalTitle.trim());
      setNewGoalTitle('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingGoal(false);
    }
  };

  const completedDailyGoalsCount = dailyGoals.filter((g) => g.completed).length;
  const goalProgressPercent =
    dailyGoals.length > 0 ? Math.round((completedDailyGoalsCount / dailyGoals.length) * 100) : 0;

  // Render individual dashboard widgets
  const renderWidget = (widgetId: string, dragHandleProps: any) => {
    switch (widgetId) {
      case 'smart-suggestions':
        return (
          <div className="rounded-3xl border border-indigo-200 bg-linear-to-r from-indigo-50/90 to-purple-50/90 p-5 shadow-xs dark:border-indigo-900/60 dark:from-indigo-950/40 dark:to-purple-950/40">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-900/50 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Smart Suggestions</span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                      AI Logic
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Smart task suggestions based on priorities, due dates, and recurring routines
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  {...dragHandleProps}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                  title="Drag to rearrange widget"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
              </div>
            </div>

            {smartSuggestions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                🎉 You're all caught up! No urgent high-priority or upcoming tasks right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {smartSuggestions.map(({ task, reasons }) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-2xl bg-white p-3.5 border border-indigo-100/80 shadow-xs dark:bg-slate-900 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {reasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                              reason.includes('High Priority') || reason.includes('Overdue')
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                                : reason.includes('Due Today')
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                            }`}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                      <h3
                        onClick={() => onSelectTask(task)}
                        className="truncate text-xs font-bold text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {task.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleTaskComplete(task)}
                      className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors shrink-0 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Complete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'recent-activity':
        return (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Recent Activity Feed</span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                      Live
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Latest task completions, note updates, and reminder events
                  </p>
                </div>
              </div>

              <div
                {...dragHandleProps}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                title="Drag to rearrange widget"
              >
                <GripVertical className="h-4 w-4" />
              </div>
            </div>

            {recentActivities.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No recent activity recorded yet. Complete tasks or create notes to see live updates!
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivities.map((act) => {
                  const IconComp = act.icon;
                  return (
                    <div
                      key={act.id}
                      onClick={act.action}
                      className={`flex items-center justify-between rounded-2xl p-3 border border-slate-100 bg-slate-50/60 dark:border-slate-800/80 dark:bg-slate-800/30 transition-all ${
                        act.action ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-slate-800/80' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${act.iconBg}`}>
                          <IconComp className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-xs font-bold text-slate-900 dark:text-white">
                            {act.title}
                          </h4>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {act.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${act.badgeColor}`}>
                          {act.badge}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {act.timeAgo}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'productivity-chart':
        return (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Productivity Analytics
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    7-day trend line & task completion breakdown
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('trends')}
                  className="flex items-center gap-1 rounded-xl bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:text-indigo-300 dark:hover:bg-indigo-900 transition-colors cursor-pointer"
                  title="View full 30-Day Productivity Trends dashboard"
                >
                  <span>30-Day Trends</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
                <div
                  {...dragHandleProps}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                  title="Drag to rearrange widget"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Line chart */}
              <div className="lg:col-span-2 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last7DaysData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(value: any) => [`${value} tasks completed`, 'Completed']}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#4f46e5' }}
                      activeDot={{ r: 6, fill: '#818cf8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Pie chart */}
              <div className="flex flex-col items-center justify-around h-56">
                <div className="w-full h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData.length > 0 ? statusPieData : emptyPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {(statusPieData.length > 0 ? statusPieData : emptyPieData).map(
                          (entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          )
                        )}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-around w-full gap-1 text-[11px] font-medium">
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-600 dark:text-slate-300">Done ({completedTasks})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-600 dark:text-slate-300">
                      Pending ({Math.max(0, pendingTasks - overdueTasks)})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span className="text-slate-600 dark:text-slate-300">Overdue ({overdueTasks})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'daily-goals':
        return (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Daily Goals & Habits</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Track small daily targets and keep your streaks active
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-28 sm:w-36 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                      style={{ width: `${goalProgressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-10">
                    {goalProgressPercent}%
                  </span>
                </div>
                <div
                  {...dragHandleProps}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                  title="Drag to rearrange widget"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Form to Add Goal */}
            <form onSubmit={handleAddGoal} className="mt-4 flex items-center gap-2">
              <input
                type="text"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="Add a daily goal (e.g., Read 15 mins, Drink 2L water, Exercise)..."
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
              />
              <button
                type="submit"
                disabled={isAddingGoal || !newGoalTitle.trim()}
                className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Goal</span>
              </button>
            </form>

            {/* Goals List */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dailyGoals.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  No daily goals set yet. Add one above to start tracking your daily habits!
                </div>
              ) : (
                dailyGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      goal.completed
                        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                        : 'border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleDailyGoal && onToggleDailyGoal(goal)}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                          goal.completed
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 hover:border-indigo-500 dark:border-slate-700'
                        }`}
                      >
                        {goal.completed && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <span
                        className={`truncate text-xs font-semibold ${
                          goal.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {goal.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {goal.streak > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                          <Flame className="h-3 w-3 fill-amber-500 text-amber-500" />
                          <span>{goal.streak}d</span>
                        </span>
                      )}
                      {onDeleteDailyGoal && (
                        <button
                          type="button"
                          onClick={() => onDeleteDailyGoal(goal.id)}
                          className="rounded-lg p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'todays-tasks':
        return (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Today's Tasks</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer mr-1"
                >
                  <span>View All</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
                <div
                  {...dragHandleProps}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                  title="Drag to rearrange widget"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {todaysTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  No tasks due for today. Click "+ Add New Task" to schedule one!
                </div>
              ) : (
                todaysTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800/80 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggleTaskComplete(task)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
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

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          task.priority === 'High'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                            : task.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'recent-notes':
        return (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Notes</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('notes')}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer mr-1"
                >
                  <span>View All</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
                <div
                  {...dragHandleProps}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                  title="Drag to rearrange widget"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentNotes.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  No notes created yet. Click "Create Note" to start writing!
                </div>
              ) : (
                recentNotes.map((note) => {
                  const catName = getCategoryName(note.categoryId);
                  return (
                    <div
                      key={note.id}
                      onClick={() => onSelectNote(note)}
                      className="cursor-pointer rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 hover:border-indigo-300 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-indigo-500 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="truncate text-xs font-bold text-slate-900 dark:text-white">
                          {note.title || 'Untitled Note'}
                        </h3>
                        {note.isPinned && <span className="text-amber-500 text-xs">📌</span>}
                      </div>
                      <p className="line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {note.content || 'Empty note'}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                        {catName && (
                          <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {catName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );

      case 'upcoming-reminders':
        return (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Upcoming Reminders</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('reminders')}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer mr-1"
                >
                  <span>Manage Reminders</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
                <div
                  {...dragHandleProps}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                  title="Drag to rearrange widget"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {upcomingReminders.length === 0 ? (
                <div className="col-span-full py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                  No upcoming reminders set.
                </div>
              ) : (
                upcomingReminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-amber-50/40 p-3.5 dark:border-slate-800 dark:bg-amber-950/20"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        {new Date(rem.dateTime).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                        {rem.title}
                      </h3>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-indigo-600 to-indigo-800 p-6 sm:p-8 text-white shadow-lg dark:from-indigo-900 dark:to-slate-900">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md mb-3">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Productivity Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back!
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-indigo-100 font-medium">
            You have <span className="font-bold text-white">{pendingTasks} pending tasks</span> ({completionRate}% completed) and{' '}
            <span className="font-bold text-white">{upcomingReminders.length} upcoming reminders</span> today.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onQuickAdd('task')}
              className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-indigo-900 shadow-sm hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 text-indigo-600" />
              <span>Add New Task</span>
            </button>
            <button
              onClick={() => onQuickAdd('note')}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-700/80 px-4 py-2 text-xs font-semibold text-white border border-indigo-400/30 hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Create Note</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gemini AI Daily Summary & Focus Strategy Card */}
      <DailySummaryCard
        notes={notes}
        tasks={tasks}
        reminders={reminders}
        dailyGoals={dailyGoals}
      />

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div
          onClick={() => setActiveTab('notes')}
          className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Notes</span>
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{totalNotes}</p>
        </div>

        <div
          onClick={() => setActiveTab('tasks')}
          className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Tasks</span>
            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{totalTasks}</p>
        </div>

        <div
          onClick={() => setActiveTab('tasks')}
          className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed</span>
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{completedTasks}</p>
        </div>

        <div
          onClick={() => setActiveTab('tasks')}
          className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending</span>
            <div className="rounded-xl bg-amber-100 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{pendingTasks}</p>
        </div>

        <div
          onClick={() => setActiveTab('tasks')}
          className="col-span-2 sm:col-span-1 cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">High Priority</span>
            <div className="rounded-xl bg-rose-100 p-2 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-rose-600 dark:text-rose-400">{highPriorityTasks}</p>
        </div>
      </div>

      {/* Widget Layout Header & Customization Controls */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Customizable Grid Layout (Drag handles to reorder widgets)
          </span>
        </div>
        <button
          onClick={handleResetWidgetOrder}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Layout</span>
        </button>
      </div>

      {/* Drag & Drop Reorderable Widgets System */}
      <DragDropContextAny onDragEnd={handleOnDragEnd}>
        <DroppableAny droppableId="dashboard-widgets">
          {(provided: any) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-6"
            >
              {widgetOrder.map((widgetId, index) => (
                <DraggableAny key={widgetId} draggableId={widgetId} index={index}>
                  {(dragProvided: any, snapshot: any) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={`transition-shadow duration-200 ${
                        snapshot.isDragging ? 'shadow-2xl rounded-3xl z-30 opacity-95 scale-[1.01]' : ''
                      }`}
                    >
                      {renderWidget(widgetId, dragProvided.dragHandleProps)}
                    </div>
                  )}
                </DraggableAny>
              ))}
              {provided.placeholder}
            </div>
          )}
        </DroppableAny>
      </DragDropContextAny>
    </div>
  );
};
