import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Upload, Volume2, Play, Pause, ArrowLeftRight, Activity, Zap, Clock, AudioLines, Loader2, Info, History, Trash2, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import { recordingSupported, toWav } from '../lib/audio';
import { VOICE_SAMPLES, synthesizeSample, type VoiceSample } from '../lib/voiceSamples';
import type { AttendanceAnalysis } from '../types';
import { Card, EmptyState, ErrorBox, Modal, inputClass, secondaryButton } from '../components/common/ui';
import { RiskBadge } from '../components/common/RiskBadge';
import { RiskScoreRing } from '../components/common/RiskScoreRing';
import { VocalTonePanel } from '../components/simulator/VocalTonePanel';

const MAX_CALL_SECONDS = 6;

type Run = AttendanceAnalysis & { runId: number; at: Date };

// Chrome / Edge / Safari expose speech-to-text; it fills the transcript for absolutist-word detection.
type Recognition = { start: () => void; stop: () => void; abort: () => void; continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null };
const getRecognition = (): Recognition | null => {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
};

const fmt = (v: number | null | undefined, digits = 0) => (v === null || v === undefined ? '—' : v.toFixed(digits));

const MetricCard: React.FC<{ icon: React.ElementType; tone: string; label: string; value: string; unit: string; hint: string; warn?: boolean }> = ({ icon: Icon, tone, label, value, unit, hint, warn }) => (
  <Card className={`p-4 sm:p-5 ${warn ? 'border-orange-300 dark:border-orange-900' : ''}`}>
    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Icon className={`w-4 h-4 ${tone}`} /> {label}</p>
    <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900 dark:text-white">{value} <span className="text-base">{unit}</span></p>
    <p className={`text-[11px] mt-2 ${warn ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-slate-400'}`}>{hint}</p>
  </Card>
);

const ResultPanel: React.FC<{ run: Run; compact?: boolean }> = ({ run, compact }) => {
  const f = run.features;
  const n = run.norms;
  return (
    <div className="space-y-4">
      <Card className="p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
        <RiskScoreRing score={run.score} zone={run.zone} size={compact ? 120 : 150} subtext="Wellbeing score" />
        <div className="flex-1 space-y-3 w-full">
          <p className="text-xs font-mono uppercase text-slate-400">Voice profile: <span className="text-lg font-sans normal-case font-extrabold text-slate-900 dark:text-white">{run.label ?? 'Live recording'}</span></p>
          <RiskBadge zone={run.zone} score={run.score} />
          <p className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200">{run.summary}</p>
          {run.transcript && <p className="text-xs text-slate-500">Heard: “{run.transcript}”</p>}
          {run.short_clip && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" /> Very short reply ({run.features.syllables} syllables): speech rate and pitch movement are rough estimates and count for half.
            </p>
          )}
          {run.crisis_language && (
            <p className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> The transcript contains possible self-harm language. Follow your safeguarding procedure.
            </p>
          )}
        </div>
      </Card>
      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-4'}`}>
        <MetricCard icon={Activity} tone="text-brand-blue" label="Pitch (fundamental)" value={fmt(f.pitch_hz)} unit="Hz"
          hint={`Typical ${n.pitch_hz[0]}-${n.pitch_hz[1]} Hz · movement ${fmt(f.pitch_variability_st, 1)} st`} warn={(f.pitch_variability_st ?? 9) < n.pitch_variability_st} />
        <MetricCard icon={Zap} tone="text-amber-500" label="Speech rate" value={fmt(f.speech_rate_wpm)} unit="WPM"
          hint={`Typical ${n.speech_rate_wpm[0]}-${n.speech_rate_wpm[1]} WPM`} warn={f.speech_rate_wpm !== null && (f.speech_rate_wpm < n.speech_rate_wpm[0] || f.speech_rate_wpm > 210)} />
        <MetricCard icon={Clock} tone="text-rose-500" label="Response latency" value={String(f.onset_latency_ms)} unit="ms"
          hint={`Baseline target < ${n.onset_latency_ms} ms`} warn={f.onset_latency_ms > n.onset_latency_ms} />
        <MetricCard icon={Volume2} tone="text-emerald-500" label="Acoustic energy" value={fmt(f.energy_db, 1)} unit="dB"
          hint={`Normalised power · low below ${n.energy_db} dB`} warn={f.energy_db < n.energy_db} />
      </div>
      <VocalTonePanel strain={run.vocal_strain} quality={run.features.quality} compact={compact} />
      {run.markers.length > 0 && (
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-bold uppercase text-slate-400 mb-2">What lowered the score</p>
          <div className="space-y-1.5">
            {run.markers.map(m => (
              <div key={m.label} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 text-slate-700 dark:text-slate-200">{m.label}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, (m.penalty / 22) * 100)}%` }} />
                </div>
                <span className="font-mono text-xs text-slate-500 w-10 text-right">-{m.penalty}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export const SimulatorPage: React.FC = () => {
  const { notify } = useApp();
  const [runs, setRuns] = useState<Run[]>([]);
  const [current, setCurrent] = useState<Run | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<[number | null, number | null]>([null, null]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const runCounter = useRef(0);
  const transcriptRef = useRef('');
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const stopEverything = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  };

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    stopEverything();
    audioRef.current?.pause();
  }, []);

  const analyse = async (wav: Blob, label: string, text: string, key: string) => {
    setBusy(key);
    setError('');
    try {
      const form = new FormData();
      form.append('audio', wav, 'attendance.wav');
      form.append('transcript', text);
      form.append('label', label);
      const result = await api.post<AttendanceAnalysis>('/api/voice/analyze', form);
      const run: Run = { ...result, runId: ++runCounter.current, at: new Date() };
      setRuns(prev => [run, ...prev].slice(0, 20));
      setCurrent(run);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
  };

  const startRecording = async () => {
    if (!recordingSupported()) {
      setError('Recording is not supported in this browser. Upload an audio file instead.');
      return;
    }
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false } });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      let heard = '';
      const recognition = getRecognition();
      if (recognition) {
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';
        recognition.onresult = e => {
          heard = Array.from(e.results).map(r => r[0].transcript).join(' ').trim();
          setTranscript(heard);
        };
        recognition.onerror = () => undefined;
        try { recognition.start(); } catch { /* already running */ }
        recognitionRef.current = recognition;
      }
      recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        stopEverything();
        try {
          const { wav } = await toWav(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
          // Give the speech recogniser a moment to deliver its final result.
          await new Promise(r => setTimeout(r, 400));
          await analyse(wav, 'Live recording', heard || transcriptRef.current, 'live');
        } catch (err) {
          setError(errorMessage(err));
        }
      };
      recorderRef.current = recorder;
      setTranscript('');
      recorder.start();
      setElapsed(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setElapsed(prev => {
          if (prev + 1 >= MAX_CALL_SECONDS) stopRecording();
          return prev + 1;
        });
      }, 1000);
    } catch {
      stopEverything();
      setError('Microphone access was blocked. Allow microphone access in your browser settings, or upload a file.');
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('That file is too large. Please use a clip under 10 MB.');
      return;
    }
    try {
      setBusy('upload');
      const { wav } = await toWav(file);
      await analyse(wav, file.name.replace(/\.[^.]+$/, '').slice(0, 60), transcript, 'upload');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  };

  const playSample = (sample: VoiceSample) => {
    audioRef.current?.pause();
    if (playing === sample.id) {
      setPlaying(null);
      return;
    }
    const url = URL.createObjectURL(synthesizeSample(sample));
    const audio = new Audio(url);
    audio.onended = () => { setPlaying(null); URL.revokeObjectURL(url); };
    audio.play().catch(() => notify('Playback was blocked by the browser.', 'error'));
    audioRef.current = audio;
    setPlaying(sample.id);
  };

  const openCompare = () => {
    if (runs.length < 2) {
      notify('Analyse at least two voices first (for example two samples from the library).', 'info');
      return;
    }
    setCompareIds([runs[1].runId, runs[0].runId]);
    setCompareOpen(true);
  };

  const left = runs.find(r => r.runId === compareIds[0]) ?? null;
  const right = runs.find(r => r.runId === compareIds[1]) ?? null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Card className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Attendance Voice AI Simulator & Biomarker Extractor</h1>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">Demo Studio</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Simulate a morning attendance call ("Present, ma'am"). Record live, upload a clip, or pick a benchmark voice to see real-time acoustic feature extraction. Audio is analysed in memory and never stored.
          </p>
        </div>
        <button onClick={openCompare} className={`${secondaryButton} shrink-0`}>
          <ArrowLeftRight className="w-4 h-4" /> Side-by-side comparison
        </button>
      </Card>

      {error && <ErrorBox message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-5 sm:p-6 space-y-4">
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><Mic className="w-5 h-5 text-brand-blue" /> Live audio capture</h2>
            <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center text-center gap-3">
              {recording ? (
                <>
                  <button onClick={stopRecording} className="w-20 h-20 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg recording-pulse" aria-label="Stop recording">
                    <Square className="w-7 h-7 fill-current" />
                  </button>
                  <p className="font-bold text-sm text-rose-600">Teacher: “Roll number 12?” — answer now</p>
                  <p className="text-xs text-slate-500">Recording {elapsed}s / {MAX_CALL_SECONDS}s · latency is measured from this moment</p>
                </>
              ) : (
                <>
                  <button onClick={startRecording} disabled={!!busy} className="w-20 h-20 rounded-full bg-brand-blue hover:bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-brand-blue/30 disabled:opacity-50" aria-label="Record attendance response">
                    {busy === 'live' ? <Loader2 className="w-8 h-8 animate-spin" /> : <Mic className="w-8 h-8" />}
                  </button>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Click to record attendance response</p>
                  <p className="text-xs text-slate-500">Simulates a 2-3 second morning check-in (stops after {MAX_CALL_SECONDS}s)</p>
                </>
              )}
            </div>
            <label className={`${secondaryButton} w-full cursor-pointer ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
              {busy === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload .WAV or .MP3 audio file
              <input type="file" accept="audio/*,.wav,.mp3,.m4a" className="hidden" onChange={onFile} />
            </label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Transcript <span className="font-normal text-slate-400">(auto-filled while recording where the browser supports speech-to-text; used for absolutist words)</span>
              <input value={transcript} onChange={e => setTranscript(e.target.value)} maxLength={500} placeholder="e.g. Present ma'am" className={`${inputClass} mt-1`} />
            </label>
          </Card>

          <Card className="p-5 sm:p-6 space-y-3">
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><AudioLines className="w-5 h-5 text-brand-blue" /> 1-click voice sample library</h2>
            <p className="text-xs text-slate-500">Synthetic benchmark voices (no real students) to test the acoustic extraction. Press play to listen, or analyse.</p>
            <div className="space-y-2">
              {VOICE_SAMPLES.map(sample => (
                <div key={sample.id} className={`p-3 rounded-2xl border transition ${current?.label === sample.name ? 'border-brand-blue ring-2 ring-brand-blue/20' : 'border-slate-200 dark:border-slate-800'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{sample.name}</p>
                      <p className="text-[11px] text-slate-500">{sample.description}</p>
                    </div>
                    <RiskBadge zone={sample.expectedZone} size="sm" showIcon={false} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => playSample(sample)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700">
                      {playing === sample.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />} {playing === sample.id ? 'Stop' : 'Play'}
                    </button>
                    <button
                      onClick={() => analyse(synthesizeSample(sample), sample.name, sample.transcript, sample.id)}
                      disabled={!!busy || recording}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-brand-blue text-white hover:bg-blue-600 disabled:opacity-50"
                    >
                      {busy === sample.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />} Analyse
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {current ? (
            <ResultPanel run={current} />
          ) : (
            <Card>
              <EmptyState icon={Mic} title="No voice analysed yet" text="Record an attendance response, upload a clip, or analyse a voice from the sample library to see pitch, speech rate, latency and energy." />
            </Card>
          )}

          <Card className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><History className="w-5 h-5 text-brand-blue" /> This session's runs</h2>
              {runs.length > 0 && (
                <button onClick={() => { setRuns([]); setCurrent(null); }} className="text-xs text-slate-500 hover:text-rose-600 inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Clear</button>
              )}
            </div>
            {runs.length === 0 ? (
              <p className="text-sm text-slate-500">Runs are kept only in this browser tab and are not saved.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase text-slate-400">
                    <tr>
                      <th className="text-left py-2">Voice</th><th className="text-left">Zone</th><th className="text-right">Pitch</th><th className="text-right">WPM</th><th className="text-right">Latency</th><th className="text-right">Energy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {runs.map(r => (
                      <tr key={r.runId} onClick={() => setCurrent(r)} className={`cursor-pointer hover:bg-blue-50/40 dark:hover:bg-slate-800/40 ${current?.runId === r.runId ? 'bg-blue-50/60 dark:bg-slate-800/60' : ''}`}>
                        <td className="py-2 font-semibold text-slate-800 dark:text-slate-100">{r.label ?? 'Recording'} <span className="text-[10px] text-slate-400">{r.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></td>
                        <td><RiskBadge zone={r.zone} score={r.score} size="sm" /></td>
                        <td className="text-right font-mono">{fmt(r.features.pitch_hz)}</td>
                        <td className="text-right font-mono">{fmt(r.features.speech_rate_wpm)}</td>
                        <td className="text-right font-mono">{r.features.onset_latency_ms}</td>
                        <td className="text-right font-mono">{fmt(r.features.energy_db, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <p className="text-xs text-slate-500 flex items-start gap-1.5">
            <Info className="w-4 h-4 shrink-0" /> A single 2-3 second clip is a weak signal. The score is a screening aid for practice and demonstration; it is not a diagnosis and is not added to any student's record.
          </p>
        </div>
      </div>

      <Modal open={compareOpen} onClose={() => setCompareOpen(false)} title="Side-by-side comparison" wide>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map(side => {
            const run = side === 0 ? left : right;
            return (
              <div key={side} className="space-y-3">
                <select
                  value={compareIds[side] ?? ''}
                  onChange={e => setCompareIds(prev => (side === 0 ? [Number(e.target.value), prev[1]] : [prev[0], Number(e.target.value)]))}
                  className={inputClass}
                  aria-label={side === 0 ? 'Left voice' : 'Right voice'}
                >
                  {runs.map(r => <option key={r.runId} value={r.runId}>{r.label ?? 'Recording'} · {r.score} ({r.at.toLocaleTimeString()})</option>)}
                </select>
                {run && <ResultPanel run={run} compact />}
              </div>
            );
          })}
        </div>
        {left && right && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Difference: <strong>{right.score - left.score > 0 ? '+' : ''}{right.score - left.score}</strong> points ·
            latency {right.features.onset_latency_ms - left.features.onset_latency_ms > 0 ? '+' : ''}{right.features.onset_latency_ms - left.features.onset_latency_ms} ms ·
            energy {(right.features.energy_db - left.features.energy_db).toFixed(1)} dB
          </p>
        )}
      </Modal>
    </div>
  );
};
