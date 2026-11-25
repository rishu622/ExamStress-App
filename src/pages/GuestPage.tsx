import React, { useEffect, useState } from 'react';
import { Activity, ArrowLeft, Compass, Loader2, LifeBuoy, UserPlus, EyeOff, Moon, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import { MOOD_LABELS, SLEEP_LABELS, STRESS_LABELS } from '../lib/format';
import type { GuestResult, PublicConfig } from '../types';
import { Card, ErrorBox, inputClass, primaryButton, secondaryButton } from '../components/common/ui';
import { SCALE_EMOJI, ScalePicker } from '../components/student/ScalePicker';

export const GuestPage: React.FC = () => {
  const { setGuest, darkMode, toggleDarkMode } = useApp();
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [mood, setMood] = useState(0);
  const [stress, setStress] = useState(0);
  const [sleep, setSleep] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GuestResult | null>(null);

  useEffect(() => {
    api.get<PublicConfig>('/api/auth/public-config').then(setConfig).catch(() => undefined);
  }, []);

  const goToSignup = () => {
    window.location.hash = '/signup';
    setGuest(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mood || !stress || !sleep) {
      setError('Please answer all three questions.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      setResult(await api.post<GuestResult>('/api/guest/checkin', { mood, stress, sleep, note_text: note }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    setMood(0);
    setStress(0);
    setSleep(0);
    setNote('');
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-mint flex items-center justify-center text-white">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="font-bold tracking-tight">Exam<span className="text-brand-blue">Stress</span></span>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 inline-flex items-center gap-1">
            <Compass className="w-3 h-3" /> Guest
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleDarkMode} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setGuest(false)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4" /> Sign in
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-5 pb-10">
          <div className="bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">How are you doing today?</h1>
            <p className="text-sm text-blue-50 mt-2">Take a one-minute wellbeing check and get some ideas that might help.</p>
            <p className="mt-3 inline-flex items-start gap-2 text-xs bg-white/20 rounded-xl px-3 py-2">
              <EyeOff className="w-4 h-4 shrink-0" />
              Guest mode: nothing is saved and your school does not see this. To track your wellbeing over time or talk to a peer mentor, create a free student account.
            </p>
          </div>

          {result ? (
            <Card className={`p-5 sm:p-6 space-y-4 ${result.crisis ? 'border-rose-300 dark:border-rose-800' : ''}`}>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold font-mono text-brand-blue">{result.score}</span>
                <span className="text-sm text-slate-500">/ 100 wellbeing today</span>
              </div>
              {(result.crisis || result.low) && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-100 text-sm space-y-1">
                  <p className="font-bold flex items-center gap-2"><LifeBuoy className="w-4 h-4" /> Support is available right now</p>
                  <p>{result.helpline_text}</p>
                  <p>{result.counselor_contact_text}</p>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {result.tips.map(tip => (
                  <div key={tip.kind} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{tip.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{tip.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {config?.signup_enabled && (
                  <button onClick={goToSignup} className={primaryButton}><UserPlus className="w-4 h-4" /> Create a student account</button>
                )}
                <button onClick={reset} className={secondaryButton}>Check in again</button>
              </div>
            </Card>
          ) : (
            <Card className="p-5 sm:p-6">
              <form onSubmit={submit} className="space-y-6">
                <ScalePicker label="Mood" question="How are you feeling overall?" value={mood} onChange={setMood} labels={MOOD_LABELS} emoji={SCALE_EMOJI.mood} />
                <ScalePicker label="Stress" question="How stressed do you feel about studies or exams?" value={stress} onChange={setStress} labels={STRESS_LABELS} emoji={SCALE_EMOJI.stress} />
                <ScalePicker label="Sleep" question="How well did you sleep last night?" value={sleep} onChange={setSleep} labels={SLEEP_LABELS} emoji={SCALE_EMOJI.sleep} />
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                  Anything on your mind? <span className="font-normal text-slate-500">(optional, not saved)</span>
                  <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={2000} rows={3} className={`${inputClass} mt-2 font-normal`} />
                </label>
                {error && <ErrorBox message={error} />}
                <button type="submit" disabled={busy} className={`${primaryButton} w-full sm:w-auto py-3 px-6`}>
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} See my results
                </button>
              </form>
            </Card>
          )}
        </div>
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400">
        <strong className="text-slate-700 dark:text-slate-300">Need help now? </strong>
        {config?.helpline_text ?? 'Contact your school counselor or a trusted adult.'}
      </footer>
    </div>
  );
};
