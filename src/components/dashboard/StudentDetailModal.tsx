import React, { useCallback, useEffect, useState } from 'react';
import { Eye, PhoneCall, ShieldAlert, StickyNote, CheckCircle2, Loader2, Lock, Mic, MessageSquareQuote } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useApp } from '../../context/AppContext';
import { api, errorMessage } from '../../lib/api';
import { MOOD_LABELS, SLEEP_LABELS, STRESS_LABELS, formatDateTime, shortDate, timeAgo } from '../../lib/format';
import type { StudentDetail } from '../../types';
import { ErrorBox, Modal, Spinner, dangerButton, inputClass, primaryButton, secondaryButton } from '../common/ui';
import { RiskBadge } from '../common/RiskBadge';
import { RiskScoreRing } from '../common/RiskScoreRing';

type Action = null | 'reveal' | 'contact' | 'note' | 'escalate' | 'resolve';

const FLAG_LABELS: Record<string, string> = {
  hopelessness: 'Hopelessness',
  anxiety: 'Anxiety',
  overwhelm: 'Overwhelm',
  low_mood: 'Low mood',
  sleep: 'Sleep problems',
  safety: 'Safety concern',
};

const ACTION_COPY: Record<Exclude<Action, null>, { title: string; label: string; placeholder: string; button: string; danger?: boolean }> = {
  reveal: {
    title: 'Reveal student identity',
    label: 'Why do you need to know who this student is? This is permanently recorded in the audit log.',
    placeholder: 'e.g. Red-zone check-in with distress language; need to arrange a meeting today',
    button: 'Reveal identity',
  },
  contact: { title: 'Log contact with student', label: 'What happened? (optional)', placeholder: 'e.g. Met in counselor office, agreed study plan, follow up Friday', button: 'Save contact' },
  note: { title: 'Add private case note', label: 'Note (visible to counselors and administrators only)', placeholder: 'Observation, plan, or follow-up…', button: 'Save note' },
  escalate: {
    title: 'Escalate to priority',
    label: 'Reason for escalation. The student is shown as Red until you resolve it, and all counselors are alerted.',
    placeholder: 'e.g. Teacher reports student crying in class and missing meals',
    button: 'Escalate',
    danger: true,
  },
  resolve: { title: 'Resolve escalation', label: 'Outcome (optional)', placeholder: 'e.g. Parents informed; referred to external therapist', button: 'Resolve escalation' },
};

export const StudentDetailModal: React.FC<{ studentId: string; onClose: () => void; onChanged: () => void }> = ({ studentId, onClose, onChanged }) => {
  const { notify, refreshAlerts } = useApp();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [error, setError] = useState('');
  const [identity, setIdentity] = useState<{ name: string; email: string; grade_class: string | null } | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(() => {
    api.get<StudentDetail>(`/api/students/${studentId}`).then(setStudent).catch(err => setError(errorMessage(err)));
  }, [studentId]);
  useEffect(load, [load]);

  const openAction = (a: Action) => {
    setAction(a);
    setText('');
    setActionError('');
  };

  const submitAction = async () => {
    if (!action) return;
    setBusy(true);
    setActionError('');
    try {
      if (action === 'reveal') {
        setIdentity(await api.post(`/api/students/${studentId}/reveal`, { reason: text }));
      } else if (action === 'contact' || action === 'note') {
        await api.post(`/api/students/${studentId}/notes`, { text, action_type: action });
      } else if (action === 'escalate') {
        await api.post(`/api/students/${studentId}/escalate`, { reason: text });
        refreshAlerts();
      } else if (action === 'resolve') {
        await api.post(`/api/students/${studentId}/resolve-escalation`, { note: text });
      }
      notify(action === 'reveal' ? 'Identity revealed and logged.' : 'Saved.');
      setAction(null);
      load();
      onChanged();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const latest = student?.history[student.history.length - 1];
  const recentNotes = student?.history.filter(c => c.note_text).slice(-5).reverse() ?? [];
  const voiceRows = student?.history.filter(c => c.voice_energy_db !== null) ?? [];
  const copy = action ? ACTION_COPY[action] : null;

  return (
    <Modal open onClose={onClose} title={student ? `Student ${student.anon_id}` : 'Student'} wide>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!student && !error && <Spinner label="Loading student…" />}
      {student && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
            {student.score !== null ? (
              <RiskScoreRing score={student.score} zone={student.zone ?? undefined} size={120} strokeWidth={11} />
            ) : (
              <div className="w-[120px] h-[120px] rounded-full border-8 border-slate-100 dark:border-slate-800 flex items-center justify-center text-xs text-slate-400 text-center p-3">No check-ins yet</div>
            )}
            <div className="flex-1 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                {student.zone && <RiskBadge zone={student.zone} />}
                {student.escalated && <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-600 text-white">Escalated</span>}
                {student.crisis_flag && <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Crisis language in latest check-in</span>}
                {!student.consent_given && <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Not opted in to check-ins</span>}
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                {student.grade_class ?? 'No class'} · last check-in {timeAgo(student.last_checkin_at)}
                {student.zone && ` · ${student.days_in_zone} day(s) in current zone`}
              </p>
              {student.escalation_reason && <p className="text-rose-700 dark:text-rose-300"><strong>Escalation:</strong> {student.escalation_reason}</p>}
              {student.last_contacted_at && <p className="text-emerald-700 dark:text-emerald-400 text-xs">Last contacted {formatDateTime(student.last_contacted_at)}</p>}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                {identity ? (
                  <p className="text-slate-800 dark:text-slate-100"><strong>{identity.name}</strong> · {identity.email}{identity.grade_class && ` · ${identity.grade_class}`}</p>
                ) : (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Identity hidden. Revealing it is logged with your reason.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!identity && <button onClick={() => openAction('reveal')} className={secondaryButton}><Eye className="w-4 h-4" /> Reveal identity</button>}
            <button onClick={() => openAction('contact')} className={primaryButton}><PhoneCall className="w-4 h-4" /> Log contact</button>
            <button onClick={() => openAction('note')} className={secondaryButton}><StickyNote className="w-4 h-4" /> Add note</button>
            {student.escalated ? (
              <button onClick={() => openAction('resolve')} className={secondaryButton}><CheckCircle2 className="w-4 h-4" /> Resolve escalation</button>
            ) : (
              <button onClick={() => openAction('escalate')} className={dangerButton}><ShieldAlert className="w-4 h-4" /> Escalate</button>
            )}
          </div>

          {copy && (
            <div className="p-4 rounded-2xl border border-brand-blue/30 bg-blue-50/40 dark:bg-slate-800/50 space-y-3">
              <p className="font-bold text-sm text-slate-900 dark:text-white">{copy.title}</p>
              <label className="block text-xs text-slate-600 dark:text-slate-300">
                {copy.label}
                <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder={copy.placeholder} className={`${inputClass} mt-1.5`} autoFocus />
              </label>
              {actionError && <ErrorBox message={actionError} />}
              <div className="flex gap-2">
                <button onClick={submitAction} disabled={busy} className={copy.danger ? dangerButton : primaryButton}>
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} {copy.button}
                </button>
                <button onClick={() => setAction(null)} className={secondaryButton}>Cancel</button>
              </div>
            </div>
          )}

          {student.history.length > 1 && (
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Check-in history</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={student.history.map(c => ({ date: shortDate(c.created_at), Wellbeing: c.score, Mood: c.mood * 20, Stress: c.stress * 20, Sleep: c.sleep * 20 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: 12, border: 'none', color: '#fff', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Wellbeing" stroke="#4A90E2" strokeWidth={3} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="Mood" stroke="#10b981" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="Stress" stroke="#f43f5e" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="Sleep" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-slate-400">Mood, stress and sleep are the student's own 1–5 answers, scaled ×20 to share the axis.</p>
            </div>
          )}

          {latest && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"><p className="text-slate-400 font-bold uppercase text-[10px]">Mood</p><p className="font-bold text-slate-800 dark:text-slate-100">{MOOD_LABELS[latest.mood]}</p></div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"><p className="text-slate-400 font-bold uppercase text-[10px]">Stress</p><p className="font-bold text-slate-800 dark:text-slate-100">{STRESS_LABELS[latest.stress]}</p></div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"><p className="text-slate-400 font-bold uppercase text-[10px]">Sleep</p><p className="font-bold text-slate-800 dark:text-slate-100">{SLEEP_LABELS[latest.sleep]}</p></div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5"><MessageSquareQuote className="w-4 h-4 text-brand-blue" /> What the student wrote</h3>
              {recentNotes.length === 0 ? (
                <p className="text-xs text-slate-500">No written notes in recent check-ins.</p>
              ) : (
                recentNotes.map(c => (
                  <div key={c.id} className={`p-3 rounded-xl text-xs border ${c.crisis_language ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
                    <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap">"{c.note_text}"</p>
                    <div className="flex flex-wrap gap-1 mt-2 items-center">
                      <span className="text-[10px] text-slate-400 mr-1">{formatDateTime(c.created_at)}</span>
                      {c.crisis_language && <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">Crisis language</span>}
                      {c.language_flags.map(f => <span key={f} className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">{FLAG_LABELS[f] ?? f}</span>)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5"><StickyNote className="w-4 h-4 text-brand-blue" /> Counselor log</h3>
              {student.notes.length === 0 ? (
                <p className="text-xs text-slate-500">No contacts or notes yet.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {student.notes.map(n => (
                    <div key={n.id} className="p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between gap-2 text-[10px] text-slate-400">
                        <span className="font-bold uppercase">{n.action_type} · {n.author_name}</span>
                        <span>{formatDateTime(n.created_at)}</span>
                      </div>
                      <p className="mt-1 text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{n.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {voiceRows.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5"><Mic className="w-4 h-4 text-brand-blue" /> Voice check-ins</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase text-slate-400">
                    <tr><th className="text-left py-1.5">Date</th><th className="text-left">Loudness</th><th className="text-left">Pauses</th><th className="text-left">Pitch</th><th className="text-left">Change vs. usual</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {voiceRows.slice(-6).reverse().map(c => (
                      <tr key={c.id}>
                        <td className="py-1.5">{shortDate(c.created_at)}</td>
                        <td>{c.voice_energy_db} dB</td>
                        <td>{c.voice_pause_ratio !== null ? `${Math.round(c.voice_pause_ratio * 100)}%` : '—'}</td>
                        <td>{c.voice_pitch_hz ? `${Math.round(c.voice_pitch_hz)} Hz` : '—'}</td>
                        <td>{c.voice_deviation === null ? 'Building baseline' : c.voice_deviation >= 0.5 ? `Large (${c.voice_deviation})` : c.voice_deviation >= 0.2 ? `Some (${c.voice_deviation})` : 'Typical'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-400">
                Voice features are compared only with this student's own earlier recordings. They can lower the wellbeing score by at most 10 points and are not diagnostic.
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
