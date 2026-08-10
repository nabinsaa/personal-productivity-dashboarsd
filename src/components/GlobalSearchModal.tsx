import React, { useState, useEffect } from 'react';
import { Search, X, FileText, CheckSquare, FolderKanban, ArrowRight } from 'lucide-react';
import { Note, Task, Category, ActiveTab, SearchResult } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  tasks: Task[];
  categories: Category[];
  setActiveTab: (tab: ActiveTab) => void;
  onSelectNote: (note: Note) => void;
  onSelectTask: (task: Task) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  notes,
  tasks,
  categories,
  setActiveTab,
  onSelectNote,
  onSelectTask,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getCategoryName = (catId?: string) => {
    if (!catId) return undefined;
    return categories.find((c) => c.id === catId)?.name;
  };

  const results: SearchResult[] = [];

  if (query.trim().length > 0) {
    const q = query.toLowerCase().trim();

    // Notes match
    notes.forEach((note) => {
      if (note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q)) {
        results.push({
          type: 'note',
          id: note.id,
          title: note.title || 'Untitled Note',
          description: note.content.slice(0, 80),
          categoryName: getCategoryName(note.categoryId),
          date: new Date(note.updatedAt).toLocaleDateString(),
          item: note,
        });
      }
    });

    // Tasks match
    tasks.forEach((task) => {
      if (task.title.toLowerCase().includes(q)) {
        results.push({
          type: 'task',
          id: task.id,
          title: task.title,
          description: task.dueDate ? `Due: ${task.dueDate} • Priority: ${task.priority}` : `Priority: ${task.priority}`,
          categoryName: getCategoryName(task.categoryId),
          completed: task.completed,
          item: task,
        });
      }
    });

    // Categories match
    categories.forEach((cat) => {
      if (cat.name.toLowerCase().includes(q)) {
        results.push({
          type: 'category',
          id: cat.id,
          title: cat.name,
          description: 'Category Tag',
          item: cat,
        });
      }
    });
  }

  const handleSelectResult = (res: SearchResult) => {
    onClose();
    if (res.type === 'note') {
      setActiveTab('notes');
      onSelectNote(res.item as Note);
    } else if (res.type === 'task') {
      setActiveTab('tasks');
      onSelectTask(res.item as Task);
    } else if (res.type === 'category') {
      setActiveTab('categories');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input field */}
        <div className="flex items-center border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <Search className="h-5 w-5 text-slate-400 shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, tasks, categories..."
            autoFocus
            className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden dark:text-white"
          />
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search results body */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim().length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
              Type to search across your notes, tasks, and categories.
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              No matches found for "<span className="font-semibold">{query}</span>"
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((res) => (
                <button
                  key={`${res.type}-${res.id}`}
                  onClick={() => handleSelectResult(res)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {res.type === 'note' && (
                        <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <FileText className="h-4 w-4" />
                        </div>
                      )}
                      {res.type === 'task' && (
                        <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                          <CheckSquare className="h-4 w-4" />
                        </div>
                      )}
                      {res.type === 'category' && (
                        <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                          <FolderKanban className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {res.title}
                        </span>
                        {res.categoryName && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {res.categoryName}
                          </span>
                        )}
                      </div>
                      {res.description && (
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {res.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 dark:text-slate-600 transition-opacity ml-2 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-2 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {results.length} result{results.length === 1 ? '' : 's'}
          </span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
};
