import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Lock, Mail, ArrowRight, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import type { User } from '../types';
import { ErrorBox, inputClass, primaryButton, secondaryButton } from '../components/common/ui';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none" />
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-mint/20 rounded-full blur-3xl pointer-events-none" />
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 dark:border-slate-800 p-6 sm:p-8 space-y-6 relative z-10"
    >
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-mint flex items-center justify-center text-white shadow-lg shadow-brand-blue/30">
          <Activity className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Exam<span className="text-brand-blue">Stress</span>
        </h1>
        <p className="text-xs text-slate-500">Student wellbeing check-ins and support</p>
      </div>
      {children}
    </motion.div>
  </div>
);

const PasswordInput: React.FC<{ value: string; onChange: (v: string) => void; label: string; autoComplete: string; id: string }> = ({
  value,
  onChange,
  label,
  autoComplete,
  id,
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`${inputClass} pl-9 pr-10`}
          required
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export const LoginPage: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Shell>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBox message={error} />}
        <div className="space-y-1">
          <label htmlFor="email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            School e-mail
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              className={`${inputClass} pl-9`}
              required
              autoFocus
            />
          </div>
        </div>
        <PasswordInput id="password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <button type="submit" disabled={busy} className={`${primaryButton} w-full py-3`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          <span>{busy ? 'Signing in…' : 'Sign in'}</span>
        </button>
      </form>
      <p className="text-[11px] text-center text-slate-400 leading-relaxed">
        Accounts are created by your school. If you forgot your password, ask your school administrator to reset it.
      </p>
    </Shell>
  );
};

export const ChangePasswordPage: React.FC<{ forced?: boolean; onDone?: () => void }> = ({ forced, onDone }) => {
  const { applySession, logout, notify } = useApp();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next !== confirm) {
      setError('The new passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const data = await api.post<{ token: string; user: User }>('/api/auth/change-password', {
        current_password: current,
        new_password: next,
      });
      applySession(data.token, data.user);
      notify('Password updated.');
      setCurrent('');
      setNext('');
      setConfirm('');
      onDone?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {forced && (
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-100 flex gap-2">
          <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Welcome! Please replace the temporary password you were given with one only you know.</span>
        </div>
      )}
      {error && <ErrorBox message={error} />}
      <PasswordInput id="current" label={forced ? 'Temporary password' : 'Current password'} value={current} onChange={setCurrent} autoComplete="current-password" />
      <PasswordInput id="new" label="New password (8+ characters, letters and numbers)" value={next} onChange={setNext} autoComplete="new-password" />
      <PasswordInput id="confirm" label="Repeat new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={`${primaryButton} flex-1`}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save new password
        </button>
        {forced && (
          <button type="button" onClick={logout} className={secondaryButton}>
            Sign out
          </button>
        )}
      </div>
    </form>
  );

  return forced ? <Shell>{form}</Shell> : form;
};
