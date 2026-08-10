import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, X, Check, Calendar, AlertCircle, Loader2, Folder } from 'lucide-react';
import { Task, Category } from '../types';

interface VoiceCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: Category[];
  onAddTask: (taskData: {
    title: string;
    description?: string;
    priority: 'Low' | 'Medium' | 'High';
    dueDate?: string;
    dueTime?: string;
    categoryId?: string;
  }) => Promise<void>;
}

export const VoiceCommandModal: React.FC<VoiceCommandModalProps> = ({
  isOpen,
  onClose,
  categories = [],
  onAddTask,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTask, setParsedTask] = useState<{
    title: string;
    dueDate?: string;
    dueTime?: string;
    priority: 'Low' | 'Medium' | 'High';
    categoryId?: string;
    categoryName?: string;
    description?: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setError('Microphone permission was denied. Please allow microphone access.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    setError('');
    setTranscript('');
    setParsedTask(null);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleProcessVoice = async (textToProcess?: string) => {
    const text = textToProcess || transcript;
    if (!text.trim()) return;

    stopListening();
    setIsProcessing(true);
    setError('');

    try {
      const res = await fetch('/api/gemini/parse-voice-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, categories }),
      });

      const data = await res.json();
      if (data.success && data.task) {
        const priorityVal = ['High', 'Medium', 'Low'].includes(data.task.priority)
          ? data.task.priority
          : 'Medium';

        // Resolve matched category ID
        let matchedCatId = '';
        const targetCatName = (data.task.categoryName || '').toLowerCase();
        if (targetCatName && categories.length > 0) {
          const found = categories.find((c) => c.name.toLowerCase().includes(targetCatName) || targetCatName.includes(c.name.toLowerCase()));
          if (found) matchedCatId = found.id;
        }

        setParsedTask({
          title: data.task.title || text,
          dueDate: data.task.dueDate || '',
          dueTime: data.task.dueTime || '',
          priority: priorityVal as 'Low' | 'Medium' | 'High',
          categoryId: matchedCatId,
          categoryName: data.task.categoryName || '',
          description: data.task.description || '',
        });
      } else {
        throw new Error(data.error || 'Could not parse task.');
      }
    } catch (err: any) {
      console.error(err);
      // Client regex fallback if server parse fails
      let matchedCatId = '';
      const lowerText = text.toLowerCase();
      const foundCat = categories.find((c) => lowerText.includes(c.name.toLowerCase()));
      if (foundCat) matchedCatId = foundCat.id;

      setParsedTask({
        title: text.replace(/add (a )?task (to )?/i, '').replace(/(?:to|in|under|for)\s+[a-zA-Z0-9\s]+?\s+category/i, '').trim(),
        priority: lowerText.includes('high') ? 'High' : 'Medium',
        categoryId: matchedCatId,
        categoryName: foundCat ? foundCat.name : '',
        description: 'Created via Voice Command',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTask = async () => {
    if (!parsedTask) return;
    try {
      await onAddTask(parsedTask);
      onClose();
      setParsedTask(null);
      setTranscript('');
    } catch (err) {
      console.error(err);
      setError('Failed to save task.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Voice Command Task Creator
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Speak naturally to create tasks hands-free
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopListening();
              onClose();
            }}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isSupported ? (
          <div className="py-8 text-center text-xs text-rose-500 font-semibold">
            Web Speech API is not supported in this browser. Please try Chrome, Edge, or Safari.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Listening Interface */}
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/40 ring-8 ring-rose-100 dark:ring-rose-950'
                    : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 dark:bg-indigo-500'
                }`}
              >
                {isListening ? (
                  <MicOff className="h-8 w-8 animate-pulse" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>

              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isListening ? 'Listening... Speak now!' : 'Click Microphone to Start Speaking'}
              </span>
            </div>

            {/* Live Transcript Display */}
            <div className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Transcript Preview
              </span>
              <p className="text-slate-800 dark:text-slate-200 font-medium italic">
                {transcript || (
                  <span className="text-slate-400 font-normal">
                    Try saying: "Add a task to buy groceries for tomorrow at 5pm" or "Add high priority task finish report"
                  </span>
                )}
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Process Button */}
            {transcript && !parsedTask && (
              <button
                onClick={() => handleProcessVoice()}
                disabled={isProcessing}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Parsing voice command...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Parse Spoken Task</span>
                  </>
                )}
              </button>
            )}

            {/* Parsed Result Card */}
            {parsedTask && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30 animate-fade-in space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Parsed Task Details
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      parsedTask.priority === 'High'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {parsedTask.priority} Priority
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {parsedTask.title}
                  </h4>
                  {parsedTask.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {parsedTask.description}
                    </p>
                  )}
                </div>

                {/* Category Assignment Field */}
                <div className="flex items-center gap-2 pt-1">
                  <Folder className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Category:</span>
                  <select
                    value={parsedTask.categoryId || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const catObj = categories.find((c) => c.id === selectedId);
                      setParsedTask({
                        ...parsedTask,
                        categoryId: selectedId,
                        categoryName: catObj ? catObj.name : '',
                      });
                    }}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="">No Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleConfirmTask}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>Confirm & Save Task</span>
                  </button>
                  <button
                    onClick={() => setParsedTask(null)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                  >
                    Re-speak
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
