import React, { useState } from 'react';
import { Archive, Search, RefreshCw, Trash2, CheckCircle2, Calendar } from 'lucide-react';
import { Task, Category } from '../types';

interface ArchiveViewProps {
  tasks: Task[];
  categories: Category[];
  onRestoreTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  autoArchive7Days: boolean;
  onToggleAutoArchive: (enabled: boolean) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  tasks,
  categories,
  onRestoreTask,
  onDeleteTask,
  autoArchive7Days,
  onToggleAutoArchive,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-archive 7 days logic:
  // Archived tasks are completed tasks whose completedAt or updatedAt is older than 7 days, OR all completed tasks if user chooses.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const archivedTasks = tasks.filter((t) => {
    if (!t.completed) return false;
    if (!autoArchive7Days) return true; // show all completed tasks in archive if setting enabled
    const compDate = t.completedAt ? new Date(t.completedAt) : new Date(t.updatedAt);
    return compDate <= sevenDaysAgo;
  });

  const filteredTasks = archivedTasks.filter((t) =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryName = (catId?: string) => {
    if (!catId) return null;
    return categories.find((c) => c.id === catId)?.name;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Settings Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
            <Archive className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Task Archive</h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Completed tasks automatically archived after 7 days to keep your active workspace focused.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="text-left">
            <p className="text-xs font-bold text-slate-900 dark:text-white">Auto-Archive (7 Days)</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Move tasks completed &gt; 7 days</p>
          </div>
          <button
            type="button"
            onClick={() => onToggleAutoArchive(!autoArchive7Days)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              autoArchive7Days ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                autoArchive7Days ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search archived tasks..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* Archived Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 mb-3">
              <Archive className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Archived Tasks</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              {autoArchive7Days
                ? 'Tasks marked as completed over 7 days ago will automatically appear here.'
                : 'Auto-archive is currently paused. Toggle it on to automatically manage older completed tasks.'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const catName = getCategoryName(task.categoryId);
            const compDateStr = task.completedAt || task.updatedAt;
            return (
              <div
                key={task.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-slate-700 line-through dark:text-slate-300 truncate">
                      {task.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Archived / Completed: {new Date(compDateStr).toLocaleDateString()}
                      </span>
                      {catName && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {catName}
                        </span>
                      )}
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {task.priority} Priority
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => onRestoreTask(task)}
                    className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/80 dark:text-indigo-300 dark:hover:bg-indigo-900"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/80 dark:text-rose-300 dark:hover:bg-rose-900"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
