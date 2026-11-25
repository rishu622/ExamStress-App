import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Lock, Mail, ArrowRight, KeyRound, Loader2, Eye, EyeOff, User as UserIcon, GraduationCap, Ticket, UserPlus, Compass } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import type { PublicConfig, User } from '../types';
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

const EmailInput: React.FC<{ value: string; onChange: (v: string) => void; id: string; hint?: string; autoFocus?: boolean }> = ({ value, onChange, id, hint, autoFocus }) => (
  <div className="space-y-1">
    <label htmlFor={id} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
      School e-mail
    </label>
    <div className="relative">
      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        id={id}
        type="email"
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete="username"
        placeholder={hint ? `name${hint}` : 'name@school.edu'}
        className={`${inputClass} pl-9`}
        required
        autoFocus={autoFocus}
      />
    </div>
  </div>
);

const SignInForm: React.FC = () => {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBox message={error} />}
      <EmailInput id="email" value={email} onChange={setEmail} autoFocus />
      <PasswordInput id="password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
      <button type="submit" disabled={busy} className={`${primaryButton} w-full py-3`}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        <span>{busy ? 'Signing in…' : 'Sign in'}</span>
      </button>
      <p className="text-[11px] text-center text-slate-400 leading-relaxed">
        Forgot your password? Ask your school administrator to reset it.
      </p>
    </form>
  );
};

const SignUpForm: React.FC<{ config: PublicConfig }> = ({ config }) => {
  const { applySession, setActivePage } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gradeClass, setGradeClass] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const domainHint = config.signup_email_domains.length ? `@${config.signup_email_domains[0]}` : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const data = await api.post<{ token: string; user: User }>('/api/auth/signup', {
        name: name.trim(),
        email: email.trim(),
        password,
        grade_class: gradeClass.trim() || null,
        join_code: joinCode.trim() || null,
      });
      applySession(data.token, data.user);
      setActivePage('student-portal');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        For students. Teachers, counselors and peer mentors get their accounts from the school administrator.
      </p>
      {error && <ErrorBox message={error} />}
      <div className="space-y-1">
        <label htmlFor="su-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Full name</label>
        <div className="relative">
          <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input id="su-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" required maxLength={100} className={`${inputClass} pl-9`} autoFocus />
        </div>
      </div>
      <EmailInput id="su-email" value={email} onChange={setEmail} hint={domainHint} />
      {config.signup_email_domains.length > 0 && (
        <p className="text-[11px] text-slate-400 -mt-2">Use your school e-mail ({config.signup_email_domains.map(d => '@' + d).join(' or ')}).</p>
      )}
      <div className="space-y-1">
        <label htmlFor="su-class" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Class <span className="font-normal text-slate-400">(e.g. 10-A)</span></label>
        <div className="relative">
          <GraduationCap className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input id="su-class" value={gradeClass} onChange={e => setGradeClass(e.target.value)} maxLength={30} className={`${inputClass} pl-9`} />
        </div>
      </div>
      {config.signup_code_required && (
        <div className="space-y-1">
          <label htmlFor="su-code" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">School join code</label>
          <div className="relative">
            <Ticket className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="su-code" value={joinCode} onChange={e => setJoinCode(e.target.value)} required autoComplete="off" className={`${inputClass} pl-9`} />
          </div>
          <p className="text-[11px] text-slate-400">Your teacher or school counselor can give you this.</p>
        </div>
      )}
      <PasswordInput id="su-password" label="Choose a password (8+ characters, letters and numbers)" value={password} onChange={setPassword} autoComplete="new-password" />
      <PasswordInput id="su-confirm" label="Repeat password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <button type="submit" disabled={busy} className={`${primaryButton} w-full py-3`}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        <span>{busy ? 'Creating account…' : 'Create student account'}</span>
      </button>
    </form>
  );
};

export const LoginPage: React.FC = () => {
  const { setGuest } = useApp();
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>(() => (window.location.hash.includes('signup') ? 'signup' : 'signin'));

  useEffect(() => {
    api.get<PublicConfig>('/api/auth/public-config').then(setConfig).catch(() => undefined);
  }, []);

  const showSignup = config?.signup_enabled ?? false;

  return (
    <Shell>
      {config?.school_name && config.school_name !== 'Your School' && (
        <p className="-mt-3 text-center text-xs font-semibold text-brand-blue">{config.school_name}</p>
      )}
      {showSignup && (
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl" role="tablist">
          {(['signin', 'signup'] as const).map(m => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`py-2 text-sm font-bold rounded-xl transition ${
                mode === m ? 'bg-white dark:bg-slate-700 text-brand-blue shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>
      )}

      {mode === 'signup' && showSignup && config ? <SignUpForm config={config} /> : <SignInForm />}

      {config?.guest_enabled && (
        <>
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-400 absolute">or</span>
          </div>
          <button type="button" onClick={() => setGuest(true)} className={`${secondaryButton} w-full py-3`}>
            <Compass className="w-4 h-4" /> Continue as guest
          </button>
          <p className="-mt-3 text-[11px] text-center text-slate-400">
            Try a private wellbeing check without an account. Nothing is saved.
          </p>
        </>
      )}
      {config && !showSignup && (
        <p className="text-[11px] text-center text-slate-400">Need an account? Ask your school administrator.</p>
      )}
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
