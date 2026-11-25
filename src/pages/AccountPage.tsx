import React, { useState } from 'react';
import { UserCog, KeyRound, ShieldCheck, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import { ROLE_LABELS, formatDateTime } from '../lib/format';
import { Card, dangerButton } from '../components/common/ui';
import { ChangePasswordPage } from './LoginPage';

export const AccountPage: React.FC = () => {
  const { user, updateUser, notify } = useApp();
  const [busy, setBusy] = useState(false);
  if (!user) return null;

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
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <Card className="p-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <UserCog className="w-6 h-6 text-brand-blue" /> My account
        </h1>
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <dt className="text-[11px] uppercase font-bold text-slate-400">{label}</dt>
              <dd className="font-semibold text-slate-800 dark:text-slate-100 break-all">{value}</dd>
            </div>
          ))}
        </dl>
        {user.role !== 'admin' && (
          <p className="mt-3 text-xs text-slate-500">To change your name, e-mail or class, ask your school administrator.</p>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-brand-blue" /> Change password
        </h2>
        <ChangePasswordPage />
      </Card>

      {user.role === 'student' && (
        <Card className="p-6 space-y-3">
          <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" /> Privacy
          </h2>
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
          <p className="text-xs text-slate-500">
            To have all your data deleted, ask your school administrator. They can permanently erase your account.
          </p>
        </Card>
      )}
    </div>
  );
};
