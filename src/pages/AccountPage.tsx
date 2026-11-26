import React, { useEffect, useState } from 'react';
import { Settings, KeyRound, ShieldCheck, Loader2, Save, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import { ROLE_LABELS, formatDateTime } from '../lib/format';
import type { User } from '../types';
import { Card, dangerButton, inputClass, primaryButton } from '../components/common/ui';
import { ChangePasswordPage } from './LoginPage';

const PROFILE_TITLE: Record<string, string> = {
  counselor: 'Lead Counselor Profile',
  admin: 'Administrator Profile',
  'peer-mentor': 'Peer Mentor Profile',
};

export const AccountPage: React.FC = () => {
  const { user, updateUser, notify, publicSettings } = useApp();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.alert_phone ?? '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setPhone(user.alert_phone ?? '');
  }, [user]);

  if (!user) return null;
  const isStudent = user.role === 'student';
  const emailChanged = email.trim().toLowerCase() !== user.email;
  const dirty = name.trim() !== user.name || emailChanged || phone.trim() !== (user.alert_phone ?? '');

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!dirty) {
      notify('Nothing to save. Your preferences are up to date.', 'info');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const updated = await api.patch<User>('/api/auth/me/profile', {
        name: name.trim(),
        alert_phone: phone.trim(),
        ...(emailChanged ? { email: email.trim(), current_password: password } : {}),
      });
      updateUser(updated);
      setPassword('');
      notify('Preferences saved.');
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async () => {
    if (!window.confirm('Stop wellbeing check-ins? Your past check-ins stay visible to counselors until your school deletes them. You can opt in again any time.')) return;
    setBusy(true);
    try {
      await api.post('/api/me/consent/withdraw');
      updateUser({ ...user, consent_given: false });
      notify('You have opted out of check-ins.');
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const rows: [string, string][] = [
    ['Name', user.name],
    ['E-mail', user.email],
    ['Role', ROLE_LABELS[user.role]],
    ...(user.grade_class ? [['Class', user.grade_class] as [string, string]] : []),
    ...(user.anon_id ? [['Your private ID', user.anon_id] as [string, string]] : []),
    ['Last sign-in', formatDateTime(user.last_login_at)],
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <Card className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings & Profile Configuration</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isStudent
              ? 'Your account details, password and privacy choices.'
              : 'Manage your credentials, alert contact number, password and privacy parameters.'}
          </p>
        </div>
        {!isStudent && (
          <button onClick={() => save()} disabled={saving} className={`${primaryButton} shrink-0`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save preferences
          </button>
        )}
      </Card>

      {isStudent ? (
        <Card className="p-6">
          <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><Settings className="w-5 h-5 text-brand-blue" /> My account</h2>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <dt className="text-[11px] uppercase font-bold text-slate-400">{label}</dt>
                <dd className="font-semibold text-slate-800 dark:text-slate-100 break-all">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-500">To change your name, e-mail or class, ask your school administrator.</p>
        </Card>
      ) : (
        <Card className="p-5 sm:p-6">
          <form onSubmit={save} className="space-y-4">
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><Settings className="w-5 h-5 text-brand-blue" /> {PROFILE_TITLE[user.role] ?? 'Profile'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Full name
                <input value={name} onChange={e => setName(e.target.value)} maxLength={80} required className={`${inputClass} mt-1`} />
              </label>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                E-mail address
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={`${inputClass} mt-1`} />
              </label>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Alert SMS number <span className="font-normal text-slate-400">(optional)</span>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" maxLength={20} className={`${inputClass} mt-1 font-mono`} />
                <span className="block text-[11px] font-normal text-slate-400 mt-1">Kept for your school's urgent-contact list. Never shown to students.</span>
              </label>
              {emailChanged && (
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Current password <span className="font-normal text-slate-400">(needed to change e-mail)</span>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required className={`${inputClass} mt-1`} />
                </label>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"><p className="font-bold uppercase text-slate-400">Role</p><p className="font-semibold text-slate-700 dark:text-slate-200">{ROLE_LABELS[user.role]}</p></div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"><p className="font-bold uppercase text-slate-400">School</p><p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{publicSettings?.school_name ?? '—'}</p></div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"><p className="font-bold uppercase text-slate-400">Last sign-in</p><p className="font-semibold text-slate-700 dark:text-slate-200">{formatDateTime(user.last_login_at)}</p></div>
            </div>
            {formError && <p role="alert" className="text-sm text-rose-600">{formError}</p>}
            <button type="submit" disabled={saving || !dirty} className={primaryButton}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save preferences
            </button>
          </form>
        </Card>
      )}

      <Card className="p-5 sm:p-6 space-y-4">
        <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><Lock className="w-5 h-5 text-emerald-500" /> Digital Personal Data Protection (DPDP) compliance</h2>
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-2">
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Built for India's DPDP Act 2023 and child-safety guidelines</p>
          <ul className="text-sm text-slate-700 dark:text-slate-300 list-disc pl-5 space-y-1">
            <li>Check-in and attendance-simulator audio is processed in memory using acoustic feature extraction; the recording itself is never stored.</li>
            <li>Peer-chat voice notes are kept only inside their conversation and are deleted with it under the retention policy.</li>
            <li>Counselors see students under pseudonymous IDs. A name is revealed only with a stated reason, and every reveal is audit-logged.</li>
            <li>Students opt in with informed consent and can withdraw at any time. Data older than the retention period is erased automatically.</li>
          </ul>
        </div>
        <p className="text-xs text-slate-500">ExamStress is a screening and support aid. It does not diagnose and does not replace your school's safeguarding procedures.</p>
      </Card>

      <Card className="p-5 sm:p-6 space-y-4">
        <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><KeyRound className="w-5 h-5 text-brand-blue" /> Change password</h2>
        <ChangePasswordPage />
      </Card>

      {isStudent && (
        <Card className="p-6 space-y-3">
          <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-500" /> Privacy</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {user.consent_given
              ? 'You have agreed to wellbeing check-ins. You can stop at any time.'
              : 'You are not taking part in wellbeing check-ins. You can opt in from the My Wellbeing page.'}
          </p>
          {user.consent_given && (
            <button onClick={withdraw} disabled={busy} className={dangerButton}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Stop check-ins
            </button>
          )}
          <p className="text-xs text-slate-500">To have all your data deleted, ask your school administrator. They can permanently erase your account.</p>
        </Card>
      )}
    </div>
  );
};
