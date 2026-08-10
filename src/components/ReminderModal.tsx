import React, { useState, useEffect } from 'react';
import { X, Bell, Trash2 } from 'lucide-react';
import { Reminder, Task, Note } from '../types';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reminder: {
    title: string;
    dateTime: string;
    taskId?: string;
    noteId?: string;
    completed?: boolean;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  reminderToEdit?: Reminder | null;
  tasks: Task[];
  notes: Note[];
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  reminderToEdit,
  tasks,
  notes,
}) => {
  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [taskId, setTaskId] = useState('');
  const [noteId, setNoteId] = useState('');
  const [completed, setCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (reminderToEdit) {
      setTitle(reminderToEdit.title);
      setDateTime(reminderToEdit.dateTime || '');
      setTaskId(reminderToEdit.taskId || '');
      setNoteId(reminderToEdit.noteId || '');
      setCompleted(reminderToEdit.completed || false);
    } else {
      setTitle('');
      // Default datetime to 1 hour from now
      const defaultDate = new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16);
      setDateTime(defaultDate);
      setTaskId('');
      setNoteId('');
      setCompleted(false);
    }
  }, [reminderToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateTime) return;

    try {
      setIsSaving(true);
      await onSave({
        title: title.trim(),
        dateTime,
        taskId: taskId || undefined,
        noteId: noteId || undefined,
        completed,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (reminderToEdit && onDelete) {
      if (confirm('Are you sure you want to delete this reminder?')) {
        await onDelete(reminderToEdit.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {reminderToEdit ? 'Edit Reminder' : 'Set New Reminder'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reminder Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call dentist or check presentation slides"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Link to Task (Optional)
              </label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
              >
                <option value="">None</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Link to Note (Optional)
              </label>
              <select
                value={noteId}
                onChange={(e) => setNoteId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
              >
                <option value="">None</option>
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title || 'Untitled Note'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
            {reminderToEdit && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-600 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : reminderToEdit ? 'Save Changes' : 'Set Reminder'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
