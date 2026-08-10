import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send, Radio } from 'lucide-react';
import { ChatAttachment } from '../types';
import { requestMediaStreamSafely } from '../services/mediaPermissionsService';

interface VoiceRecorderProps {
  onSendVoiceNote: (attachment: ChatAttachment, duration: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendVoiceNote,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      const mediaResult = await requestMediaStreamSafely({ video: false, audio: true });
      if (!mediaResult.granted || !mediaResult.stream) {
        alert(mediaResult.error || 'Microphone access is unavailable.');
        onCancel();
        return;
      }
      const stream = mediaResult.stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);

        // stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone recording error:', err);
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const stopRecordingCleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    if (!audioBlob) return;
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const attachment: ChatAttachment = {
        name: `voice_note_${Date.now()}.webm`,
        url: base64data,
        type: 'audio',
        size: `${Math.round(audioBlob.size / 1024)} KB`,
      };
      onSendVoiceNote(attachment, recordDuration);
    };
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center space-x-3 px-3 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 transition-all">
      {isRecording ? (
        <>
          <div className="flex items-center space-x-2 text-rose-500 font-mono text-xs font-semibold animate-pulse">
            <Radio className="h-4 w-4 text-rose-500" />
            <span>REC {formatSeconds(recordDuration)}</span>
          </div>
          <div className="flex-1 h-2 bg-indigo-200 dark:bg-indigo-900 rounded-full overflow-hidden relative">
            <div className="h-full bg-rose-500 rounded-full w-full animate-pulse" />
          </div>
          <button
            onClick={stopRecording}
            className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
            title="Stop Recording"
          >
            <Square className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}
          <button
            onClick={handlePlayPause}
            className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="flex-1 text-xs text-indigo-900 dark:text-indigo-200 font-mono">
            Voice Note ({formatSeconds(recordDuration)})
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            title="Discard Voice Note"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleSend}
            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm flex items-center space-x-1 px-3 text-xs font-medium"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send</span>
          </button>
        </>
      )}
    </div>
  );
};
