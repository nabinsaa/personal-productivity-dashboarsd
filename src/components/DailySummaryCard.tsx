import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Target, Lightbulb, Quote, CheckCircle2 } from 'lucide-react';
import { Note, Task, Reminder, DailyGoal } from '../types';

interface DailySummaryCardProps {
  notes: Note[];
  tasks: Task[];
  reminders: Reminder[];
  dailyGoals: DailyGoal[];
}

interface SummaryData {
  briefing: string;
  insights: string[];
  focusAreas: string[];
  encouragement: string;
}

export const DailySummaryCard: React.FC<DailySummaryCardProps> = ({
  notes,
  tasks,
  reminders,
  dailyGoals,
}) => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/gemini/daily-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, tasks, reminders, dailyGoals }),
      });

      const data = await res.json();
      if (data.success && data.summary) {
        setSummary(data.summary);
      } else {
        throw new Error(data.error || 'Failed to generate summary');
      }
    } catch (err: any) {
      console.error('AI Summary error:', err);
      // Fallback local summary computation if API fails
      const pendingTasksCount = tasks.filter((t) => !t.completed).length;
      const completedTasksCount = tasks.filter((t) => t.completed).length;
      const highPriorityCount = tasks.filter((t) => !t.completed && t.priority === 'High').length;

      setSummary({
        briefing: `You have ${pendingTasksCount} pending tasks today (${highPriorityCount} high priority) and ${notes.length} total notes stored.`,
        insights: [
          `Task completion rate is standing at ${tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0}%.`,
          highPriorityCount > 0
            ? `${highPriorityCount} urgent tasks require immediate attention today.`
            : 'No high-priority task bottlenecks detected currently.',
          `You have ${dailyGoals.filter((g) => g.completed).length}/${dailyGoals.length} daily goals completed so far.`,
        ],
        focusAreas: tasks
          .filter((t) => !t.completed)
          .slice(0, 3)
          .map((t) => t.title),
        encouragement: 'Focus on one high-impact task at a time to maximize productivity!',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateSummary();
  }, [tasks.length, notes.length]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-200 bg-linear-to-br from-indigo-50/80 via-white to-purple-50/50 p-6 shadow-xs dark:border-indigo-900/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-indigo-100/80 pb-4 dark:border-indigo-900/40 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 dark:bg-indigo-500">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Daily Summary & Focus Insights
              </h2>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                Smart Analytics
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Automated executive briefing based on your active workload
            </p>
          </div>
        </div>

        <button
          onClick={generateSummary}
          disabled={loading}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Analyzing...' : 'Refresh AI Insights'}</span>
        </button>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center gap-3">
          <Sparkles className="h-7 w-7 text-indigo-600 dark:text-indigo-400 animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Gemini AI is analyzing your notes, tasks, and schedules...
          </p>
        </div>
      ) : summary ? (
        <div className="mt-5 space-y-5">
          {/* Executive Briefing */}
          <div className="rounded-2xl border border-indigo-100 bg-white/90 p-4 dark:border-indigo-900/30 dark:bg-slate-800/80">
            <p className="text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-200">
              {summary.briefing}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Insights */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 mb-2.5 text-amber-600 dark:text-amber-400">
                <Lightbulb className="h-4 w-4" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Key Insights</h3>
              </div>
              <ul className="space-y-2">
                {summary.insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Focus Areas */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 mb-2.5 text-indigo-600 dark:text-indigo-400">
                <Target className="h-4 w-4" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Today's Recommended Focus
                </h3>
              </div>
              <ul className="space-y-2">
                {summary.focusAreas.length === 0 ? (
                  <li className="text-xs text-slate-400 italic">No pending focus items. All clear!</li>
                ) : (
                  summary.focusAreas.map((area, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span className="font-medium">{area}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          {/* Encouragement Banner */}
          {summary.encouragement && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-indigo-600/10 p-3.5 text-xs font-semibold text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200">
              <Quote className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span className="italic">"{summary.encouragement}"</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
