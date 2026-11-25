import React, { useCallback, useEffect, useState } from 'react';
import { Save, Loader2, Mail, Sliders, ShieldCheck, LifeBuoy, School, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api, errorMessage } from '../../lib/api';
import type { SchoolSettings } from '../../types';
import { Card, ErrorBox, Spinner, inputClass, primaryButton, secondaryButton } from '../common/ui';

const Section: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <Card className="p-5 sm:p-6 space-y-4">
    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><Icon className="w-5 h-5 text-brand-blue" /> {title}</h3>
    {children}
  </Card>
);

export const SettingsTab: React.FC = () => {
  const { notify, refreshPublicSettings } = useApp();
  const [values, setValues] = useState<SchoolSettings | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);

  const load = useCallback(() => {
    api.get<SchoolSettings>('/api/settings').then(v => { setValues(v); setError(''); }).catch(err => setError(errorMessage(err)));
  }, []);
  useEffect(load, [load]);

  if (error && !values) return <ErrorBox message={error} onRetry={load} />;
  if (!values) return <Spinner />;

  const set = <K extends keyof SchoolSettings>(key: K, value: SchoolSettings[K]) => setValues({ ...values, [key]: value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { smtp_configured: _ignored, ...payload } = values;
      void _ignored;
      setValues(await api.put<SchoolSettings>('/api/settings', payload));
      refreshPublicSettings();
      notify('Settings saved.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const runPurge = async () => {
    if (!window.confirm(`Delete all check-ins and closed chats older than ${values.data_retention_days} days now? This cannot be undone.`)) return;
    setPurging(true);
    try {
      const r = await api.post<{ checkins: number; conversations: number }>('/api/retention/run');
      notify(`Deleted ${r.checkins} check-in(s) and ${r.conversations} closed conversation(s).`);
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setPurging(false);
    }
  };

  const num = (key: 'threshold_green_min' | 'threshold_yellow_min' | 'threshold_orange_min' | 'data_retention_days') => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, Number(e.target.value));

  return (
    <form onSubmit={save} className="space-y-5">
      <Section icon={School} title="School">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">School name
          <input value={values.school_name} onChange={e => set('school_name', e.target.value)} required className={`${inputClass} mt-1`} />
        </label>
      </Section>

      <Section icon={LifeBuoy} title="Help shown to students">
        <p className="text-xs text-slate-500">Shown in the footer, after worrying check-ins and on every "I need help now" screen. <strong>Check these numbers are correct for your region before going live.</strong></p>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Crisis helplines
          <textarea value={values.helpline_text} onChange={e => set('helpline_text', e.target.value)} rows={2} required className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">How to reach the school counselor
          <textarea value={values.counselor_contact_text} onChange={e => set('counselor_contact_text', e.target.value)} rows={2} required className={`${inputClass} mt-1`} />
        </label>
      </Section>

      <Section icon={Sliders} title="Wellbeing zones">
        <p className="text-xs text-slate-500">Scores run from 0 (needs urgent support) to 100 (doing well). Each zone starts at the score below. Students below Orange are Red.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([['threshold_green_min', 'Green from', 'text-emerald-600'], ['threshold_yellow_min', 'Yellow from', 'text-amber-600'], ['threshold_orange_min', 'Orange from', 'text-orange-600']] as const).map(([key, label, tone]) => (
            <label key={key} className={`block text-sm font-semibold ${tone}`}>{label}
              <input type="number" min={1} max={100} value={values[key]} onChange={num(key)} className={`${inputClass} mt-1`} />
            </label>
          ))}
        </div>
      </Section>

      <Section icon={Mail} title="Alert e-mails">
        <div className={`p-3 rounded-xl text-xs ${values.smtp_configured ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'}`}>
          {values.smtp_configured
            ? 'E-mail sending is configured on the server. Critical and high alerts are e-mailed to every active counselor (without student names).'
            : 'E-mail sending is NOT configured on the server, so alerts only appear in the dashboard. Set SMTP_HOST, SMTP_FROM (and credentials) in the server environment to enable it.'}
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
          <input type="checkbox" checked={values.email_alerts_enabled} onChange={e => set('email_alerts_enabled', e.target.checked)} className="w-4 h-4 accent-brand-blue" />
          Send alert e-mails
        </label>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Extra recipients <span className="font-normal text-slate-400">(comma-separated, e.g. principal)</span>
          <input value={values.alert_email_recipients} onChange={e => set('alert_email_recipients', e.target.value)} className={`${inputClass} mt-1`} />
        </label>
      </Section>

      <Section icon={ShieldCheck} title="Data retention">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Keep check-ins and closed chats for (days)
          <input type="number" min={7} max={3650} value={values.data_retention_days} onChange={num('data_retention_days')} className={`${inputClass} mt-1 sm:w-48`} />
        </label>
        <p className="text-xs text-slate-500">Older data is deleted automatically once a day. Voice recordings are never stored.</p>
        <button type="button" onClick={runPurge} disabled={purging} className={secondaryButton}>
          {purging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Run clean-up now
        </button>
      </Section>

      {error && <ErrorBox message={error} />}
      <div className="sticky bottom-4 flex justify-end">
        <button type="submit" disabled={saving} className={`${primaryButton} shadow-lg`}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save settings
        </button>
      </div>
    </form>
  );
};
