import React from 'react';
import { HeartHandshake } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { publicSettings } = useApp();
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400 mt-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
      <div className="flex items-start gap-1.5">
        <HeartHandshake className="w-4 h-4 text-rose-500 shrink-0 mt-px" />
        <span>
          <strong className="text-slate-700 dark:text-slate-300">Need help now? </strong>
          {publicSettings?.helpline_text ?? 'Contact your school counselor or a trusted adult.'}
        </span>
      </div>
      <span className="text-[11px] text-slate-400 shrink-0">
        ExamStress supports school counselors. It does not diagnose or replace professional care.
      </span>
    </footer>
  );
};
