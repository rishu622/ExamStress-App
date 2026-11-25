import React, { useEffect } from 'react';
import { X, Loader2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs ${className}`}>
    {children}
  </div>
);

export const Spinner: React.FC<{ label?: string; className?: string }> = ({ label, className = '' }) => (
  <div className={`flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-10 ${className}`}>
    <Loader2 className="w-5 h-5 animate-spin text-brand-blue" />
    {label && <span>{label}</span>}
  </div>
);

export const EmptyState: React.FC<{ icon?: React.ElementType; title: string; text?: string; action?: React.ReactNode }> = ({
  icon: Icon = Info,
  title,
  text,
  action,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-4 space-y-2">
    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
      <Icon className="w-6 h-6" />
    </div>
    <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">{title}</p>
    {text && <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">{text}</p>}
    {action}
  </div>
);

export const ErrorBox: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-3">
    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
    <div className="flex-1">{message}</div>
    {onRetry && (
      <button onClick={onRetry} className="text-xs font-bold underline shrink-0">
        Try again
      </button>
    )}
  </div>
);

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ open, onClose, title, children, wide }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={e => e.stopPropagation()}
        className={`w-full ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <h2 className="font-bold text-base text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
};

export const Toasts: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 sm:w-96 pointer-events-none" aria-live="polite">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto p-3.5 rounded-2xl shadow-lg border text-sm flex items-start gap-2.5 ${
            t.kind === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-100'
              : t.kind === 'info'
                ? 'bg-white border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-100'
          }`}
        >
          {t.kind === 'error' ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : t.kind === 'info' ? <Info className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="flex-1">{t.text}</span>
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const inputClass =
  'w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue dark:text-white disabled:opacity-60';

export const primaryButton =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-brand-blue hover:bg-blue-600 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed';

export const secondaryButton =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed';

export const dangerButton =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed';
