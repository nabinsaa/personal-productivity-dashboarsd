import React from 'react';
import { X, Keyboard, Command, FileText, CheckSquare, Bell, Mic, Focus, Search } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutList = [
    { key: '⌘ K / Ctrl K', label: 'Global Search', icon: Search, desc: 'Search notes, tasks, & categories' },
    { key: 'n', label: 'New Note', icon: FileText, desc: 'Quickly draft a new note' },
    { key: 't', label: 'New Task', icon: CheckSquare, desc: 'Add a new task item' },
    { key: 'r', label: 'New Reminder', icon: Bell, desc: 'Schedule a time reminder' },
    { key: 'v', label: 'Voice Command', icon: Mic, desc: 'Create task using speech' },
    { key: 'f', label: 'Focus Mode', icon: Focus, desc: 'Enter full-screen pomodoro session' },
    { key: '?', label: 'Shortcuts Help', icon: Keyboard, desc: 'Toggle this shortcuts modal' },
    { key: 'Esc', label: 'Close Overlay', icon: Command, desc: 'Close any active modal or menu' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Boost your speed with instant hotkeys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {shortcutList.map((sc, i) => {
            const Icon = sc.icon;
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800/80 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-indigo-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{sc.label}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{sc.desc}</p>
                  </div>
                </div>
                <kbd className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono font-bold text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shrink-0">
                  {sc.key}
                </kbd>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Press <kbd className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-700 dark:text-slate-200">?</kbd> anywhere to open</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
