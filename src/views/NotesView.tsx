import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit2,
  Grid,
  List as ListIcon,
  Folder,
} from 'lucide-react';
import { Note, Category } from '../types';

interface NotesViewProps {
  notes: Note[];
  categories: Category[];
  onOpenCreateNote: () => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (id: string) => Promise<void>;
  onTogglePin: (note: Note) => Promise<void>;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  categories,
  onOpenCreateNote,
  onEditNote,
  onDeleteNote,
  onTogglePin,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredNotes = notes.filter((note) => {
    const matchesCategory =
      selectedCategoryId === 'all' || note.categoryId === selectedCategoryId;
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategory = (catId?: string) => {
    if (!catId) return null;
    return categories.find((c) => c.id === catId);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          onClick={onOpenCreateNote}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategoryId('all')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategoryId === 'all'
              ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-500'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          All Notes ({notes.length})
        </button>
        {categories.map((cat) => {
          const count = notes.filter((n) => n.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategoryId === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-500'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Notes Grid / List */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
          <FileText className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Notes Found</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {searchQuery
              ? 'Try matching another search keyword.'
              : 'Create your first note to capture thoughts, ideas, or meeting logs!'}
          </p>
          <button
            onClick={onOpenCreateNote}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>Create Note</span>
          </button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
              : 'space-y-3'
          }
        >
          {filteredNotes.map((note) => {
            const cat = getCategory(note.categoryId);
            return (
              <div
                key={note.id}
                className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:bg-slate-900 dark:hover:border-indigo-500 ${
                  note.isPinned
                    ? 'border-amber-200 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3
                      onClick={() => onEditNote(note)}
                      className="cursor-pointer font-bold text-slate-900 dark:text-white text-sm hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1"
                    >
                      {note.title || 'Untitled Note'}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onTogglePin(note)}
                        title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
                        className={`rounded-lg p-1 transition-colors ${
                          note.isPinned
                            ? 'text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                            : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-amber-500 dark:text-slate-600'
                        }`}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p
                    onClick={() => onEditNote(note)}
                    className="cursor-pointer text-xs text-slate-600 dark:text-slate-300 line-clamp-4 whitespace-pre-wrap leading-relaxed"
                  >
                    {note.content || <span className="italic text-slate-400">No content provided...</span>}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    {cat && (
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                        {cat.name}
                      </span>
                    )}
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditNote(note)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this note?')) onDeleteNote(note.id);
                      }}
                      className="rounded-lg p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
