import React from 'react';
import { Phone, ShieldCheck, HeartHandshake } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3 px-6 text-xs text-slate-500 dark:text-slate-400 mt-auto flex flex-col md:flex-row items-center justify-between gap-3">
      {/* Left: Crisis Helplines */}
      <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
          <HeartHandshake className="w-4 h-4 text-brand-blue" />
          <span>Crisis Resources:</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="tel:18005990019"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-mono font-bold hover:bg-rose-100 transition"
          >
            <Phone className="w-3 h-3" /> 1800-599-0019 (KIRAN National Helpline)
          </a>
          <a
            href="tel:9152987821"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-brand-blue font-mono font-bold hover:bg-blue-100 transition"
          >
            <Phone className="w-3 h-3" /> 9152987821 (iCall Helpline)
          </a>
        </div>
      </div>

      {/* Right: Compliance Tag */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Anonymized Passive Audio Processing • DPDP Act 2023 Compliant</span>
      </div>
    </footer>
  );
};
