import React, { useState, useEffect } from 'react';
import { X, Trash2, Calendar as CalendarIcon, AlertCircle, Repeat, Plus, ListTodo, CheckSquare, Square, Tag as TagIcon } from 'lucide-react';
import { Task, Category, Priority, RecurringInterval } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: {
    title: string;
    description?: string;
    priority: Priority;
    dueDate?: string;
    categoryId?: string;
    reminderDateTime?: string;
    recurringInterval?: RecurringInterval;
    subtasks?: { id: string; title: string; completed: boolean }[];
    tags?: string[];
    completed?: boolean;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  taskToEdit?: Task | null;
  categories: Category[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  taskToEdit,
  categories,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [reminderDateTime, setReminderDateTime] = useState('');
  const [recurringInterval, setRecurringInterval] = useState<RecurringInterval>('none');
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [completed, setCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setPriority(taskToEdit.priority || 'Medium');
      setDueDate(taskToEdit.dueDate || '');
      setCategoryId(taskToEdit.categoryId || '');
      setReminderDateTime(taskToEdit.reminderDateTime || '');
      setRecurringInterval(taskToEdit.recurringInterval || 'none');
      setSubtasks(taskToEdit.subtasks ? [...taskToEdit.subtasks] : []);
      setTags(taskToEdit.tags ? [...taskToEdit.tags] : []);
      setCompleted(taskToEdit.completed || false);
    } else {
      setTitle('');
      setDescription('');
      setPriority('Medium');
      const today = new Date().toISOString().split('T')[0];
      setDueDate(today);
      setCategoryId('');
      setReminderDateTime('');
      setRecurringInterval('none');
      setSubtasks([]);
      setTags([]);
      setCompleted(false);
    }
    setNewSubtaskTitle('');
    setNewTagInput('');
  }, [taskToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const cleaned = newTagInput.trim().replace(/^#/, '');
    if (!cleaned) return;
    if (!tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddSubtask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const newSub = {
      id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setSubtasks([...subtasks, newSub]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(
      subtasks.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleDeleteSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSaving(true);
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        categoryId: categoryId || undefined,
        reminderDateTime: reminderDateTime || undefined,
        recurringInterval,
        subtasks,
        tags,
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
    if (taskToEdit && onDelete) {
      if (confirm('Are you sure you want to delete this task?')) {
        await onDelete(taskToEdit.id);
        onClose();
      }
    }
  };

  const completedSubtasksCount = subtasks.filter((s) => s.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {taskToEdit ? 'Edit Task' : 'Add New Task'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete quarterly report presentation"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add extra context, links, or instructions..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
            />
          </div>

          {/* Subtasks Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800/80 dark:bg-slate-800/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Subtasks Checklist
                </span>
              </div>
              {subtasks.length > 0 && (
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {completedSubtasksCount}/{subtasks.length} done
                </span>
              )}
            </div>

            {/* Subtask list */}
            {subtasks.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between rounded-lg bg-white p-2 border border-slate-100 dark:border-slate-800 dark:bg-slate-800/80"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st.id)}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0"
                      >
                        {st.completed ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                      <span
                        className={`text-xs font-medium truncate ${
                          st.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {st.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(st.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Subtask Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Add a subtask step..."
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Tags Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <TagIcon className="h-3.5 w-3.5 text-indigo-500" />
              <span>Tags</span>
            </label>

            {/* Existing tags chips */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50"
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 cursor-pointer ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag e.g. 'work', 'urgent'..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer shrink-0"
              >
                Add Tag
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
              >
                <option value="">No Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Enhanced Deadline Section */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Task Deadline & Target Date</span>
              </label>

              {/* Relative Deadline Status Badge */}
              {dueDate && (
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const diffDays = Math.round(
                      (new Date(dueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24)
                    );
                    let label = '';
                    let badgeClass = '';
                    if (diffDays === 0) {
                      label = '⚡ Due Today';
                      badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                    } else if (diffDays === 1) {
                      label = '⏳ Due Tomorrow';
                      badgeClass = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
                    } else if (diffDays > 1) {
                      label = `📅 In ${diffDays} days`;
                      badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
                    } else {
                      label = `⚠️ ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} past due`;
                      badgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
                    }
                    return (
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${badgeClass}`}>
                        {label}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: '+3 Days', days: 3 },
                { label: '+1 Week', days: 7 },
                {
                  label: 'Next Mon',
                  getDate: () => {
                    const d = new Date();
                    const day = d.getDay();
                    const diff = d.getDate() + (day === 0 ? 1 : 8 - day);
                    d.setDate(diff);
                    return d.toISOString().split('T')[0];
                  },
                },
                {
                  label: 'End of Month',
                  getDate: () => {
                    const d = new Date();
                    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                    return end.toISOString().split('T')[0];
                  },
                },
              ].map((preset) => {
                let targetDateStr = '';
                if ('getDate' in preset && preset.getDate) {
                  targetDateStr = preset.getDate();
                } else {
                  const d = new Date();
                  d.setDate(d.getDate() + (preset.days || 0));
                  targetDateStr = d.toISOString().split('T')[0];
                }
                const isSelected = dueDate === targetDateStr;

                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDueDate(targetDateStr)}
                    className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  className="rounded-xl px-2 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                >
                  Clear Date
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Custom Date Picker
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Optional Reminder DateTime
                </label>
                <input
                  type="datetime-local"
                  value={reminderDateTime}
                  onChange={(e) => setReminderDateTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Recurring / Repeat
            </label>
            <div className="relative">
              <select
                value={recurringInterval}
                onChange={(e) => setRecurringInterval(e.target.value as RecurringInterval)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Repeat Daily (+1 day on completion)</option>
                <option value="weekly">Repeat Weekly (+7 days on completion)</option>
                <option value="monthly">Repeat Monthly (+1 month on completion)</option>
              </select>
            </div>
            {recurringInterval !== 'none' && (
              <p className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium">
                <Repeat className="h-3 w-3" />
                <span>When marked completed, a new task instance will auto-generate for the next period.</span>
              </p>
            )}
          </div>

          {taskToEdit && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="task-complete-check"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="task-complete-check" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Mark task as completed
              </label>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
            {taskToEdit && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Task</span>
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
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
              >
                {isSaving ? 'Saving...' : taskToEdit ? 'Save Changes' : 'Add Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
