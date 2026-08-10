import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  User,
  Sun,
  Moon,
  Bell,
  Lock,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Download,
  Database,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Note, Task, Reminder, Category, DailyGoal } from '../types';

interface SettingsViewProps {
  notes?: Note[];
  tasks?: Task[];
  reminders?: Reminder[];
  categories?: Category[];
  dailyGoals?: DailyGoal[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  notes = [],
  tasks = [],
  reminders = [],
  categories = [],
  dailyGoals = [],
}) => {
  const {
    userProfile,
    updateUserDisplayName,
    updateNotificationSettings,
    resetPassword,
    logout,
  } = useAuth();
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [prefs, setPrefs] = useState(
    userProfile?.notificationPreferences || {
      emailAlerts: true,
      dueDateReminders: true,
      dailySummary: false,
    }
  );

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleDownloadBackup = () => {
    try {
      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        user: userProfile?.email || 'anonymous',
        summary: {
          notesCount: notes.length,
          tasksCount: tasks.length,
          remindersCount: reminders.length,
          dailyGoalsCount: dailyGoals.length,
          categoriesCount: categories.length,
        },
        data: {
          notes,
          tasks,
          reminders,
          dailyGoals,
          categories,
        },
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productivity_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage('Personal productivity backup compiled and downloaded successfully!');
    } catch (err) {
      console.error(err);
      setError('Failed to compile data backup.');
    }
  };

  const handleExportPDF = () => {
    try {
      setMessage('');
      setError('');
      const doc = new jsPDF();
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);

      // Filter tasks completed in the last 7 days (or all completed)
      const weeklyCompletedTasks = tasks.filter((t) => {
        if (!t.completed) return false;
        if (t.completedAt) {
          const cDate = new Date(t.completedAt);
          return cDate >= sevenDaysAgo;
        }
        return true;
      });

      // Filter pinned notes
      const pinnedNotes = notes.filter((n) => n.isPinned);

      // Header background
      doc.setFillColor(79, 70, 229); // Indigo 600
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('Weekly Productivity Summary Report', 14, 16);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Generated for: ${userProfile?.email || 'User'}  |  Date: ${now.toLocaleDateString()}`, 14, 32);

      let yPos = 44;

      // Section 1: Completed Tasks
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Completed Tasks (${weeklyCompletedTasks.length})`, 14, yPos);
      yPos += 6;

      doc.setDrawColor(226, 232, 240);
      doc.line(14, yPos, 196, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      if (weeklyCompletedTasks.length === 0) {
        doc.setTextColor(148, 163, 184);
        doc.text('No completed tasks recorded for this week.', 18, yPos);
        yPos += 10;
      } else {
        weeklyCompletedTasks.slice(0, 15).forEach((task, idx) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.setTextColor(16, 185, 129);
          doc.text('[X]', 18, yPos);
          doc.setTextColor(30, 41, 59);
          doc.text(`${idx + 1}. ${task.title}`, 28, yPos);

          if (task.priority) {
            doc.setTextColor(100, 116, 139);
            doc.setFontSize(8);
            doc.text(`(${task.priority})`, 170, yPos);
            doc.setFontSize(10);
          }
          yPos += 7;
        });
      }

      yPos += 6;

      // Section 2: Pinned Notes
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Pinned Notes & Highlights (${pinnedNotes.length})`, 14, yPos);
      yPos += 6;

      doc.setDrawColor(226, 232, 240);
      doc.line(14, yPos, 196, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      if (pinnedNotes.length === 0) {
        doc.setTextColor(148, 163, 184);
        doc.text('No pinned notes currently saved.', 18, yPos);
        yPos += 10;
      } else {
        pinnedNotes.slice(0, 8).forEach((note, idx) => {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }
          doc.setTextColor(79, 70, 229);
          doc.setFont('helvetica', 'bold');
          doc.text(`${idx + 1}. ${note.title}`, 18, yPos);
          yPos += 5;

          doc.setTextColor(71, 85, 105);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          const snippet = note.content.replace(/\n/g, ' ').substring(0, 110) + (note.content.length > 110 ? '...' : '');
          doc.text(snippet, 22, yPos);
          yPos += 8;
        });
      }

      doc.save(`weekly_productivity_report_${now.toISOString().split('T')[0]}.pdf`);
      setMessage('Weekly PDF Report generated and downloaded successfully!');
    } catch (err) {
      console.error(err);
      setError('Failed to generate PDF report.');
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsSaving(true);

    try {
      if (displayName.trim() && displayName !== userProfile?.displayName) {
        await updateUserDisplayName(displayName.trim());
      }
      await updateNotificationSettings(prefs);
      setMessage('Settings updated successfully!');
    } catch (err: any) {
      console.error(err);
      setError('Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!userProfile?.email) return;
    try {
      setMessage('');
      setError('');
      await resetPassword(userProfile.email);
      setMessage(`Password reset link sent to ${userProfile.email}`);
    } catch (err: any) {
      console.error(err);
      setError('Failed to send password reset email.');
    }
  };

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      {message && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Profile Settings</h2>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={userProfile?.email || ''}
              className="w-full max-w-md rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-500 cursor-not-allowed dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
          >
            {isSaving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>

      {/* Theme Preference */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          {theme === 'dark' ? (
            <Moon className="h-5 w-5 text-indigo-400" />
          ) : (
            <Sun className="h-5 w-5 text-amber-500" />
          )}
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Appearance</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Interface Theme</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Select your preferred color scheme
            </p>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                theme === 'light'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <Bell className="h-5 w-5 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Notification Preferences</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Task Due Date Alerts</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Highlight tasks approaching due dates in dashboard
              </p>
            </div>
            <input
              type="checkbox"
              checked={prefs.dueDateReminders}
              onChange={(e) => {
                const newPrefs = { ...prefs, dueDateReminders: e.target.checked };
                setPrefs(newPrefs);
                updateNotificationSettings(newPrefs);
              }}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Email Digest</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Receive periodic activity summaries
              </p>
            </div>
            <input
              type="checkbox"
              checked={prefs.emailAlerts}
              onChange={(e) => {
                const newPrefs = { ...prefs, emailAlerts: e.target.checked };
                setPrefs(newPrefs);
                updateNotificationSettings(newPrefs);
              }}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Local Data Backup */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Data Export & Backup</h2>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Export Weekly PDF Summary Report</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mt-0.5">
                Generate a printable PDF report summarizing your completed tasks for the week and your pinned notes.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors cursor-pointer shrink-0"
            >
              <FileText className="h-4 w-4" />
              <span>Export PDF Summary</span>
            </button>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Download Local JSON Backup
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md">
                Compile and save a complete offline copy of your personal productivity data ({notes.length} notes, {tasks.length} tasks, {reminders.length} reminders).
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-colors cursor-pointer shrink-0"
            >
              <Download className="h-4 w-4" />
              <span>Download JSON Backup</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security & Account */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <Lock className="h-5 w-5 text-rose-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Account & Password</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Password Management</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Send a secure password reset link to your registered email
            </p>
          </div>

          <button
            type="button"
            onClick={handlePasswordReset}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            Reset Password
          </button>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
