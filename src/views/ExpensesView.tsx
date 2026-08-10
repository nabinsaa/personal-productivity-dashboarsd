import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Plus,
  Search,
  Filter,
  DollarSign,
  PieChart as PieIcon,
  Download,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  PiggyBank,
  Sparkles,
  CreditCard,
  Building2,
  Calendar,
  X,
  FileSpreadsheet,
  Globe,
} from 'lucide-react';
import { FinancialTransaction, BudgetGoal } from '../types';
import { addTransaction, updateTransaction, deleteTransaction, setBudgetGoal, deleteBudgetGoal } from '../services/dbService';
import { useAuth } from '../context/AuthContext';

interface ExpensesViewProps {
  transactions: FinancialTransaction[];
  budgets: BudgetGoal[];
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', label: 'USD ($) - US Dollar' },
  { code: 'NPR', symbol: 'रु', label: 'NPR (रु) - Nepali Rupee' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥) - Japanese Yen' },
  { code: 'INR', symbol: '₹', label: 'INR (₹) - Indian Rupee' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) - Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) - British Pound' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD (CA$) - Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$) - Australian Dollar' },
  { code: 'SGD', symbol: 'S$', label: 'SGD (S$) - Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', label: 'AED (د.إ) - UAE Dirham' },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Housing & Rent',
  'Utilities & Bills',
  'Transport & Gas',
  'Shopping & Retail',
  'Entertainment',
  'Healthcare & Medical',
  'Salary & Wages',
  'Freelance & Side Hustle',
  'Investments',
  'Subscriptions',
  'Other',
];

export const ExpensesView: React.FC<ExpensesViewProps> = ({ transactions, budgets }) => {
  const { currentUser } = useAuth();

  // Selected Currency State
  const [currencyCode, setCurrencyCode] = useState<string>(() => {
    return localStorage.getItem('expense_currency') || 'USD';
  });

  const selectedCurrency = useMemo(() => {
    return CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0];
  }, [currencyCode]);

  const currencySymbol = selectedCurrency.symbol;

  const handleCurrencyChange = (newCode: string) => {
    setCurrencyCode(newCode);
    localStorage.setItem('expense_currency', newCode);
  };

  // Active section inside Expenses view
  const [subTab, setSubTab] = useState<'overview' | 'transactions' | 'budgets' | 'analytics'>('overview');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Modal State for Adding/Editing Transaction
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Food & Dining');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'upi' | 'other'>('card');
  const [description, setDescription] = useState('');

  // Budget Goal Modal
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('Food & Dining');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [editingBudgetId, setEditingBudgetId] = useState<string | undefined>(undefined);

  // Available unique months from transactions
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.date) {
        monthsSet.add(tx.date.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [transactions]);

  // Filtered transactions list
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = typeFilter === 'all' || tx.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || tx.category === categoryFilter;
      const matchesMonth = selectedMonth === 'all' || (tx.date && tx.date.startsWith(selectedMonth));

      return matchesSearch && matchesType && matchesCategory && matchesMonth;
    });
  }, [transactions, searchQuery, typeFilter, categoryFilter, selectedMonth]);

  // Financial Calculations
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    const targetList = selectedMonth === 'all'
      ? transactions
      : transactions.filter((tx) => tx.date && tx.date.startsWith(selectedMonth));

    targetList.forEach((tx) => {
      const val = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        income += val;
      } else {
        expense += val;
      }
    });

    const netBalance = income - expense;
    const savingsRate = income > 0 ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;

    return { income, expense, netBalance, savingsRate };
  }, [transactions, selectedMonth]);

  // Category Expense Breakdown
  const categoryBreakdown = useMemo(() => {
    const map: { [cat: string]: number } = {};
    let totalExpense = 0;

    const targetList = selectedMonth === 'all'
      ? transactions.filter((t) => t.type === 'expense')
      : transactions.filter((t) => t.type === 'expense' && t.date && t.date.startsWith(selectedMonth));

    targetList.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      map[tx.category] = (map[tx.category] || 0) + amt;
      totalExpense += amt;
    });

    return Object.entries(map)
      .map(([cat, total]) => ({
        category: cat,
        total,
        percentage: totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions, selectedMonth]);

  // Open Modal for New Transaction
  const handleOpenAddModal = (presetType: 'income' | 'expense' = 'expense') => {
    setEditingTransaction(null);
    setTitle('');
    setAmount('');
    setType(presetType);
    setCategory(presetType === 'income' ? 'Salary & Wages' : 'Food & Dining');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('card');
    setDescription('');
    setIsModalOpen(true);
  };

  // Open Modal to Edit
  const handleOpenEditModal = (tx: FinancialTransaction) => {
    setEditingTransaction(tx);
    setTitle(tx.title);
    setAmount(tx.amount.toString());
    setType(tx.type);
    setCategory(tx.category);
    setDate(tx.date || new Date().toISOString().split('T')[0]);
    setPaymentMethod(tx.paymentMethod || 'card');
    setDescription(tx.description || '');
    setIsModalOpen(true);
  };

  // Save Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !title.trim() || !amount || Number(amount) <= 0) return;

    const numAmount = parseFloat(amount);

    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, {
        title: title.trim(),
        amount: numAmount,
        type,
        category,
        date,
        paymentMethod,
        description: description.trim(),
      });
    } else {
      await addTransaction(currentUser.uid, {
        title: title.trim(),
        amount: numAmount,
        type,
        category,
        date,
        paymentMethod,
        description: description.trim(),
      });
    }

    setIsModalOpen(false);
  };

  // Delete Transaction
  const handleDeleteTx = async (id: string) => {
    try {
      await deleteTransaction(id);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  // Save Budget Goal
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !budgetLimit || Number(budgetLimit) <= 0) return;

    await setBudgetGoal(
      currentUser.uid,
      budgetCategory,
      parseFloat(budgetLimit),
      editingBudgetId
    );

    setIsBudgetModalOpen(false);
  };

  // Delete Budget
  const handleDeleteBudget = async (id: string) => {
    await deleteBudgetGoal(id);
  };

  // Seed Realistic Starter Data
  const handleSeedDemoData = async () => {
    if (!currentUser) return;
    const today = new Date();
    const formatDate = (daysAgo: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    const starterItems: Omit<FinancialTransaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
      { title: 'Monthly Salary Deposit', amount: 4200, type: 'income', category: 'Salary & Wages', date: formatDate(10), paymentMethod: 'bank_transfer', description: 'Primary job monthly paycheck' },
      { title: 'Freelance UI Design Project', amount: 650, type: 'income', category: 'Freelance & Side Hustle', date: formatDate(3), paymentMethod: 'upi', description: 'Client project milestone 1' },
      { title: 'Apartment Rent', amount: 1400, type: 'expense', category: 'Housing & Rent', date: formatDate(9), paymentMethod: 'bank_transfer', description: 'Monthly apartment leasing fee' },
      { title: 'Whole Foods Grocery', amount: 142.80, type: 'expense', category: 'Food & Dining', date: formatDate(1), paymentMethod: 'card', description: 'Weekly groceries & organic produce' },
      { title: 'Electric & Heating Bill', amount: 88.50, type: 'expense', category: 'Utilities & Bills', date: formatDate(5), paymentMethod: 'card', description: 'Monthly power utility bill' },
      { title: 'Gasoline Refill', amount: 48.00, type: 'expense', category: 'Transport & Gas', date: formatDate(2), paymentMethod: 'card', description: 'Car fuel refill' },
      { title: 'Netflix & Spotify Subscriptions', amount: 28.99, type: 'expense', category: 'Subscriptions', date: formatDate(7), paymentMethod: 'card', description: 'Monthly streaming memberships' },
      { title: 'Dinner with Friends', amount: 76.40, type: 'expense', category: 'Food & Dining', date: formatDate(4), paymentMethod: 'card', description: 'Weekend restaurant dining' },
    ];

    for (const item of starterItems) {
      await addTransaction(currentUser.uid, item);
    }

    // Default Budgets
    await setBudgetGoal(currentUser.uid, 'Food & Dining', 500);
    await setBudgetGoal(currentUser.uid, 'Utilities & Bills', 200);
    await setBudgetGoal(currentUser.uid, 'Housing & Rent', 1500);
    await setBudgetGoal(currentUser.uid, 'Transport & Gas', 200);
  };

  // Export CSV Report
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ['Date', 'Title', 'Type', 'Category', `Amount (${currencySymbol})`, 'Payment Method', 'Description'];
    const rows = filteredTransactions.map((tx) => [
      tx.date,
      `"${tx.title.replace(/"/g, '""')}"`,
      tx.type,
      `"${tx.category}"`,
      tx.amount,
      tx.paymentMethod || 'card',
      `"${(tx.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <Wallet className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Financial Expenses & Budget
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Track daily expenditures, manage income, plan budgets, and monitor savings goals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {transactions.length === 0 && (
            <button
              onClick={handleSeedDemoData}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              <span>Load Sample Data</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleOpenAddModal('income')}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Income</span>
          </button>

          <button
            onClick={() => handleOpenAddModal('expense')}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Control Toolbar: Month & Currency Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-100/90 p-3 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Currency Picker */}
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Currency:</span>
          <select
            value={currencyCode}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Time Period Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-500 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Period:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All-Time History</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Net Balance */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Balance
            </span>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${totals.netBalance >= 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400'}`}>
              <span className="text-base font-bold">{currencySymbol}</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className={`text-2xl font-extrabold tracking-tight ${totals.netBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
              {currencySymbol}{totals.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {selectedMonth === 'all' ? 'All-time net balance' : `Net balance for ${selectedMonth}`}
          </p>
        </div>

        {/* Income Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Income
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
            +{currencySymbol}{totals.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {transactions.filter((t) => t.type === 'income').length} total earnings entries
          </p>
        </div>

        {/* Expenditure Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Expenses
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
            -{currencySymbol}{totals.expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {transactions.filter((t) => t.type === 'expense').length} paid expense entries
          </p>
        </div>

        {/* Savings Rate Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Savings Rate
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
              <PiggyBank className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
            {totals.savingsRate}%
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, totals.savingsRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Internal Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setSubTab('overview')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            subTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setSubTab('transactions')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            subTab === 'transactions'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Transactions Log ({transactions.length})</span>
        </button>

        <button
          onClick={() => setSubTab('budgets')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            subTab === 'budgets'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <PiggyBank className="h-4 w-4" />
          <span>Budget Planning ({budgets.length})</span>
        </button>

        <button
          onClick={() => setSubTab('analytics')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            subTab === 'analytics'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <PieIcon className="h-4 w-4" />
          <span>Category Analytics</span>
        </button>
      </div>

      {/* --- SUBTAB 1: OVERVIEW --- */}
      {subTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Activity List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-500" />
                Recent Financial Activity
              </h3>
              <button
                onClick={() => setSubTab('transactions')}
                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                View All
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <Wallet className="h-10 w-10 text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No expenses or income logged yet
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-sm">
                  Click "Add Expense" or "Add Income" above, or load sample starter data to test your financial tracking.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white dark:divide-slate-800/60 dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
                {transactions.slice(0, 6).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                          tx.type === 'income'
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                        }`}
                      >
                        {tx.type === 'income' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                          {tx.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {tx.category}
                          </span>
                          <span>•</span>
                          <span>{tx.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-sm font-extrabold ${
                          tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}{currencySymbol}{Number(tx.amount).toFixed(2)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(tx)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTx(tx.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Budget Health Summary Side Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-emerald-500" />
                Category Budgets Status
              </h3>
              <button
                onClick={() => {
                  setBudgetCategory('Food & Dining');
                  setBudgetLimit('');
                  setEditingBudgetId(undefined);
                  setIsBudgetModalOpen(true);
                }}
                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                + Add Budget
              </button>
            </div>

            {budgets.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No monthly budgets configured
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Set spend limits per category to get alert warnings when spending too fast.
                </p>
                <button
                  onClick={() => setIsBudgetModalOpen(true)}
                  className="mt-3 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
                >
                  Create First Budget
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {budgets.map((b) => {
                  const categorySpent = categoryBreakdown.find((c) => c.category === b.category)?.total || 0;
                  const limit = Number(b.monthlyLimit) || 1;
                  const pct = Math.round((categorySpent / limit) * 100);
                  const isOver = pct > 100;
                  const isNear = pct >= 80 && pct <= 100;

                  return (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {b.category}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {currencySymbol}{categorySpent.toFixed(0)} / {currencySymbol}{limit.toFixed(0)}
                        </span>
                      </div>

                      <div className="mt-2 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOver ? 'bg-rose-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[11px]">
                        <span
                          className={`font-semibold ${
                            isOver ? 'text-rose-600 dark:text-rose-400' : isNear ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
                          }`}
                        >
                          {pct}% Used
                        </span>
                        <button
                          onClick={() => handleDeleteBudget(b.id)}
                          className="text-slate-400 hover:text-rose-600 text-[10px]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SUBTAB 2: TRANSACTIONS LOG --- */}
      {subTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters & Search Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search transaction title, note, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">All Types</option>
                <option value="income">Income Only (+)</option>
                <option value="expense">Expense Only (-)</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">All Categories</option>
                {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  No matching transaction records found.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 font-bold text-slate-500 dark:bg-slate-800/60 dark:border-slate-800 dark:text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Transaction</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Payment Method</th>
                      <th className="px-4 py-3 text-right">Amount ({currencySymbol})</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          <div>
                            <span>{tx.title}</span>
                            {tx.description && (
                              <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                {tx.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {tx.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{tx.date}</td>
                        <td className="px-4 py-3 text-slate-500 uppercase font-semibold text-[10px]">
                          {tx.paymentMethod || 'card'}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold">
                          <span className={tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}>
                            {tx.type === 'income' ? '+' : '-'}{currencySymbol}{Number(tx.amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(tx)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTx(tx.id)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SUBTAB 3: BUDGET PLANNING --- */}
      {subTab === 'budgets' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Spending Limits & Budget Planning
              </h3>
              <p className="text-xs text-slate-500">
                Establish spending thresholds per category in {selectedCurrency.code} ({currencySymbol}).
              </p>
            </div>
            <button
              onClick={() => {
                setBudgetCategory('Food & Dining');
                setBudgetLimit('');
                setEditingBudgetId(undefined);
                setIsBudgetModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Configure New Budget</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DEFAULT_EXPENSE_CATEGORIES.map((cat) => {
              const existingBudget = budgets.find((b) => b.category === cat);
              const spent = categoryBreakdown.find((c) => c.category === cat)?.total || 0;

              if (!existingBudget) {
                return (
                  <div
                    key={cat}
                    className="flex flex-col justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {cat}
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Spent so far: <span className="font-semibold text-slate-700 dark:text-slate-300">{currencySymbol}{spent.toFixed(2)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setBudgetCategory(cat);
                        setBudgetLimit('300');
                        setEditingBudgetId(undefined);
                        setIsBudgetModalOpen(true);
                      }}
                      className="mt-3 text-left text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      + Set Limit
                    </button>
                  </div>
                );
              }

              const limit = Number(existingBudget.monthlyLimit) || 1;
              const pct = Math.round((spent / limit) * 100);
              const isOver = pct > 100;
              const isNear = pct >= 80 && pct <= 100;

              return (
                <div
                  key={cat}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {cat}
                      </h4>
                      <button
                        onClick={() => handleDeleteBudget(existingBudget.id)}
                        className="text-slate-400 hover:text-rose-600 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {currencySymbol}{spent.toFixed(0)}
                      </span>
                      <span className="text-xs text-slate-500">
                        Target Limit: {currencySymbol}{limit.toFixed(0)}
                      </span>
                    </div>

                    <div className="mt-2 h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? 'bg-rose-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        isOver ? 'text-rose-600 dark:text-rose-400' : isNear ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isOver ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {pct}% ({isOver ? 'Over Limit!' : isNear ? 'Warning (Near Limit)' : 'On Track'})
                    </span>

                    <button
                      onClick={() => {
                        setBudgetCategory(cat);
                        setBudgetLimit(existingBudget.monthlyLimit.toString());
                        setEditingBudgetId(existingBudget.id);
                        setIsBudgetModalOpen(true);
                      }}
                      className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- SUBTAB 4: ANALYTICS --- */}
      {subTab === 'analytics' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-indigo-500" />
              Expenditure Distribution by Category ({selectedCurrency.code})
            </h3>

            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500">No expense records logged to calculate breakdown.</p>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800 dark:text-slate-200">{item.category}</span>
                      <span className="text-slate-900 dark:text-white font-extrabold">
                        {currencySymbol}{item.total.toFixed(2)} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL: ADD / EDIT TRANSACTION --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-base font-bold">
                {editingTransaction ? 'Edit Financial Record' : `New ${type === 'income' ? 'Income' : 'Expense'}`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="mt-4 space-y-4 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-2 rounded-xl font-bold transition-colors ${
                    type === 'expense'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  Expense (-)
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-2 rounded-xl font-bold transition-colors ${
                    type === 'income'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  Income (+)
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title / Payee / Source *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grocery Store, Paycheck, Rent"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI / Mobile</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or invoice ref..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700 shadow-md transition-colors"
                >
                  {editingTransaction ? 'Save Changes' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CONFIGURE BUDGET GOAL --- */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold">Configure Category Budget</h3>
              <button
                onClick={() => setIsBudgetModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Budget Limit ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="10"
                  required
                  placeholder="e.g. 500"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="rounded-xl px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 font-bold text-white hover:bg-indigo-700 shadow-md"
                >
                  Save Budget Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
