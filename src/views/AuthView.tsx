import React, { useState } from 'react';
import { Sparkles, Mail, Lock, User, ArrowRight, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthView: React.FC = () => {
  const { signUp, login, demoLogin, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setError('Please enter your name.');
          setIsSubmitting(false);
          return;
        }
        await signUp(email, password, name);
      } else if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          setError('Please enter your email address.');
          setIsSubmitting(false);
          return;
        }
        await resetPassword(email);
        setMessage('Password reset email sent! Please check your inbox.');
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = 'An error occurred. Please try again.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/admin-restricted-operation' || err.code === 'auth/operation-not-allowed') {
        errMsg = 'This sign-in method is restricted by administrative settings. Click "Explore Guest Demo Workspace" to test the app.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await demoLogin();
    } catch (err: any) {
      console.error(err);
      setError('Could not initialize demo session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md mb-3 dark:bg-indigo-500">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Personal Productivity Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Your notes, tasks, calendar & reminders securely stored
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {/* Mode Tabs */}
          {mode !== 'forgot' && (
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setMessage('');
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                  setMessage('');
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Johnson"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
            >
              <span>
                {isSubmitting
                  ? 'Processing...'
                  : mode === 'login'
                  ? 'Sign In'
                  : mode === 'signup'
                  ? 'Create Free Account'
                  : 'Send Reset Email'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="mt-4 w-full text-center text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Back to Sign In
            </button>
          )}

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <span className="relative bg-white px-3 text-[11px] font-semibold text-slate-400 dark:bg-slate-900">
              OR TEST INSTANTLY
            </span>
          </div>

          {/* Guest / Demo Workspace Button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Explore Guest Demo Workspace</span>
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          Protected by Firebase Authentication & Firestore Encryption
        </p>
      </div>
    </div>
  );
};
