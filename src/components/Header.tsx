import React, { useState } from 'react';
import { Menu, Search, Plus, Sun, Moon, FileText, CheckSquare, Bell, Focus, HelpCircle } from 'lucide-react';
import { ActiveTab } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  activeTab: ActiveTab;
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onQuickAdd: (type: 'note' | 'task' | 'reminder') => void;
  onToggleFocusMode?: () => void;
  onOpenShortcuts?: () => void;
  isFocusMode?: boolean;
}

const TAB_TITLES: Record<ActiveTab, string> = {
  dashboard: 'Dashboard Overview',
  trends: 'Productivity Trends & Analytics',
  notes: 'My Notes',
  tasks: 'To-Do List',
  group_tasks: 'Group Tasks & Collaboration',
  expenses: 'Financial Expenses & Budget',
  archive: 'Task Archive',
  calendar: 'Calendar & Schedules',
  reminders: 'Reminders & Notifications',
  categories: 'Categories & Tags',
  settings: 'Account Settings',
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  onOpenSearch,
  onQuickAdd,
  onToggleFocusMode,
  onOpenShortcuts,
  isFocusMode = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          {TAB_TITLES[activeTab]}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors sm:w-64 md:w-80"
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate text-left flex-1">Search notes, tasks, or categories...</span>
          <kbd className="hidden rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300 sm:inline-block">
            ⌘K
          </kbd>
        </button>

        {/* Focus Mode Trigger */}
        {onToggleFocusMode && (
          <button
            onClick={onToggleFocusMode}
            title="Toggle Focus Mode"
            className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors cursor-pointer ${
              isFocusMode
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Focus className="h-4 w-4" />
            <span className="hidden md:inline">Focus</span>
          </button>
        )}

        {/* Quick Add Menu */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Add</span>
          </button>

          {showAddMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAddMenu(false)}
              />
              <div className="absolute right-0 mt-2 z-50 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-800">
                <button
                  onClick={() => {
                    onQuickAdd('note');
                    setShowAddMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <FileText className="h-4 w-4 text-emerald-500" />
                  <span>New Note</span>
                </button>

                <button
                  onClick={() => {
                    onQuickAdd('task');
                    setShowAddMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <CheckSquare className="h-4 w-4 text-indigo-500" />
                  <span>New Task</span>
                </button>

                <button
                  onClick={() => {
                    onQuickAdd('reminder');
                    setShowAddMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <Bell className="h-4 w-4 text-amber-500" />
                  <span>New Reminder</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Shortcuts Guide Modal Trigger */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts (?)"
            className="hidden sm:flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-slate-500" />
            <kbd className="text-[10px] bg-slate-200 px-1 rounded font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              ?
            </kbd>
          </button>
        )}

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-slate-700" />}
        </button>
      </div>
    </header>
  );
};
