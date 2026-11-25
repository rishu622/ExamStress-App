import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2, Upload } from 'lucide-react';
import { MAX_RECORD_SECONDS, recordingSupported } from '../../lib/audio';

interface Props {
  value: Blob | null;
  onChange: (blob: Blob | null) => void;
  disabled?: boolean;
  onError: (message: string) => void;
}

export const VoiceRecorder: React.FC<Props> = ({ value, onChange, disabled, onError }) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const cleanup = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    cleanup();
  }, []);

  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
  };

  const start = async () => {
    if (!recordingSupported()) {
      onError('Recording is not supported in this browser. You can upload an audio file instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        cleanup();
        onChange(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setSeconds(prev => {
          if (prev + 1 >= MAX_RECORD_SECONDS) stop();
          return prev + 1;
        });
      }, 1000);
    } catch {
      cleanup();
      onError('Microphone access was blocked. Allow microphone access in your browser settings, or skip the voice part.');
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      onError('That file is too large. Please use a recording under 25 MB.');
      return;
    }
    onChange(file);
  };

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  if (recording) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
        <div className="flex items-center gap-3 text-rose-700 dark:text-rose-300 text-sm font-semibold">
          <span className="w-3 h-3 rounded-full bg-rose-500 recording-pulse" />
          Recording {mmss} <span className="font-normal text-xs opacity-80">(max {MAX_RECORD_SECONDS}s)</span>
        </div>
        <button type="button" onClick={stop} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl">
          <Square className="w-3.5 h-3.5 fill-current" /> Stop
        </button>
      </div>
    );
  }

  if (value && previewUrl) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <audio src={previewUrl} controls className="w-full sm:flex-1 h-10" />
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 rounded-xl"
        >
          <Trash2 className="w-4 h-4" /> Remove
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <button
        type="button"
        onClick={start}
        disabled={disabled}
        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-brand-blue/40 text-brand-blue font-semibold text-sm hover:bg-blue-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
      >
        <Mic className="w-5 h-5" /> Record a short voice note
      </button>
      <label className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <Upload className="w-4 h-4" /> Upload file
        <input type="file" accept="audio/*" className="hidden" onChange={onFile} />
      </label>
    </div>
  );
};
