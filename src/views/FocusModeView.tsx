import React, { useState, useEffect } from 'react';
import {
  Focus,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  CheckSquare,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import { Task, Category, Note } from '../types';

interface FocusModeViewProps {
  tasks: Task[];
  categories: Category[];
  notes: Note[];
  onExitFocusMode: () => void;
  onToggleTaskComplete: (task: Task) => Promise<void>;
  onUpdateTask: (id: string, data: Partial<Task>) => Promise<void>;
  onAddNote: (noteData: { title: string; content: string }) => Promise<void>;
}

export const FocusModeView: React.FC<FocusModeViewProps> = ({
  tasks,
  categories,
  notes,
  onExitFocusMode,
  onToggleTaskComplete,
  onUpdateTask,
  onAddNote,
}) => {
  const pendingTasks = tasks.filter((t) => !t.completed);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    pendingTasks[0]?.id || tasks[0]?.id || ''
  );

  const activeTask = tasks.find((t) => t.id === selectedTaskId) || pendingTasks[0] || tasks[0];

  // Pomodoro Timer State
  const [initialDuration, setInitialDuration] = useState<number>(1500); // default 25 mins
  const [timeLeft, setTimeLeft] = useState<number>(1500);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  const [customMins, setCustomMins] = useState<string>('');

  // Track elapsed focus time linked per task ID
  const [taskFocusTimeMap, setTaskFocusTimeMap] = useState<Record<string, number>>({});

  // Scratchpad Notes
  const [scratchpadText, setScratchpadText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedMsg, setNoteSavedMsg] = useState('');

  // Subtask Input
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        // Track time spent on selected task if focus mode
        if (timerMode === 'focus' && selectedTaskId) {
          setTaskFocusTimeMap((prev) => ({
            ...prev,
            [selectedTaskId]: (prev[selectedTaskId] || 0) + 1,
          }));
        }
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (timerMode === 'focus') {
        setCompletedSessions((prev) => prev + 1);
        setTimerMode('break');
        setTimeLeft(300); // 5 min break
      } else {
        setTimerMode('focus');
        setTimeLeft(initialDuration);
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, timerMode, selectedTaskId, initialDuration]);

  const handleSelectPresetDuration = (seconds: number, mode: 'focus' | 'break' = 'focus') => {
    setIsRunning(false);
    setTimerMode(mode);
    setInitialDuration(seconds);
    setTimeLeft(seconds);
  };

  const handleSetCustomMinutes = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(customMins, 10);
    if (!isNaN(mins) && mins > 0 && mins <= 180) {
      handleSelectPresetDuration(mins * 60, 'focus');
      setCustomMins('');
    }
  };

  const formatTaskTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!activeTask || !activeTask.subtasks) return;
    const updatedSubtasks = activeTask.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    await onUpdateTask(activeTask.id, { subtasks: updatedSubtasks });
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !activeTask) return;
    const existingSubtasks = activeTask.subtasks || [];
    const newSub = {
      id: Date.now().toString(),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    await onUpdateTask(activeTask.id, { subtasks: [...existingSubtasks, newSub] });
    setNewSubtaskTitle('');
  };

  const handleSaveScratchpadToNotes = async () => {
    if (!scratchpadText.trim()) return;
    try {
      setIsSavingNote(true);
      await onAddNote({
        title: `Focus Note: ${activeTask ? activeTask.title : 'Deep Work Session'}`,
        content: scratchpadText.trim(),
      });
      setNoteSavedMsg('Saved to My Notes!');
      setTimeout(() => setNoteSavedMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleCompleteActiveTask = async () => {
    if (!activeTask) return;
    await onToggleTaskComplete(activeTask);
    const remaining = pendingTasks.filter((t) => t.id !== activeTask.id);
    if (remaining.length > 0) {
      setSelectedTaskId(remaining[0].id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white overflow-y-auto animate-fade-in">
      {/* Top Focus Bar */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/30">
            <Focus className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              Focus Mode
              <span className="rounded-full bg-indigo-950 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-800">
                Distraction-Free
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Single-task workflow & Pomodoro timer
            </p>
          </div>
        </div>

        <button
          onClick={onExitFocusMode}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
          <span>Exit Focus Mode</span>
        </button>
      </div>

      {/* Main Focus Canvas */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Pomodoro Timer & Task Selector */}
        <div className="lg:col-span-5 space-y-6">
          {/* Task Selector Dropdown */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xs">
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
              Target Task
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-bold text-white focus:border-indigo-500 focus:outline-hidden"
            >
              {pendingTasks.length === 0 ? (
                <option value="">No pending tasks</option>
              ) : (
                pendingTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.priority}] {t.title}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Pomodoro Timer Circle Card */}
          <div className="rounded-3xl border border-slate-800 bg-linear-to-b from-slate-900 via-slate-900 to-indigo-950/40 p-6 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{timerMode === 'focus' ? 'Deep Work Focus Timer' : 'Rest Break Timer'}</span>
            </div>

            {/* Countdown Duration Presets */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[
                { label: '15m Focus', secs: 900, mode: 'focus' },
                { label: '25m Pomodoro', secs: 1500, mode: 'focus' },
                { label: '45m Deep Work', secs: 2700, mode: 'focus' },
                { label: '5m Break', secs: 300, mode: 'break' },
                { label: '15m Break', secs: 900, mode: 'break' },
              ].map((p) => {
                const isActive = initialDuration === p.secs && timerMode === p.mode;
                return (
                  <button
                    key={p.label}
                    onClick={() => handleSelectPresetDuration(p.secs, p.mode as any)}
                    className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Minutes Input */}
            <form onSubmit={handleSetCustomMinutes} className="flex items-center gap-2 max-w-[200px] w-full">
              <input
                type="number"
                min={1}
                max={180}
                placeholder="Custom mins..."
                value={customMins}
                onChange={(e) => setCustomMins(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-800 px-3 py-1 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
              >
                Set
              </button>
            </form>

            {/* Timer Display */}
            <div className="my-2 text-6xl font-black tracking-tight text-white font-mono">
              {formatTime(timeLeft)}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-xl transition-all cursor-pointer ${
                  isRunning
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                }`}
              >
                {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
              </button>

              <button
                onClick={() => {
                  setIsRunning(false);
                  setTimeLeft(initialDuration);
                }}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 pt-2 border-t border-slate-800/80 w-full justify-center">
              <div className="flex items-center gap-1.5">
                <span>Completed Sessions:</span>
                <span className="rounded-full bg-indigo-950 px-2.5 py-0.5 font-bold text-indigo-300 border border-indigo-800">
                  🔥 {completedSessions}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Task Workspace & Scratchpad */}
        <div className="lg:col-span-7 space-y-6">
          {activeTask ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 backdrop-blur-xs">
              {/* Task Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`rounded-md px-2.5 py-0.5 text-[10px] font-bold ${
                        activeTask.priority === 'High'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : activeTask.priority === 'Medium'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {activeTask.priority} Priority
                    </span>
                    {activeTask.dueDate && (
                      <span className="text-[11px] font-medium text-slate-400">
                        Due: {activeTask.dueDate}
                      </span>
                    )}

                    {/* Time spent tracking indicator */}
                    <span className="rounded-md bg-indigo-950/80 border border-indigo-800 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-indigo-400" />
                      <span>Focus Time Spent: {formatTaskTime(taskFocusTimeMap[activeTask.id] || 0)}</span>
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{activeTask.title}</h2>
                  {activeTask.description && (
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                      {activeTask.description}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleCompleteActiveTask}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-900/30 transition-colors shrink-0 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Mark Done</span>
                </button>
              </div>

              {/* Subtasks / Checklist */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Subtasks & Checklist
                </h3>
                <div className="space-y-2 mb-3">
                  {(activeTask.subtasks || []).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No subtasks added yet.</p>
                  ) : (
                    activeTask.subtasks?.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 p-3"
                      >
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={() => handleToggleSubtask(st.id)}
                          className="h-4 w-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span
                          className={`text-xs font-medium ${
                            st.completed ? 'line-through text-slate-500' : 'text-slate-200'
                          }`}
                        >
                          {st.title}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Subtask Form */}
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add step/subtask..."
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>
              </div>

              {/* Focus Scratchpad */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-indigo-400" />
                    <span>Focus Scratchpad</span>
                  </h3>
                  {noteSavedMsg && (
                    <span className="text-[11px] font-semibold text-emerald-400 animate-fade-in">
                      {noteSavedMsg}
                    </span>
                  )}
                </div>

                <textarea
                  rows={5}
                  value={scratchpadText}
                  onChange={(e) => setScratchpadText(e.target.value)}
                  placeholder="Jot down quick thoughts, research findings, or ideas without leaving focus mode..."
                  className="w-full rounded-2xl border border-slate-800 bg-slate-800/60 p-4 text-xs font-medium text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-hidden leading-relaxed resize-none"
                />

                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleSaveScratchpadToNotes}
                    disabled={isSavingNote || !scratchpadText.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600/80 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-600 disabled:opacity-40 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{isSavingNote ? 'Saving...' : 'Save to My Notes'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-12 text-center text-slate-400">
              All tasks completed! Click "Exit Focus Mode" to view dashboard.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
