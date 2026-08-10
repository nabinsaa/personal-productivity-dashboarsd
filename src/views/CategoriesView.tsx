import React, { useState } from 'react';
import { FolderKanban, Plus, Trash2, Edit2, FileText, CheckSquare, X } from 'lucide-react';
import { Category, Note, Task } from '../types';

interface CategoriesViewProps {
  categories: Category[];
  notes: Note[];
  tasks: Task[];
  onAddCategory: (cat: { name: string; color: string }) => Promise<void>;
  onUpdateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

const CATEGORY_COLORS = [
  { name: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-500' },
  { name: 'blue', bg: 'bg-blue-500', text: 'text-blue-500' },
  { name: 'purple', bg: 'bg-purple-500', text: 'text-purple-500' },
  { name: 'rose', bg: 'bg-rose-500', text: 'text-rose-500' },
  { name: 'amber', bg: 'bg-amber-500', text: 'text-amber-500' },
  { name: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-500' },
  { name: 'teal', bg: 'bg-teal-500', text: 'text-teal-500' },
];

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  notes,
  tasks,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('indigo');
  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    setCategoryToEdit(null);
    setName('');
    setColor('indigo');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setCategoryToEdit(cat);
    setName(cat.name);
    setColor(cat.color || 'indigo');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSaving(true);
      if (categoryToEdit) {
        await onUpdateCategory(categoryToEdit.id, { name: name.trim(), color });
      } else {
        await onAddCategory({ name: name.trim(), color });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organize notes and tasks into custom categories
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const linkedNotes = notes.filter((n) => n.categoryId === cat.id).length;
          const linkedTasks = tasks.filter((t) => t.categoryId === cat.id).length;

          return (
            <div
              key={cat.id}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400 font-bold">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {cat.name}
                    </h3>
                  </div>

                  {!cat.isSystem && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete category "${cat.name}"?`)) onDeleteCategory(cat.id);
                        }}
                        className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{linkedNotes} Notes</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckSquare className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{linkedTasks} Tasks</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {categoryToEdit ? 'Edit Category' : 'Create Category'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Health & Fitness"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Theme Color
                </label>
                <div className="flex items-center gap-2">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setColor(c.name)}
                      className={`h-7 w-7 rounded-full ${c.bg} transition-transform ${
                        color === c.name ? 'scale-125 ring-2 ring-indigo-600 ring-offset-2' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
                >
                  {isSaving ? 'Saving...' : categoryToEdit ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
