import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit2,
  GripVertical,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Square,
  CheckSquare2,
  Repeat,
  ListTodo,
  Tag as TagIcon,
  Download,
  Sparkles,
} from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { Task, Category } from '../types';
import { exportTasksToCSV } from '../lib/csvExport';

const DragDropContextAny = DragDropContext as any;
const DroppableAny = Droppable as any;
const DraggableAny = Draggable as any;

interface TasksViewProps {
  tasks: Task[];
  categories: Category[];
  onOpenCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => Promise<void>;
  onToggleComplete: (task: Task) => Promise<void>;
  onToggleSubtask?: (taskId: string, subtaskId: string) => Promise<void> | void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  categories,
  onOpenCreateTask,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onToggleSubtask,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'smart' | 'manual' | 'dueDate' | 'priority' | 'createdDate' | 'alphabetical'>('smart');

  // Multi-select state
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  // Custom manual order state (list of task IDs)
  const [customOrderIds, setCustomOrderIds] = useState<string[]>([]);

  // Initialize/Sync custom order when task IDs list changes
  useEffect(() => {
    setCustomOrderIds((prev) => {
      const existingIds = new Set(prev);
      const currentIds = tasks.map((t) => t.id);
      const newIds = currentIds.filter((id) => !existingIds.has(id));
      const validPrev = prev.filter((id) => currentIds.includes(id));
      return [...validPrev, ...newIds];
    });
  }, [tasks]);

  // Collect all unique tags across tasks
  const allUniqueTags = Array.from(
    new Set(tasks.flatMap((t) => t.tags || []))
  );

  // Filter tasks first
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === 'pending' && task.completed) return false;
    if (statusFilter === 'completed' && !task.completed) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && task.categoryId !== categoryFilter) return false;
    if (tagFilter !== 'all' && (!task.tags || !task.tags.includes(tagFilter))) return false;
    if (
      searchQuery.trim() &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'smart') {
      // Smart Sort algorithm: combines completion, due date urgency, priority, and subtask count
      const getSmartScore = (task: Task) => {
        if (task.completed) return -1000; // Completed tasks go to bottom
        let score = 0;

        // Priority weight
        if (task.priority === 'High') score += 100;
        else if (task.priority === 'Medium') score += 50;
        else score += 10;

        // Due date urgency
        if (task.dueDate) {
          const todayStr = new Date().toISOString().split('T')[0];
          if (task.dueDate < todayStr) score += 300; // Overdue items get highest urgency
          else if (task.dueDate === todayStr) score += 200; // Due today
          else {
            const daysDiff = Math.round((new Date(task.dueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24));
            if (daysDiff <= 3) score += 80;
            else if (daysDiff <= 7) score += 40;
          }
        }

        // Subtask progress weight
        if (task.subtasks && task.subtasks.length > 0) {
          const pendingSub = task.subtasks.filter((st) => !st.completed).length;
          score += pendingSub * 5;
        }

        return score;
      };

      return getSmartScore(b) - getSmartScore(a);
    }

    if (sortBy === 'manual') {
      const indexA = customOrderIds.indexOf(a.id);
      const indexB = customOrderIds.indexOf(b.id);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    }

    if (sortBy === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }

    if (sortBy === 'priority') {
      const priorityWeights: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
      return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
    }

    if (sortBy === 'createdDate') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }

    if (sortBy === 'alphabetical') {
      return a.title.localeCompare(b.title);
    }

    return 0;
  });

  // Category helper
  const getCategory = (catId?: string) => {
    if (!catId) return null;
    return categories.find((c) => c.id === catId);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Drag and Drop Handler
  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reorderedList = Array.from(sortedTasks);
    const [movedTask] = reorderedList.splice(result.source.index, 1);
    reorderedList.splice(result.destination.index, 0, movedTask);

    const newOrderIds = reorderedList.map((t) => t.id);
    setCustomOrderIds(newOrderIds);
    setSortBy('manual');
  };

  // Multi-select handlers
  const isAllSelected =
    sortedTasks.length > 0 &&
    sortedTasks.every((t) => selectedTaskIds.includes(t.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(sortedTasks.map((t) => t.id));
    }
  };

  const toggleSelectTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBulkComplete = async (completedStatus: boolean) => {
    const tasksToUpdate = tasks.filter(
      (t) => selectedTaskIds.includes(t.id) && t.completed !== completedStatus
    );
    for (const t of tasksToUpdate) {
      await onToggleComplete(t);
    }
  };

  const handleBulkDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedTaskIds.length} selected task(s)?`
      )
    ) {
      return;
    }
    for (const id of selectedTaskIds) {
      await onDeleteTask(id);
    }
    setSelectedTaskIds([]);
  };

  // CSV Export handler
  const handleExportCSV = () => {
    const tasksToExport =
      selectedTaskIds.length > 0
        ? tasks.filter((t) => selectedTaskIds.includes(t.id))
        : sortedTasks;

    exportTasksToCSV(tasksToExport, categories);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top action row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            title="Export tasks to CSV file"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>
              Export CSV {selectedTaskIds.length > 0 ? `(${selectedTaskIds.length})` : ''}
            </span>
          </button>

          <button
            onClick={onOpenCreateTask}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter & Sorting Options Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        {/* Status Tabs */}
        <div className="flex items-center gap-2">
          {/* Select All Checkbox */}
          {sortedTasks.length > 0 && (
            <button
              onClick={toggleSelectAll}
              title={isAllSelected ? 'Deselect all' : 'Select all'}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {isAllSelected ? (
                <CheckSquare2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              <span className="hidden sm:inline">
                {isAllSelected ? 'Deselect' : 'Select All'}
              </span>
            </button>
          )}

          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Pending ({tasks.filter((t) => !t.completed).length})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'completed'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Completed ({tasks.filter((t) => t.completed).length})
            </button>
          </div>
        </div>

        {/* Priority, Category & Sorting Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Smart Sort Toggle Button */}
          <button
            onClick={() => setSortBy(sortBy === 'smart' ? 'manual' : 'smart')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              sortBy === 'smart'
                ? 'bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
            }`}
            title="Toggle Smart Sort ranking based on due dates, priority, and subtasks"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Smart Sort</span>
          </button>

          {/* Sorting Dropdown */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-3 py-1.5 text-xs font-semibold text-indigo-900 focus:outline-hidden dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200"
            >
              <option value="smart">Sort: ✨ Smart Sort (Urgency & Priority)</option>
              <option value="manual">Sort: ✋ Manual (Drag & Drop)</option>
              <option value="dueDate">Sort: 📅 Due Date</option>
              <option value="priority">Sort: ⚡ Priority</option>
              <option value="createdDate">Sort: 🕒 Created Date</option>
              <option value="alphabetical">Sort: 🔤 Alphabetical (A-Z)</option>
            </select>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Chip Bar for Tags */}
      {allUniqueTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 pb-1">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
            <TagIcon className="h-3.5 w-3.5 text-indigo-500" />
            <span>Filter Tags:</span>
          </span>
          <button
            onClick={() => setTagFilter('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              tagFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-500'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            All Tags
          </button>
          {allUniqueTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? 'all' : tag)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                tagFilter === tag
                  ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-500'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Floating Multi-Select Bulk Actions Bar */}
      {selectedTaskIds.length > 0 && (
        <div className="sticky top-20 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-indigo-950 p-4 text-white shadow-xl dark:bg-slate-800 border border-indigo-700/50">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-[11px] font-bold">
              {selectedTaskIds.length}
            </span>
            <span>Task(s) Selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkComplete(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Mark Complete</span>
            </button>

            <button
              onClick={() => handleBulkComplete(false)}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Mark Pending</span>
            </button>

            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>

            <button
              onClick={() => setSelectedTaskIds([])}
              className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop Task List */}
      {sortedTasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
          <CheckSquare className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Tasks Found</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {searchQuery
              ? 'No task matches your filter parameters.'
              : 'Add your first task to stay organized and on top of your goals!'}
          </p>
          <button
            onClick={onOpenCreateTask}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </button>
        </div>
      ) : (
        <DragDropContextAny onDragEnd={handleOnDragEnd}>
          <DroppableAny droppableId="tasks-droppable-list">
            {(provided: any) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2.5"
              >
                {sortedTasks.map((task, index) => {
                  const cat = getCategory(task.categoryId);
                  const isDueToday = task.dueDate === todayStr;
                  const isOverdue =
                    task.dueDate && task.dueDate < todayStr && !task.completed;
                  const isSelected = selectedTaskIds.includes(task.id);

                  return (
                    <DraggableAny
                      key={task.id}
                      draggableId={task.id}
                      index={index}
                    >
                      {(dragProvided: any, snapshot: any) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`group flex items-center justify-between rounded-2xl border bg-white p-3.5 shadow-xs transition-all ${
                            snapshot.isDragging
                              ? 'border-indigo-500 shadow-xl ring-2 ring-indigo-400/30 dark:bg-slate-800 z-50'
                              : isSelected
                              ? 'border-indigo-400 bg-indigo-50/40 dark:border-indigo-600 dark:bg-indigo-950/30'
                              : task.completed
                              ? 'border-slate-200 opacity-60 dark:border-slate-800/60'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                            {/* Drag Handle */}
                            <div
                              {...dragProvided.dragHandleProps}
                              title="Drag to reorder task"
                              className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-500 dark:text-slate-600 dark:hover:text-indigo-400 transition-colors p-1"
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>

                            {/* Multi-select Checkbox */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => toggleSelectTask(task.id, e as any)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                            />

                            {/* Complete Task Checkbox */}
                            <button
                              type="button"
                              onClick={() => onToggleComplete(task)}
                              className="shrink-0 text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <Square className="h-5 w-5 text-slate-300 dark:text-slate-600 hover:text-indigo-500" />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <p
                                onClick={() => onEditTask(task)}
                                className={`cursor-pointer font-semibold text-sm truncate ${
                                  task.completed
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400'
                                }`}
                              >
                                {task.title}
                              </p>

                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                {task.dueDate && (
                                  <span
                                    className={`flex items-center gap-1 font-medium ${
                                      isOverdue
                                        ? 'text-rose-600 dark:text-rose-400 font-bold'
                                        : isDueToday
                                        ? 'text-amber-600 dark:text-amber-400 font-bold'
                                        : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {isDueToday
                                        ? 'Due Today'
                                        : isOverdue
                                        ? `Overdue (${task.dueDate})`
                                        : task.dueDate}
                                    </span>
                                  </span>
                                )}

                                {cat && (
                                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {cat.name}
                                  </span>
                                )}

                                {task.tags && task.tags.map((t) => (
                                  <span
                                    key={t}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTagFilter(t);
                                    }}
                                    className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                                  >
                                    #{t}
                                  </span>
                                ))}

                                {task.recurringInterval && task.recurringInterval !== 'none' && (
                                  <span className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                    <Repeat className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                    <span className="capitalize">{task.recurringInterval}</span>
                                  </span>
                                )}

                                {task.subtasks && task.subtasks.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedTaskIds((prev) => ({
                                        ...prev,
                                        [task.id]: !prev[task.id],
                                      }))
                                    }
                                    className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                                  >
                                    <ListTodo className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                    <span>
                                      {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtasks
                                    </span>
                                  </button>
                                )}
                              </div>

                              {/* Expanded Subtask Checklist */}
                              {task.subtasks && task.subtasks.length > 0 && expandedTaskIds[task.id] && (
                                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                                  {task.subtasks.map((st) => (
                                    <div
                                      key={st.id}
                                      className="flex items-center gap-2.5 rounded-lg bg-slate-50/80 px-2.5 py-1.5 dark:bg-slate-800/50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={st.completed}
                                        onChange={() => onToggleSubtask && onToggleSubtask(task.id, st.id)}
                                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      />
                                      <span
                                        className={`text-xs font-medium ${
                                          st.completed
                                            ? 'line-through text-slate-400 dark:text-slate-500'
                                            : 'text-slate-800 dark:text-slate-200'
                                        }`}
                                      >
                                        {st.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                                task.priority === 'High'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                                  : task.priority === 'Medium'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {task.priority}
                            </span>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onEditTask(task)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this task?')) onDeleteTask(task.id);
                                }}
                                className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </DraggableAny>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </DroppableAny>
        </DragDropContextAny>
      )}
    </div>
  );
};
