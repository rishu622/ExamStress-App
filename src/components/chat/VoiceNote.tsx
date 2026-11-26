import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Loader2, Mic, Square } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { recordingSupported, toWav } from '../../lib/audio';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Plays a voice note; the audio is fetched with the session token only when first played. */
export const VoiceNotePlayer: React.FC<{ messageId: string; seconds: number; mine: boolean; onError: (m: string) => void }> = ({ messageId, seconds, mine, onError }) => {
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const toggle = async () => {
    if (state === 'playing') {
      audioRef.current?.pause();
      setState('paused');
      return;
    }
    if (!audioRef.current) {
      setState('loading');
      try {
        const blob = await api.getBlob(`/api/chat/messages/${messageId}/voice`);
        urlRef.current = URL.createObjectURL(blob);
        const audio = new Audio(urlRef.current);
        audio.ontimeupdate = () => setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
        audio.onended = () => { setState('idle'); setProgress(0); };
        audioRef.current = audio;
      } catch (err) {
        onError(errorMessage(err));
        setState('idle');
        return;
      }
    }
    try {
      await audioRef.current.play();
      setState('playing');
    } catch {
      setState('idle');
      onError('Playback was blocked by the browser.');
    }
  };

  return (
    <div className="flex items-center gap-3 min-w-48">
      <button
        type="button"
        onClick={toggle}
        aria-label={state === 'playing' ? 'Pause voice note' : 'Play voice note'}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${mine ? 'bg-white/20 text-white' : 'bg-brand-blue/10 text-brand-blue'}`}
      >
        {state === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : state === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className="flex-1 space-y-1">
        <div className={`h-1.5 rounded-full overflow-hidden ${mine ? 'bg-white/30' : 'bg-slate-300 dark:bg-slate-700'}`}>
          <div className={`h-full ${mine ? 'bg-white' : 'bg-brand-blue'}`} style={{ width: `${progress * 100}%` }} />
        </div>
        <p className={`text-[11px] font-mono ${mine ? 'text-blue-50' : 'text-slate-500'}`}>Voice note {mmss(seconds)}</p>
      </div>
    </div>
  );
};

const MAX_NOTE_SECONDS = 60;

/** Mic button for the chat composer. Records, converts to WAV and hands the file to `onRecorded`. */
export const VoiceNoteButton: React.FC<{ disabled?: boolean; onRecorded: (wav: Blob) => Promise<void>; onError: (m: string) => void }> = ({ disabled, onRecorded, onError }) => {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const cleanup = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };
  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    cleanup();
  }, []);

  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
  };

  const start = async () => {
    if (!recordingSupported()) {
      onError('Voice notes are not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        cleanup();
        setBusy(true);
        try {
          const { wav, seconds: length } = await toWav(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
          if (length < 0.6) throw new Error('That voice note was too short.');
          await onRecorded(wav);
        } catch (err) {
          onError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setSeconds(prev => {
          if (prev + 1 >= MAX_NOTE_SECONDS) stop();
          return prev + 1;
        });
      }, 1000);
    } catch {
      cleanup();
      onError('Microphone access was blocked. Allow it in your browser settings to send voice notes.');
    }
  };

  if (recording) {
    return (
      <button type="button" onClick={stop} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shrink-0" aria-label="Stop and send voice note">
        <Square className="w-4 h-4 fill-current" /> {mmss(seconds)}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled || busy}
      title="Record a voice note (up to 60 seconds)"
      aria-label="Record a voice note"
      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand-blue disabled:opacity-50 shrink-0"
    >
      {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
    </button>
  );
};
