import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  Zap,
  Award,
  Filter,
  BarChart2,
  PieChart as PieIcon,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
  CheckSquare,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Task, Category, DailyGoal } from '../types';

interface TrendsViewProps {
  tasks: Task[];
  categories: Category[];
  dailyGoals?: DailyGoal[];
  onSelectTask?: (task: Task) => void;
  onToggleTaskComplete?: (task: Task) => void;
}

type TimeFrame = '7' | '14' | '30';
type ChartMetric = 'completion_rate' | 'volume';

export const TrendsView: React.FC<TrendsViewProps> = ({
  tasks,
  categories,
  dailyGoals = [],
  onSelectTask,
  onToggleTaskComplete,
}) => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('30');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('completion_rate');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const daysCount = parseInt(timeFrame, 10);

  // Filter tasks by selected category if any
  const filteredTasks = useMemo(() => {
    if (selectedCategory === 'all') return tasks;
    return tasks.filter((t) => t.categoryId === selectedCategory);
  }, [tasks, selectedCategory]);

  // Generate date array for the selected time frame (up to today)
  const timeFrameData = useMemo(() => {
    const result = [];
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Tasks completed on this day
      const completedOnDay = filteredTasks.filter((t) => {
        if (!t.completed) return false;
        const compDate = t.completedAt ? t.completedAt.split('T')[0] : t.updatedAt.split('T')[0];
        return compDate === dateStr;
      });

      // Tasks created or due on this day
      const createdOnDay = filteredTasks.filter((t) => {
        const createDate = t.createdAt ? t.createdAt.split('T')[0] : '';
        const dueDate = t.dueDate || '';
        return createDate === dateStr || dueDate === dateStr;
      });

      const completedCount = completedOnDay.length;
      const createdCount = createdOnDay.length;

      // Completion Rate % calculation
      // If there are tasks created/due or completed, compute rate; otherwise 100% if no tasks due, or 0%
      let rate = 0;
      const denominator = Math.max(completedCount, createdCount);
      if (denominator > 0) {
        rate = Math.min(100, Math.round((completedCount / denominator) * 100));
      } else {
        // If user completed previously existing pending tasks on this day
        rate = completedCount > 0 ? 100 : 0;
      }

      result.push({
        date: dateStr,
        dayLabel: monthDay,
        fullLabel: `${dayName}, ${monthDay}`,
        dayOfWeek: dayName,
        completed: completedCount,
        created: createdCount,
        completionRate: rate,
      });
    }

    return result;
  }, [filteredTasks, daysCount]);

  // 7-Day Weekly Productivity & Goal Streaks Data
  const weeklyProductivityData = useMemo(() => {
    const result = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Completed tasks on this day
      const completedOnDay = filteredTasks.filter((t) => {
        if (!t.completed) return false;
        const compDate = t.completedAt ? t.completedAt.split('T')[0] : t.updatedAt.split('T')[0];
        return compDate === dateStr;
      }).length;

      // Calculate total goal streaks active for goals completed on/up to this date
      const activeGoalStreaks = dailyGoals.reduce((sum, goal) => {
        if (goal.completed) {
          if (goal.lastCompletedDate === dateStr || (!goal.lastCompletedDate && i === 0)) {
            return sum + (goal.streak || 1);
          }
        }
        return sum;
      }, 0);

      const goalsCompletedOnDay = dailyGoals.filter(
        (g) => g.completed && (g.lastCompletedDate === dateStr || (!g.lastCompletedDate && i === 0))
      ).length;

      result.push({
        day: `${dayName} ${d.getDate()}`,
        fullLabel: `${dayName}, ${monthDay}`,
        dateStr,
        completedTasks: completedOnDay,
        goalStreakScore: activeGoalStreaks,
        goalsCompleted: goalsCompletedOnDay,
      });
    }

    return result;
  }, [filteredTasks, dailyGoals]);

  // Overall Statistics for Selected Period
  const totalCompletedPeriod = useMemo(() => {
    return timeFrameData.reduce((acc, curr) => acc + curr.completed, 0);
  }, [timeFrameData]);

  const totalCreatedPeriod = useMemo(() => {
    return timeFrameData.reduce((acc, curr) => acc + curr.created, 0);
  }, [timeFrameData]);

  const avgCompletionRatePeriod = useMemo(() => {
    const activeDays = timeFrameData.filter((d) => d.completed > 0 || d.created > 0);
    if (activeDays.length === 0) return 0;
    const sum = activeDays.reduce((acc, curr) => acc + curr.completionRate, 0);
    return Math.round(sum / activeDays.length);
  }, [timeFrameData]);

  const avgDailyCompleted = useMemo(() => {
    if (daysCount === 0) return 0;
    return (totalCompletedPeriod / daysCount).toFixed(1);
  }, [totalCompletedPeriod, daysCount]);

  // Day-of-Week Efficiency Breakdown
  const dayOfWeekData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const map: Record<string, { completed: number; totalDays: number; ratesSum: number }> = {
      Mon: { completed: 0, totalDays: 0, ratesSum: 0 },
      Tue: { completed: 0, totalDays: 0, ratesSum: 0 },
      Wed: { completed: 0, totalDays: 0, ratesSum: 0 },
      Thu: { completed: 0, totalDays: 0, ratesSum: 0 },
      Fri: { completed: 0, totalDays: 0, ratesSum: 0 },
      Sat: { completed: 0, totalDays: 0, ratesSum: 0 },
      Sun: { completed: 0, totalDays: 0, ratesSum: 0 },
    };

    timeFrameData.forEach((item) => {
      if (map[item.dayOfWeek]) {
        map[item.dayOfWeek].completed += item.completed;
        map[item.dayOfWeek].totalDays += 1;
        map[item.dayOfWeek].ratesSum += item.completionRate;
      }
    });

    return days.map((day) => {
      const info = map[day];
      const avgRate = info.totalDays > 0 ? Math.round(info.ratesSum / info.totalDays) : 0;
      return {
        day,
        completed: info.completed,
        avgRate,
      };
    });
  }, [timeFrameData]);

  // Best Peak Productivity Day
  const bestDay = useMemo(() => {
    if (dayOfWeekData.length === 0) return 'N/A';
    const sorted = [...dayOfWeekData].sort((a, b) => b.completed - a.completed);
    return sorted[0].completed > 0 ? sorted[0].day : 'N/A';
  }, [dayOfWeekData]);

  // Priority Breakdown Completion Rates
  const priorityData = useMemo(() => {
    const priorities: ('High' | 'Medium' | 'Low')[] = ['High', 'Medium', 'Low'];
    return priorities.map((p) => {
      const pTasks = filteredTasks.filter((t) => t.priority === p);
      const pComp = pTasks.filter((t) => t.completed).length;
      const rate = pTasks.length > 0 ? Math.round((pComp / pTasks.length) * 100) : 0;
      return {
        priority: p,
        total: pTasks.length,
        completed: pComp,
        rate,
        color: p === 'High' ? '#F43F5E' : p === 'Medium' ? '#F59E0B' : '#10B981',
      };
    });
  }, [filteredTasks]);

  // Category Breakdown Completion Data
  const categoryData = useMemo(() => {
    return categories
      .map((cat) => {
        const catTasks = tasks.filter((t) => t.categoryId === cat.id);
        const comp = catTasks.filter((t) => t.completed).length;
        const rate = catTasks.length > 0 ? Math.round((comp / catTasks.length) * 100) : 0;
        return {
          id: cat.id,
          name: cat.name,
          completed: comp,
          total: catTasks.length,
          rate,
          color:
            cat.color === 'emerald'
              ? '#10B981'
              : cat.color === 'blue'
              ? '#3B82F6'
              : cat.color === 'purple'
              ? '#8B5CF6'
              : cat.color === 'rose'
              ? '#F43F5E'
              : '#F59E0B',
        };
      })
      .filter((c) => c.total > 0);
  }, [categories, tasks]);

  // Productivity Health Index calculation (0-100)
  const productivityScore = useMemo(() => {
    if (filteredTasks.length === 0) return 100;
    const completedRatio = filteredTasks.filter((t) => t.completed).length / filteredTasks.length;
    const goalCompletionRatio =
      dailyGoals.length > 0 ? dailyGoals.filter((g) => g.completed).length / dailyGoals.length : 1;
    const score = Math.round(completedRatio * 60 + goalCompletionRatio * 20 + Math.min(20, (totalCompletedPeriod / daysCount) * 5));
    return Math.min(100, Math.max(0, score));
  }, [filteredTasks, dailyGoals, totalCompletedPeriod, daysCount]);

  // Recent Completed Tasks in this period
  const recentCompletedTasks = useMemo(() => {
    return filteredTasks
      .filter((t) => t.completed)
      .sort((a, b) => {
        const timeA = new Date(a.completedAt || a.updatedAt).getTime();
        const timeB = new Date(b.completedAt || b.updatedAt).getTime();
        return timeB - timeA;
      })
      .slice(0, 6);
  }, [filteredTasks]);

  const getCategoryName = (catId?: string) => {
    if (!catId) return 'General';
    return categories.find((c) => c.id === catId)?.name || 'General';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Time Frame Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Productivity Trends</span>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                  {timeFrame} Days
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualize completion rates, task throughput velocity, and habits over time
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Dropdown Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-800/80 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Switcher */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800">
            {(['7', '14', '30'] as TimeFrame[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFrame(tf)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  timeFrame === tf
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {tf} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 30-Day Completion Rate */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Avg. Completion Rate
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {avgCompletionRatePeriod}%
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
              <ArrowUpRight className="h-3.5 w-3.5" /> Optimal
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, avgCompletionRatePeriod)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Completed Volume */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Completed Tasks ({timeFrame}d)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {totalCompletedPeriod}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              / {totalCreatedPeriod} due/created
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            ~{avgDailyCompleted} tasks completed daily
          </p>
        </div>

        {/* Card 3: Best Focus Day */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Peak Focus Day
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {bestDay}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Highest historical task output day of week
          </p>
        </div>

        {/* Card 4: Productivity Index */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Productivity Index
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {productivityScore}
            </span>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
              / 100
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-purple-600 transition-all duration-500"
              style={{ width: `${productivityScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Completion Rate & Output Volume Trend</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daily task completion rate (%) compared against total completed task count over the last {daysCount} days
            </p>
          </div>

          {/* Metric Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800 text-xs">
            <button
              onClick={() => setChartMetric('completion_rate')}
              className={`rounded-lg px-3 py-1 font-semibold transition-colors cursor-pointer ${
                chartMetric === 'completion_rate'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              Rate (%)
            </button>
            <button
              onClick={() => setChartMetric('volume')}
              className={`rounded-lg px-3 py-1 font-semibold transition-colors cursor-pointer ${
                chartMetric === 'volume'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              Volume (Count)
            </button>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartMetric === 'completion_rate' ? (
              <AreaChart data={timeFrameData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                  }}
                  formatter={(val: any, name: any) => [
                    name === 'completionRate' ? `${val}% Completion Rate` : `${val} tasks`,
                    name === 'completionRate' ? 'Rate' : 'Tasks',
                  ]}
                  labelFormatter={(label, items) => {
                    if (items && items[0]) {
                      return (items[0].payload as any).fullLabel;
                    }
                    return label;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completionRate"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#rateGradient)"
                  dot={{ r: 3, fill: '#4f46e5' }}
                  activeDot={{ r: 6, fill: '#818cf8' }}
                />
              </AreaChart>
            ) : (
              <ComposedChart data={timeFrameData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="completed" name="Completed Tasks" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="created" name="Created/Due Tasks" fill="#818CF8" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Productivity & Goal Streaks (Last 7 Days) Recharts Card */}
      <div className="rounded-3xl border border-indigo-200 bg-linear-to-r from-indigo-50/60 via-purple-50/30 to-white p-6 shadow-xs dark:border-indigo-900/60 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Weekly Productivity & Goal Streaks</span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Last 7 Days
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Visualizing completed tasks volume alongside habit goal streaks over the past week
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="h-3 w-3 rounded-md bg-emerald-500 inline-block" />
              <span>Completed Tasks</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <span className="h-3 w-3 rounded-full bg-indigo-600 inline-block" />
              <span>Goal Streaks</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={weeklyProductivityData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '16px',
                  color: '#fff',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                }}
                formatter={(val: any, name: any) => [
                  name === 'completedTasks' ? `${val} tasks completed` : `${val} streak points`,
                  name === 'completedTasks' ? 'Tasks Completed' : 'Goal Streak Points',
                ]}
                labelFormatter={(label, items) => {
                  if (items && items[0]) {
                    return (items[0].payload as any).fullLabel;
                  }
                  return label;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar
                dataKey="completedTasks"
                name="Completed Tasks"
                fill="#10B981"
                radius={[6, 6, 0, 0]}
                barSize={28}
              />
              <Line
                type="monotone"
                dataKey="goalStreakScore"
                name="Goal Streaks"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 5, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7, fill: '#818cf8' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day of Week Efficiency Bar Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Day of Week Efficiency
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Average completion volume per day of week
                </p>
              </div>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  formatter={(val: any) => [`${val} tasks completed`, 'Total Output']}
                />
                <Bar dataKey="completed" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Completion Rates Horizontal Bar Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Priority Completion Rates
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Completion percentage by priority level
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {priorityData.map((p) => (
              <div key={p.priority} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span>{p.priority} Priority</span>
                  </span>
                  <span className="text-slate-900 dark:text-white">
                    {p.rate}% ({p.completed}/{p.total})
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${p.rate}%`, backgroundColor: p.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* AI Productivity Insight Box */}
          <div className="mt-6 rounded-2xl bg-indigo-50/70 p-3.5 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/50 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
              <strong>Smart Tip:</strong> You complete High Priority tasks at a rate of{' '}
              {priorityData.find((p) => p.priority === 'High')?.rate || 0}%. High focus in the morning
              boosts task throughput!
            </p>
          </div>
        </div>
      </div>

      {/* Category Productivity Breakdown & Recent Completions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <PieIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Category Split
              </h3>
            </div>
          </div>

          {categoryData.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">No categorised tasks found.</p>
          ) : (
            <div className="space-y-3">
              {categoryData.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-500 dark:text-slate-400">{cat.completed} done</span>
                    <span className="font-bold text-slate-900 dark:text-white">{cat.rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Completed Log */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Completed Tasks Log ({recentCompletedTasks.length})
              </h3>
            </div>
          </div>

          {recentCompletedTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No completed tasks logged recently in this timeframe.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentCompletedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onSelectTask && onSelectTask(task)}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <h4 className="truncate text-xs font-bold text-slate-900 dark:text-white line-through opacity-80">
                      {task.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {getCategoryName(task.categoryId)} • Completed{' '}
                      {task.completedAt
                        ? new Date(task.completedAt).toLocaleDateString()
                        : 'Recently'}
                    </p>
                  </div>
                  {onToggleTaskComplete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTaskComplete(task);
                      }}
                      className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 transition-colors"
                      title="Mark as incomplete"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
