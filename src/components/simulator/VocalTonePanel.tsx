import React from 'react';
import { Waves, HeartCrack } from 'lucide-react';
import type { VocalStrain, VoiceQuality } from '../../types';
import { Card } from '../common/ui';

const tone = (index: number) =>
  index >= 0.45 ? { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' }
    : index >= 0.3 ? { bar: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' }
      : index >= 0.15 ? { bar: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400' }
        : { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' };

const f = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? '—' : v.toFixed(d));

/** Results of the voice-quality model: how the voice is produced (tremor, breathiness, cracking, sobbing). */
export const VocalTonePanel: React.FC<{ strain: VocalStrain | null; quality: VoiceQuality | undefined; compact?: boolean }> = ({ strain, quality, compact }) => {
  if (!strain || !quality) return null;
  const t = tone(strain.index);
  const rows: { label: string; value: string; hint: string; warn: boolean }[] = [
    { label: 'Harmonics-to-noise', value: `${f(quality.hnr_db)} dB`, hint: 'Low = breathy / tearful', warn: (quality.hnr_db ?? 99) < 3.5 },
    { label: 'Jitter', value: `${f(quality.jitter_st, 2)} st`, hint: 'High = shaky, trembling', warn: (quality.jitter_st ?? 0) > 0.35 },
    { label: 'Shimmer', value: `${f(quality.shimmer_db, 2)} dB`, hint: 'High = unsteady loudness', warn: (quality.shimmer_db ?? 0) > 1 },
    { label: 'Peak pitch', value: `${f(quality.pitch_max_hz, 0)} Hz`, hint: 'Very high = strained', warn: (quality.pitch_max_hz ?? 0) > 420 },
    { label: 'Voice cracks', value: `${quality.pitch_jumps + quality.voice_breaks}`, hint: 'Sudden breaks in the tone', warn: quality.pitch_jumps >= 3 || quality.voice_breaks_per_s > 0.6 },
    { label: 'Sob-like bursts', value: `${f(quality.sob_bursts_per_s, 1)}/s`, hint: 'Short gasping bursts', warn: quality.sob_bursts_per_s > 1.3 },
  ];

  return (
    <Card className={`p-4 sm:p-5 space-y-4 ${strain.possible_crying ? 'border-rose-300 dark:border-rose-900' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2"><Waves className="w-4 h-4 text-brand-blue" /> Vocal tone & stress model</p>
        <span className={`text-sm font-extrabold ${t.text}`}>{strain.label}</span>
      </div>

      {strain.possible_crying && (
        <p className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-1.5">
          <HeartCrack className="w-4 h-4 shrink-0" /> The voice shows several signs of crying (breathy tone plus raised pitch, tremor, cracking or sobbing). A real student with this pattern should be checked on in person.
        </p>
      )}

      <div>
        <div className="flex justify-between text-[11px] text-slate-500 mb-1"><span>Vocal strain index</span><span className="font-mono font-bold">{Math.round(strain.index * 100)} / 100</span></div>
        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.max(3, strain.index * 100)}%` }} />
        </div>
      </div>

      <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
        {rows.map(r => (
          <div key={r.label} className={`p-2.5 rounded-xl border ${r.warn ? 'border-orange-300 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20' : 'border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'}`}>
            <p className="text-[10px] uppercase font-bold text-slate-400">{r.label}</p>
            <p className="font-mono font-extrabold text-slate-900 dark:text-white">{r.value}</p>
            <p className={`text-[10px] ${r.warn ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-slate-400'}`}>{r.hint}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
