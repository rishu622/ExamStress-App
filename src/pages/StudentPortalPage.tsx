import React, { useCallback, useEffect, useState } from 'react';
import { Heart, Sparkles, MessageSquareHeart, ShieldCheck, Loader2, PhoneCall, CheckCircle2, Mic, CalendarCheck, LifeBuoy } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import { toWav } from '../lib/audio';
import { MOOD_LABELS, SLEEP_LABELS, STRESS_LABELS, shortDate, timeAgo } from '../lib/format';
import type { CheckInResult, StudentSummary } from '../types';
import { Card, ErrorBox, Modal, Spinner, dangerButton, primaryButton, secondaryButton } from '../components/common/ui';
import { VoiceRecorder } from '../components/student/VoiceRecorder';
import { SCALE_EMOJI, ScalePicker } from '../components/student/ScalePicker';

const ConsentCard: React.FC<{ onAccepted: () => void }> = ({ onAccepted }) => {
  const { user, updateUser, notify, publicSettings } = useApp();
  const [busy, setBusy] = useState(false);
  const accept = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await api.post('/api/me/consent');
      updateUser({ ...user, consent_given: true });
      onAccepted();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-emerald-500" /> Before your first check-in
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {publicSettings?.school_name ?? 'Your school'} uses ExamStress so counselors can notice early when a student might need support. Please read how it works:
      </p>
      <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-2 list-disc pl-5">
        <li>Each check-in asks about your mood, stress and sleep. You can add a written note and a short voice recording if you want to.</li>
        <li><strong>School counselors can see your answers and notes</strong>, shown under a private ID (not your name). A counselor can look up your name only if they are worried about you, and every look-up is logged.</li>
        <li>Voice recordings are analysed for things like loudness and pauses, then <strong>deleted immediately</strong>. Only those numbers are kept.</li>
        <li>If something you write suggests you may be in danger, a counselor is alerted so they can reach out.</li>
        <li>This is not a medical test or diagnosis. Taking part is optional, and you can stop at any time from My Account.</li>
      </ul>
      <button onClick={accept} disabled={busy} className={primaryButton}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} I understand and agree
      </button>
    </Card>
  );
};

export const StudentPortalPage: React.FC = () => {
  const { user, setActivePage, notify, publicSettings } = useApp();
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [loadError, setLoadError] = useState('');
  const [mood, setMood] = useState(0);
  const [stress, setStress] = useState(0);
  const [sleep, setSleep] = useState(0);
  const [note, setNote] = useState('');
  const [audio, setAudio] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpSent, setHelpSent] = useState(false);

  const load = useCallback(() => {
    setLoadError('');
    api.get<StudentSummary>('/api/me/summary').then(setSummary).catch(err => setLoadError(errorMessage(err)));
  }, []);
  useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mood || !stress || !sleep) {
      setSubmitError('Please answer all three questions.');
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('mood', String(mood));
      form.append('stress', String(stress));
      form.append('sleep', String(sleep));
      form.append('note_text', note);
      if (audio) {
        const { wav } = await toWav(audio);
        form.append('audio', wav, 'checkin.wav');
      }
      const data = await api.post<CheckInResult>('/api/me/checkins', form);
      setResult(data);
      setMood(0);
      setStress(0);
      setSleep(0);
      setNote('');
      setAudio(null);
      load();
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const requestHelp = async () => {
    setHelpBusy(true);
    try {
      await api.post('/api/chat/crisis');
      setHelpSent(true);
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setHelpBusy(false);
    }
  };

  if (!user) return null;
  const firstName = user.name.split(' ')[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">
          <Heart className="w-3.5 h-3.5 fill-current" /> My wellbeing space
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3">Hi {firstName}, how are you doing today?</h1>
        <p className="text-sm text-blue-50 mt-2 max-w-2xl">
          A quick check-in takes about a minute. It helps you notice patterns and lets your school counselor offer support early.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setActivePage('peer-chat')} className="px-4 py-2.5 bg-white text-brand-blue font-bold text-sm rounded-2xl shadow-md hover:bg-slate-50 transition inline-flex items-center gap-2">
            <MessageSquareHeart className="w-4 h-4" /> Talk to a peer mentor
          </button>
          <button onClick={() => { setHelpSent(false); setHelpOpen(true); }} className="px-4 py-2.5 bg-rose-600 text-white font-bold text-sm rounded-2xl shadow-md hover:bg-rose-700 transition inline-flex items-center gap-2">
            <PhoneCall className="w-4 h-4" /> I need help now
          </button>
        </div>
      </div>

      {loadError && <ErrorBox message={loadError} onRetry={load} />}
      {!summary && !loadError && <Spinner label="Loading your check-ins…" />}

      {summary && !user.consent_given && <ConsentCard onAccepted={load} />}

      {summary && user.consent_given && (
        <>
          {result && (
            <Card className={`p-6 space-y-4 ${result.crisis ? 'border-rose-300 dark:border-rose-800' : ''}`}>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-5 h-5" /> Check-in saved. Thank you for taking a moment for yourself.
              </div>
              {result.helpline_text && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-100 text-sm space-y-1">
                  <p className="font-bold flex items-center gap-2"><LifeBuoy className="w-4 h-4" /> Support is available right now</p>
                  <p>{result.helpline_text}</p>
                  <p>{publicSettings?.counselor_contact_text}</p>
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
              {result.checkin.voice && !result.voice_baseline_ready && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" /> Voice notes are compared with your own usual voice once you have done 3 voice check-ins ({summary.voice_baseline_count}/3 so far).
                </p>
              )}
              <button onClick={() => setResult(null)} className={secondaryButton}>Done</button>
            </Card>
          )}

          {!result && (
            <Card className="p-5 sm:p-6">
              <form onSubmit={submit} className="space-y-6">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-brand-blue" /> Today's check-in
                  </h2>
                  {summary.checked_in_today && <span className="text-xs text-emerald-600 font-semibold">You've already checked in today ✓</span>}
                </div>
                <ScalePicker label="Mood" question="How are you feeling overall?" value={mood} onChange={setMood} labels={MOOD_LABELS} emoji={SCALE_EMOJI.mood} />
                <ScalePicker label="Stress" question="How stressed do you feel about studies or exams?" value={stress} onChange={setStress} labels={STRESS_LABELS} emoji={SCALE_EMOJI.stress} />
                <ScalePicker label="Sleep" question="How well did you sleep last night?" value={sleep} onChange={setSleep} labels={SLEEP_LABELS} emoji={SCALE_EMOJI.sleep} />

                <div className="space-y-2">
                  <label htmlFor="note" className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Anything on your mind? <span className="font-normal text-slate-500">(optional, counselors can read this)</span>
                  </label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    placeholder="e.g. I'm worried about my maths exam on Friday…"
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-brand-blue/30 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Voice note <span className="font-normal text-slate-500">(optional, 10 to 30 seconds about your day works best; deleted after analysis)</span>
                  </p>
                  <VoiceRecorder value={audio} onChange={setAudio} disabled={submitting} onError={setSubmitError} />
                </div>

                {submitError && <ErrorBox message={submitError} />}
                <button type="submit" disabled={submitting} className={`${primaryButton} w-full sm:w-auto py-3 px-6`}>
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Saving…' : 'Save check-in'}
                </button>
              </form>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <p className="text-xs font-bold text-slate-400 uppercase">This week</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{summary.checkins_this_week} check-in{summary.checkins_this_week === 1 ? '' : 's'}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-bold text-slate-400 uppercase">Average wellbeing this week</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {summary.average_score_this_week ?? '—'}
                {summary.average_score_this_week !== null && <span className="text-sm text-slate-400 font-semibold"> / 100</span>}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-bold text-slate-400 uppercase">Last check-in</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{summary.latest ? timeAgo(summary.latest.created_at) : '—'}</p>
            </Card>
          </div>

          <Card className="p-5 sm:p-6 space-y-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-blue" /> My wellbeing trend
            </h3>
            {summary.history.length < 2 ? (
              <p className="text-sm text-slate-500">Your trend appears here after two or more check-ins.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.history.map(c => ({ date: shortDate(c.created_at), score: c.score, mood: c.mood * 20, sleep: c.sleep * 20 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: 12, border: 'none', color: '#fff', fontSize: 12 }} />
                    <Line type="monotone" dataKey="score" name="Wellbeing" stroke="#4A90E2" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </>
      )}

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Get help now">
        {helpSent ? (
          <div className="space-y-3 text-sm">
            <p className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Your school counselor has been alerted.</p>
            <p className="text-slate-600 dark:text-slate-300">They will reach out to you as soon as they can. If you might be in danger <strong>right now</strong>, don't wait:</p>
            <p className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 font-semibold">{publicSettings?.helpline_text}</p>
            <p className="text-slate-600 dark:text-slate-300">{publicSettings?.counselor_contact_text}</p>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 font-semibold">
              If you are in immediate danger: {publicSettings?.helpline_text}
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              Pressing the button below alerts your school counselor that you need support, so they can contact you. They will see your private ID and can look up your name to find you.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={requestHelp} disabled={helpBusy} className={dangerButton}>
                {helpBusy && <Loader2 className="w-4 h-4 animate-spin" />} Alert my counselor
              </button>
              <button onClick={() => setHelpOpen(false)} className={secondaryButton}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
