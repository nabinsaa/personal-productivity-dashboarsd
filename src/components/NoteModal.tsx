import React, { useState, useEffect, useRef } from 'react';
import { X, Pin, Trash2, Mic, MicOff } from 'lucide-react';
import { Note, Category } from '../types';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: { title: string; content: string; isPinned: boolean; categoryId?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  noteToEdit?: Note | null;
  categories: Category[];
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  noteToEdit,
  categories,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (noteToEdit) {
      setTitle(noteToEdit.title);
      setContent(noteToEdit.content);
      setIsPinned(noteToEdit.isPinned);
      setCategoryId(noteToEdit.categoryId || '');
    } else {
      setTitle('');
      setContent('');
      setIsPinned(false);
      setCategoryId('');
    }
    setIsListening(false);
  }, [noteToEdit, isOpen]);

  // Clean up speech recognition on modal unmount / close
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  const toggleSpeechDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please try Google Chrome or Edge.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript.trim()) {
            setContent((prev) => (prev ? prev + ' ' + currentTranscript : currentTranscript));
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('Error starting speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    try {
      setIsSaving(true);
      await onSave({
        title: title.trim() || 'Untitled Note',
        content,
        isPinned,
        categoryId: categoryId || undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (noteToEdit && onDelete) {
      if (confirm('Are you sure you want to delete this note?')) {
        await onDelete(noteToEdit.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {noteToEdit ? 'Edit Note' : 'Create Note'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`rounded-lg p-1.5 transition-colors ${
                isPinned
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isPinned ? 'Unpin note' : 'Pin note'}
            >
              <Pin className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note Title"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white dark:focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
            >
              <option value="">No Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Note Content
              </label>
              <button
                type="button"
                onClick={toggleSpeechDictation}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/80'
                }`}
                title={isListening ? 'Stop dictating' : 'Dictate note using microphone'}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-3.5 w-3.5" />
                    <span>Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5" />
                    <span>Dictate</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                isListening
                  ? 'Listening... Speak into your microphone to dictate note content.'
                  : 'Write your note here...'
              }
              className={`w-full rounded-xl border p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden dark:bg-slate-800/60 dark:text-white ${
                isListening
                  ? 'border-rose-400 ring-2 ring-rose-400/20'
                  : 'border-slate-200 focus:border-indigo-500 dark:border-slate-800'
              }`}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {noteToEdit && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
              >
                {isSaving ? 'Saving...' : noteToEdit ? 'Update Note' : 'Create Note'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

