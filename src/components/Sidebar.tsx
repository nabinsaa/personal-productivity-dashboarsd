import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  CheckSquare,
  Users,
  Calendar,
  Bell,
  FolderKanban,
  Settings,
  Archive,
  LogOut,
  Sun,
  Moon,
  Plus,
  X,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { ActiveTab, Task, Reminder, Note } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  tasks: Task[];
  reminders: Reminder[];
  notes: Note[];
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onQuickAdd: (type: 'note' | 'task' | 'reminder') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  tasks,
  reminders,
  isMobileOpen,
  setIsMobileOpen,
  onQuickAdd,
}) => {
  const { userProfile, logout, theme, setTheme } = useAuth();

  const pendingTasksCount = tasks.filter((t) => !t.completed).length;
  const pendingRemindersCount = reminders.filter((r) => !r.completed).length;

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trends' as ActiveTab, label: 'Productivity Trends', icon: TrendingUp },
    { id: 'notes' as ActiveTab, label: 'Notes', icon: FileText },
    {
      id: 'tasks' as ActiveTab,
      label: 'To-Do List',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
    },
    {
      id: 'group_tasks' as ActiveTab,
      label: 'Group Tasks',
      icon: Users,
    },
    { id: 'expenses' as ActiveTab, label: 'Expenses & Budget', icon: Wallet },
    { id: 'archive' as ActiveTab, label: 'Archive', icon: Archive },
    { id: 'calendar' as ActiveTab, label: 'Calendar', icon: Calendar },
    {
      id: 'reminders' as ActiveTab,
      label: 'Reminders',
      icon: Bell,
      badge: pendingRemindersCount > 0 ? pendingRemindersCount : undefined,
    },
    { id: 'categories' as ActiveTab, label: 'Categories', icon: FolderKanban },
    { id: 'settings' as ActiveTab, label: 'Settings', icon: Settings },
  ];

  const handleTabClick = (id: ActiveTab) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile overlay background */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header / Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-xs text-base">
              P
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Proactive
            </span>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Create Action */}
        <div className="p-4">
          <div className="relative group">
            <button
              onClick={() => onQuickAdd('task')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 transition-colors dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Plus className="h-4 w-4" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive
                        ? 'bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Footer & Theme Toggle */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700 text-xs dark:bg-indigo-900 dark:text-indigo-300">
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                  {userProfile?.displayName || 'User'}
                </p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {userProfile?.email}
                </p>
              </div>
            </div>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
