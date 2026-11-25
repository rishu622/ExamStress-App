import React from 'react';

export const SCALE_EMOJI = {
  mood: ['', '😞', '🙁', '😐', '🙂', '😄'],
  stress: ['', '😌', '🙂', '😐', '😣', '😫'],
  sleep: ['', '😩', '🥱', '😐', '🙂', '😴'],
};

export const ScalePicker: React.FC<{
  label: string;
  question: string;
  value: number;
  onChange: (v: number) => void;
  labels: string[];
  emoji: string[];
}> = ({ label, question, value, onChange, labels, emoji }) => (
  <fieldset className="space-y-2">
    <legend className="text-sm font-bold text-slate-800 dark:text-slate-100">
      {label} <span className="font-normal text-slate-500 dark:text-slate-400">· {question}</span>
    </legend>
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl border text-[11px] font-semibold transition ${
            value === n
              ? 'bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/25'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-blue/50'
          }`}
        >
          <span className="text-xl leading-none" aria-hidden>
            {emoji[n]}
          </span>
          <span className="leading-tight text-center">{labels[n]}</span>
        </button>
      ))}
    </div>
  </fieldset>
);
