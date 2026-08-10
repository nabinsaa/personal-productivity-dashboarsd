import React, { useState } from 'react';
import { Bell, Plus, Trash2, Edit2, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { Reminder, Task, Note } from '../types';

interface RemindersViewProps {
  reminders: Reminder[];
  tasks: Task[];
  notes: Note[];
  onOpenCreateReminder: () => void;
  onEditReminder: (reminder: Reminder) => void;
  onDeleteReminder: (id: string) => Promise<void>;
  onToggleComplete: (reminder: Reminder) => Promise<void>;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  reminders,
  tasks,
  notes,
  onOpenCreateReminder,
  onEditReminder,
  onDeleteReminder,
  onToggleComplete,
}) => {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');

  const nowIso = new Date().toISOString();

  const filteredReminders = reminders.filter((r) => {
    if (filter === 'upcoming') return !r.completed;
    if (filter === 'completed') return r.completed;
    return true;
  });

  const getLinkedTask = (taskId?: string) => {
    if (!taskId) return null;
    return tasks.find((t) => t.id === taskId);
  };

  const getLinkedNote = (noteId?: string) => {
    if (!noteId) return null;
    return notes.find((n) => n.id === noteId);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top action bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setFilter('upcoming')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filter === 'upcoming'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Upcoming ({reminders.filter((r) => !r.completed).length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filter === 'completed'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Completed ({reminders.filter((r) => r.completed).length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            All ({reminders.length})
          </button>
        </div>

        <button
          onClick={onOpenCreateReminder}
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Set Reminder</span>
        </button>
      </div>

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
          <Bell className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Reminders</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Set reminders for important task deadlines or note reviews.
          </p>
          <button
            onClick={onOpenCreateReminder}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-600"
          >
            <Plus className="h-4 w-4" />
            <span>Set Reminder</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map((rem) => {
            const linkedTask = getLinkedTask(rem.taskId);
            const linkedNote = getLinkedNote(rem.noteId);
            const isPast = rem.dateTime < nowIso && !rem.completed;

            return (
              <div
                key={rem.id}
                className={`group flex items-center justify-between rounded-2xl border p-4 shadow-xs transition-all ${
                  rem.completed
                    ? 'border-slate-200 bg-slate-50/50 opacity-60 dark:border-slate-800 dark:bg-slate-900/50'
                    : isPast
                    ? 'border-rose-200 bg-rose-50/30 dark:border-rose-950/50 dark:bg-rose-950/10'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <button
                    onClick={() => onToggleComplete(rem)}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      rem.completed
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 hover:border-amber-500 dark:border-slate-700'
                    }`}
                  >
                    {rem.completed && <CheckCircle2 className="h-4 w-4" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <h3
                      onClick={() => onEditReminder(rem)}
                      className={`cursor-pointer font-bold text-sm truncate ${
                        rem.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400'
                      }`}
                    >
                      {rem.title}
                    </h3>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className={`flex items-center gap-1 font-semibold ${isPast ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(rem.dateTime).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>

                      {linkedTask && (
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                          Task: {linkedTask.title}
                        </span>
                      )}

                      {linkedNote && (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                          Note: {linkedNote.title}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-3">
                  <button
                    onClick={() => onEditReminder(rem)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this reminder?')) onDeleteReminder(rem.id);
                    }}
                    className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
