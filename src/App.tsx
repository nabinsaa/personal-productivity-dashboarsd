import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { NoteModal } from './components/NoteModal';
import { TaskModal } from './components/TaskModal';
import { ReminderModal } from './components/ReminderModal';
import { ShortcutsModal } from './components/ShortcutsModal';

import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { TrendsView } from './views/TrendsView';
import { NotesView } from './views/NotesView';
import { TasksView } from './views/TasksView';
import { GroupTasksView } from './views/GroupTasksView';
import { CalendarView } from './views/CalendarView';
import { RemindersView } from './views/RemindersView';
import { CategoriesView } from './views/CategoriesView';
import { SettingsView } from './views/SettingsView';
import { FocusModeView } from './views/FocusModeView';
import { VoiceCommandModal } from './components/VoiceCommandModal';
import { ExpensesView } from './views/ExpensesView';

import { ArchiveView } from './views/ArchiveView';

import { ActiveTab, Note, Task, Reminder, Category, DailyGoal, RecurringInterval, FinancialTransaction, BudgetGoal } from './types';
import {
  subscribeCategories,
  subscribeNotes,
  subscribeTasks,
  subscribeReminders,
  subscribeDailyGoals,
  subscribeTransactions,
  subscribeBudgets,
  addNote,
  updateNote,
  deleteNote,
  addTask,
  updateTask,
  deleteTask,
  addReminder,
  updateReminder,
  deleteReminder,
  addCategory,
  updateCategory,
  deleteCategory,
  addDailyGoal,
  updateDailyGoal,
  deleteDailyGoal,
  updateUserProfile,
} from './services/dbService';
import { Sparkles, BellRing, X } from 'lucide-react';

function AppContent() {
  const { currentUser, userProfile, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Focus Mode & Voice Command State
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Auto-Archive Setting
  const [autoArchive7Days, setAutoArchive7Days] = useState(true);

  // Firestore Realtime Collections State
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetGoal[]>([]);

  // Notification Toast State
  const [activeToast, setActiveToast] = useState<{ id: string; title: string; body: string } | null>(null);
  const [triggeredIds, setTriggeredIds] = useState<Set<string>>(new Set());

  // Modals state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderToEdit, setReminderToEdit] = useState<Reminder | null>(null);

  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Sync autoArchive setting with user profile
  useEffect(() => {
    if (userProfile && userProfile.autoArchive7Days !== undefined) {
      setAutoArchive7Days(userProfile.autoArchive7Days);
    }
  }, [userProfile]);

  // Handle URL query parameters (e.g. ?joinGroup=GRP92X)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('joinGroup')) {
      setActiveTab('group_tasks');
    }
  }, []);

  const handleToggleAutoArchive = async (enabled: boolean) => {
    setAutoArchive7Days(enabled);
    if (currentUser) {
      await updateUserProfile(currentUser.uid, { autoArchive7Days: enabled });
    }
  };

  // Browser Push Notifications Engine & Timer Check
  useEffect(() => {
    // Request notification permission if supported
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const checkRemindersAndTasks = () => {
      const now = new Date();

      // Check Tasks with reminderDateTime
      tasks.forEach((task) => {
        if (!task.completed && task.reminderDateTime && !triggeredIds.has(`task-${task.id}`)) {
          const remTime = new Date(task.reminderDateTime);
          if (remTime <= now) {
            triggerNotification(`Task Reminder: ${task.title}`, `Due time reached!`);
            setTriggeredIds((prev) => new Set(prev).add(`task-${task.id}`));
          }
        }
      });

      // Check Standalone Reminders
      reminders.forEach((rem) => {
        if (!rem.completed && rem.dateTime && !triggeredIds.has(`rem-${rem.id}`)) {
          const remTime = new Date(rem.dateTime);
          if (remTime <= now) {
            triggerNotification(`Reminder Alert: ${rem.title}`, `Scheduled time reached!`);
            setTriggeredIds((prev) => new Set(prev).add(`rem-${rem.id}`));
          }
        }
      });
    };

    const interval = setInterval(checkRemindersAndTasks, 8000);
    return () => clearInterval(interval);
  }, [tasks, reminders, triggeredIds]);

  const triggerNotification = (title: string, body: string) => {
    // In-app Toast banner
    setActiveToast({ id: Date.now().toString(), title, body });

    // Browser Native Push Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.error('Browser notification error:', err);
      }
    }
  };

  // Subscribe to user Firestore data
  useEffect(() => {
    if (!currentUser) {
      setCategories([]);
      setNotes([]);
      setTasks([]);
      setReminders([]);
      setDailyGoals([]);
      setTransactions([]);
      setBudgets([]);
      return;
    }

    const unsubCategories = subscribeCategories(currentUser.uid, setCategories);
    const unsubNotes = subscribeNotes(currentUser.uid, setNotes);
    const unsubTasks = subscribeTasks(currentUser.uid, setTasks);
    const unsubReminders = subscribeReminders(currentUser.uid, setReminders);
    const unsubGoals = subscribeDailyGoals(currentUser.uid, setDailyGoals);
    const unsubTransactions = subscribeTransactions(currentUser.uid, setTransactions);
    const unsubBudgets = subscribeBudgets(currentUser.uid, setBudgets);

    return () => {
      unsubCategories();
      unsubNotes();
      unsubTasks();
      unsubReminders();
      unsubGoals();
      unsubTransactions();
      unsubBudgets();
    };
  }, [currentUser]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut keys if user is typing in an input field or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Check if any modal is currently open
      const isAnyModalOpen =
        isNoteModalOpen ||
        isTaskModalOpen ||
        isReminderModalOpen ||
        isSearchOpen ||
        isVoiceModalOpen ||
        isShortcutsOpen;

      // Command/Ctrl + K or '/' to toggle search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      if (e.key === '?' || (e.key === 'h' && !isAnyModalOpen)) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      if (e.key === '/' && !isAnyModalOpen) {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      // Escape key to close modals
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNoteModalOpen(false);
        setIsTaskModalOpen(false);
        setIsReminderModalOpen(false);
        setIsVoiceModalOpen(false);
        setIsShortcutsOpen(false);
        return;
      }

      // Single-key shortcuts (only when no modal is open)
      if (!isAnyModalOpen && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'n') {
          e.preventDefault();
          setNoteToEdit(null);
          setIsNoteModalOpen(true);
        } else if (key === 't') {
          e.preventDefault();
          setTaskToEdit(null);
          setIsTaskModalOpen(true);
        } else if (key === 'r') {
          e.preventDefault();
          setReminderToEdit(null);
          setIsReminderModalOpen(true);
        } else if (key === 'v') {
          e.preventDefault();
          setIsVoiceModalOpen(true);
        } else if (key === 'f') {
          e.preventDefault();
          setIsFocusMode((prev) => !prev);
        } else if (key === 'd') {
          e.preventDefault();
          setActiveTab('dashboard');
        } else if (key === 'c') {
          e.preventDefault();
          setActiveTab('calendar');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isNoteModalOpen,
    isTaskModalOpen,
    isReminderModalOpen,
    isSearchOpen,
    isVoiceModalOpen,
    isShortcutsOpen,
  ]);

  // Subscribe to user Firestore data
  useEffect(() => {
    if (!currentUser) {
      setCategories([]);
      setNotes([]);
      setTasks([]);
      setReminders([]);
      return;
    }

    const unsubCategories = subscribeCategories(currentUser.uid, setCategories);
    const unsubNotes = subscribeNotes(currentUser.uid, setNotes);
    const unsubTasks = subscribeTasks(currentUser.uid, setTasks);
    const unsubReminders = subscribeReminders(currentUser.uid, setReminders);

    return () => {
      unsubCategories();
      unsubNotes();
      unsubTasks();
      unsubReminders();
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white animate-bounce">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Loading your productivity workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView />;
  }

  // Quick Action Handler
  const handleQuickAdd = (type: 'note' | 'task' | 'reminder') => {
    if (type === 'note') {
      setNoteToEdit(null);
      setIsNoteModalOpen(true);
    } else if (type === 'task') {
      setTaskToEdit(null);
      setIsTaskModalOpen(true);
    } else if (type === 'reminder') {
      setReminderToEdit(null);
      setIsReminderModalOpen(true);
    }
  };

  const handleOpenCreateTaskWithDate = (dateStr: string) => {
    setTaskToEdit({
      id: '',
      userId: currentUser.uid,
      title: '',
      completed: false,
      priority: 'Medium',
      dueDate: dateStr,
      createdAt: '',
      updatedAt: '',
    });
    setIsTaskModalOpen(true);
  };

  // CRUD Handlers for Notes
  const handleSaveNote = async (data: {
    title: string;
    content: string;
    isPinned: boolean;
    categoryId?: string;
  }) => {
    if (!currentUser) return;
    if (noteToEdit && noteToEdit.id) {
      await updateNote(noteToEdit.id, data);
    } else {
      await addNote(currentUser.uid, data);
    }
  };

  const handleToggleNotePin = async (note: Note) => {
    await updateNote(note.id, { isPinned: !note.isPinned });
  };

  const handleDeleteNoteItem = async (id: string) => {
    await deleteNote(id);
  };

  // CRUD Handlers for Tasks
  const handleAddVoiceTask = async (taskData: {
    title: string;
    description?: string;
    priority: 'Low' | 'Medium' | 'High';
    dueDate?: string;
    dueTime?: string;
  }) => {
    if (!currentUser) return;
    await addTask(currentUser.uid, {
      title: taskData.title,
      description: taskData.description || '',
      completed: false,
      priority: taskData.priority,
      dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
      dueTime: taskData.dueTime || '',
    });
  };

  const calculateNextDueDate = (currentDueDate?: string, interval: RecurringInterval = 'daily'): string => {
    let baseDate: Date;
    if (currentDueDate) {
      const parts = currentDueDate.split('-');
      if (parts.length === 3) {
        baseDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        baseDate = new Date();
      }
    } else {
      baseDate = new Date();
    }

    if (isNaN(baseDate.getTime())) {
      baseDate = new Date();
    }

    if (interval === 'daily') {
      baseDate.setDate(baseDate.getDate() + 1);
    } else if (interval === 'weekly') {
      baseDate.setDate(baseDate.getDate() + 7);
    } else if (interval === 'monthly') {
      baseDate.setMonth(baseDate.getMonth() + 1);
    }

    const yyyy = baseDate.getFullYear();
    const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
    const dd = String(baseDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const calculateNextReminderDateTime = (currentReminderISO?: string, interval: RecurringInterval = 'daily'): string | undefined => {
    if (!currentReminderISO) return undefined;
    const remDate = new Date(currentReminderISO);
    if (isNaN(remDate.getTime())) return undefined;

    if (interval === 'daily') {
      remDate.setDate(remDate.getDate() + 1);
    } else if (interval === 'weekly') {
      remDate.setDate(remDate.getDate() + 7);
    } else if (interval === 'monthly') {
      remDate.setMonth(remDate.getMonth() + 1);
    }

    return remDate.toISOString();
  };

  const handleSaveTask = async (data: {
    title: string;
    description?: string;
    priority: any;
    dueDate?: string;
    categoryId?: string;
    reminderDateTime?: string;
    recurringInterval?: RecurringInterval;
    subtasks?: { id: string; title: string; completed: boolean }[];
    tags?: string[];
    completed?: boolean;
  }) => {
    if (!currentUser) return;

    if (taskToEdit && taskToEdit.id) {
      const wasCompleted = taskToEdit.completed;
      const isNowCompleted = !!data.completed;

      await updateTask(taskToEdit.id, {
        ...data,
        completedAt: isNowCompleted ? (wasCompleted ? taskToEdit.completedAt : new Date().toISOString()) : undefined,
      });

      // Regenerate recurring task if newly marked completed
      if (!wasCompleted && isNowCompleted && data.recurringInterval && data.recurringInterval !== 'none') {
        const nextDueDate = calculateNextDueDate(data.dueDate || taskToEdit.dueDate, data.recurringInterval);
        await addTask(currentUser.uid, {
          title: data.title,
          description: taskToEdit.description || '',
          subtasks: data.subtasks ? data.subtasks.map((s) => ({ ...s, completed: false })) : [],
          tags: data.tags || [],
          completed: false,
          priority: data.priority,
          dueDate: nextDueDate,
          dueTime: taskToEdit.dueTime || '',
          categoryId: data.categoryId,
          reminderDateTime: calculateNextReminderDateTime(data.reminderDateTime || taskToEdit.reminderDateTime, data.recurringInterval),
          recurringInterval: data.recurringInterval,
        });
      }
    } else {
      await addTask(currentUser.uid, {
        title: data.title,
        description: data.description || '',
        subtasks: data.subtasks || [],
        tags: data.tags || [],
        completed: data.completed || false,
        completedAt: data.completed ? new Date().toISOString() : undefined,
        priority: data.priority,
        dueDate: data.dueDate,
        categoryId: data.categoryId,
        reminderDateTime: data.reminderDateTime,
        recurringInterval: data.recurringInterval || 'none',
      });
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.subtasks) return;
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    await updateTask(taskId, { subtasks: updatedSubtasks });
  };

  const handleToggleTaskComplete = async (task: Task) => {
    const isNowCompleted = !task.completed;
    await updateTask(task.id, {
      completed: isNowCompleted,
      completedAt: isNowCompleted ? new Date().toISOString() : undefined,
    });

    // Auto-regenerate task if marked completed and has a recurring interval
    if (isNowCompleted && task.recurringInterval && task.recurringInterval !== 'none' && currentUser) {
      const nextDueDate = calculateNextDueDate(task.dueDate, task.recurringInterval);
      await addTask(currentUser.uid, {
        title: task.title,
        description: task.description || '',
        subtasks: task.subtasks ? task.subtasks.map((s) => ({ ...s, completed: false })) : [],
        completed: false,
        priority: task.priority,
        dueDate: nextDueDate,
        dueTime: task.dueTime || '',
        categoryId: task.categoryId || '',
        reminderDateTime: calculateNextReminderDateTime(task.reminderDateTime, task.recurringInterval),
        recurringInterval: task.recurringInterval,
      });
    }
  };

  const handleDeleteTaskItem = async (id: string) => {
    await deleteTask(id);
  };

  // Daily Goals Handlers
  const handleAddDailyGoalItem = async (title: string) => {
    if (!currentUser) return;
    await addDailyGoal(currentUser.uid, title);
  };

  const handleToggleDailyGoalItem = async (goal: DailyGoal) => {
    const isNowCompleted = !goal.completed;
    const todayStr = new Date().toISOString().split('T')[0];
    const newStreak = isNowCompleted ? (goal.streak || 0) + 1 : Math.max(0, (goal.streak || 1) - 1);

    await updateDailyGoal(goal.id, {
      completed: isNowCompleted,
      streak: newStreak,
      lastCompletedDate: isNowCompleted ? todayStr : goal.lastCompletedDate,
    });
  };

  const handleDeleteDailyGoalItem = async (id: string) => {
    await deleteDailyGoal(id);
  };

  // CRUD Handlers for Reminders
  const handleSaveReminder = async (data: {
    title: string;
    dateTime: string;
    taskId?: string;
    noteId?: string;
    completed?: boolean;
  }) => {
    if (!currentUser) return;
    if (reminderToEdit && reminderToEdit.id) {
      await updateReminder(reminderToEdit.id, data);
    } else {
      await addReminder(currentUser.uid, {
        title: data.title,
        dateTime: data.dateTime,
        taskId: data.taskId,
        noteId: data.noteId,
        completed: data.completed || false,
      });
    }
  };

  const handleToggleReminderComplete = async (reminder: Reminder) => {
    await updateReminder(reminder.id, { completed: !reminder.completed });
  };

  const handleDeleteReminderItem = async (id: string) => {
    await deleteReminder(id);
  };

  // CRUD Handlers for Categories
  const handleAddCategoryItem = async (cat: { name: string; color: string }) => {
    if (!currentUser) return;
    await addCategory(currentUser.uid, cat);
  };

  const handleUpdateCategoryItem = async (id: string, updates: Partial<Category>) => {
    await updateCategory(id, updates);
  };

  const handleDeleteCategoryItem = async (id: string) => {
    await deleteCategory(id);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans">
      {/* Left Sidebar Menu */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tasks={tasks}
        reminders={reminders}
        notes={notes}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        onQuickAdd={handleQuickAdd}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onQuickAdd={handleQuickAdd}
          onOpenVoiceCommand={() => setIsVoiceModalOpen(true)}
          onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          isFocusMode={isFocusMode}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              notes={notes}
              tasks={tasks}
              reminders={reminders}
              categories={categories}
              dailyGoals={dailyGoals}
              setActiveTab={setActiveTab}
              onQuickAdd={handleQuickAdd}
              onToggleTaskComplete={handleToggleTaskComplete}
              onSelectNote={(note) => {
                setNoteToEdit(note);
                setIsNoteModalOpen(true);
              }}
              onSelectTask={(task) => {
                setTaskToEdit(task);
                setIsTaskModalOpen(true);
              }}
              onAddDailyGoal={handleAddDailyGoalItem}
              onToggleDailyGoal={handleToggleDailyGoalItem}
              onDeleteDailyGoal={handleDeleteDailyGoalItem}
            />
          )}

          {activeTab === 'trends' && (
            <TrendsView
              tasks={tasks}
              categories={categories}
              dailyGoals={dailyGoals}
              onSelectTask={(task) => {
                setTaskToEdit(task);
                setIsTaskModalOpen(true);
              }}
              onToggleTaskComplete={handleToggleTaskComplete}
            />
          )}

          {activeTab === 'notes' && (
            <NotesView
              notes={notes}
              categories={categories}
              onOpenCreateNote={() => {
                setNoteToEdit(null);
                setIsNoteModalOpen(true);
              }}
              onEditNote={(note) => {
                setNoteToEdit(note);
                setIsNoteModalOpen(true);
              }}
              onDeleteNote={handleDeleteNoteItem}
              onTogglePin={handleToggleNotePin}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              categories={categories}
              onOpenCreateTask={() => {
                setTaskToEdit(null);
                setIsTaskModalOpen(true);
              }}
              onEditTask={(task) => {
                setTaskToEdit(task);
                setIsTaskModalOpen(true);
              }}
              onDeleteTask={handleDeleteTaskItem}
              onToggleComplete={handleToggleTaskComplete}
              onToggleSubtask={handleToggleSubtask}
            />
          )}

          {activeTab === 'group_tasks' && <GroupTasksView />}

          {activeTab === 'expenses' && (
            <ExpensesView transactions={transactions} budgets={budgets} />
          )}

          {activeTab === 'archive' && (
            <ArchiveView
              tasks={tasks}
              categories={categories}
              autoArchive7Days={autoArchive7Days}
              onToggleAutoArchive={handleToggleAutoArchive}
              onRestoreTask={(task) => updateTask(task.id, { completed: false })}
              onDeleteTask={handleDeleteTaskItem}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              tasks={tasks}
              categories={categories}
              onOpenCreateTaskWithDate={handleOpenCreateTaskWithDate}
              onSelectTask={(task) => {
                setTaskToEdit(task);
                setIsTaskModalOpen(true);
              }}
              onToggleTaskComplete={handleToggleTaskComplete}
            />
          )}

          {activeTab === 'reminders' && (
            <RemindersView
              reminders={reminders}
              tasks={tasks}
              notes={notes}
              onOpenCreateReminder={() => {
                setReminderToEdit(null);
                setIsReminderModalOpen(true);
              }}
              onEditReminder={(reminder) => {
                setReminderToEdit(reminder);
                setIsReminderModalOpen(true);
              }}
              onDeleteReminder={handleDeleteReminderItem}
              onToggleComplete={handleToggleReminderComplete}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesView
              categories={categories}
              notes={notes}
              tasks={tasks}
              onAddCategory={handleAddCategoryItem}
              onUpdateCategory={handleUpdateCategoryItem}
              onDeleteCategory={handleDeleteCategoryItem}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              notes={notes}
              tasks={tasks}
              reminders={reminders}
              categories={categories}
              dailyGoals={dailyGoals}
            />
          )}
        </main>
      </div>

      {/* Focus Mode Fullscreen Overlay View */}
      {isFocusMode && (
        <FocusModeView
          tasks={tasks}
          categories={categories}
          notes={notes}
          onExitFocusMode={() => setIsFocusMode(false)}
          onToggleTaskComplete={handleToggleTaskComplete}
          onUpdateTask={(id, data) => updateTask(id, data)}
          onAddNote={async (noteData) => {
            if (currentUser) {
              await addNote(currentUser.uid, {
                ...noteData,
                isPinned: false,
              });
            }
          }}
        />
      )}

      {/* Voice Command Modal */}
      <VoiceCommandModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        categories={categories}
        onAddTask={handleAddVoiceTask}
      />

      {/* Keyboard Shortcuts Help Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        notes={notes}
        tasks={tasks}
        categories={categories}
        setActiveTab={setActiveTab}
        onSelectNote={(note) => {
          setNoteToEdit(note);
          setIsNoteModalOpen(true);
        }}
        onSelectTask={(task) => {
          setTaskToEdit(task);
          setIsTaskModalOpen(true);
        }}
      />

      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSave={handleSaveNote}
        onDelete={handleDeleteNoteItem}
        noteToEdit={noteToEdit}
        categories={categories}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTaskItem}
        taskToEdit={taskToEdit}
        categories={categories}
      />

      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSave={handleSaveReminder}
        onDelete={handleDeleteReminderItem}
        reminderToEdit={reminderToEdit}
        tasks={tasks}
        notes={notes}
      />

      {/* Realtime Notification Toast Popup */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-2xl border border-indigo-200 bg-white p-4 shadow-xl dark:border-indigo-900/80 dark:bg-slate-900 animate-slide-up max-w-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <BellRing className="h-5 w-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {activeToast.title}
            </h4>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {activeToast.body}
            </p>
          </div>
          <button
            onClick={() => setActiveToast(null)}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
