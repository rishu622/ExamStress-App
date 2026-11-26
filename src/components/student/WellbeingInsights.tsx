import React, { useMemo } from 'react';
import { Sun, Moon, Smile } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { StudentSummary } from '../../types';
import { Card } from '../common/ui';

const pct = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/** Friendly, non-clinical summaries of the student's own latest check-in and their last 7 days. */
export const WellbeingInsights: React.FC<{ summary: StudentSummary }> = ({ summary }) => {
  const latest = summary.latest;

  const days = useMemo(() => {
    const out: { day: string; score: number | null; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const same = summary.history.filter(c => {
        const t = new Date(c.created_at);
        return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate();
      });
      out.push({
        day: d.toLocaleDateString([], { weekday: 'short' }),
        score: same.length ? Math.round(same.reduce((a, c) => a + c.score, 0) / same.length) : null,
        count: same.length,
      });
    }
    return out;
  }, [summary.history]);

  if (!latest) return null;

  // Energy: how the student rated their mood, nudged by how their voice compares with their own usual voice.
  const voiceFactor = latest.voice?.deviation != null ? 1 - latest.voice.deviation * 0.3 : 1;
  const energy = pct(((latest.mood - 1) / 4) * 100 * voiceFactor * 0.85 + 15);
  const energyLabel = energy >= 75 ? 'Optimal' : energy >= 50 ? 'Steady' : 'Running low';
  const sleepLabel = latest.sleep >= 4 ? 'Steady Rhythm' : latest.sleep === 3 ? 'Uneven' : 'Needs Rest';
  const positivity = (latest.mood + (6 - latest.stress)) / 2;
  const positivityLabel = positivity >= 4.5 ? 'Very High' : positivity >= 3.5 ? 'High' : positivity >= 2.5 ? 'Mixed' : 'Low';
  const daysWithData = days.filter(d => d.score !== null).length;
  const scores = days.filter(d => d.score !== null).map(d => d.score as number);
  const spread = scores.length > 1 ? Math.max(...scores) - Math.min(...scores) : 0;

  const cards = [
    {
      icon: Sun, tone: 'text-amber-500', title: 'Morning energy',
      value: `${energy}% ${energyLabel}`,
      text: latest.voice ? 'From your mood rating and how your voice compared with your usual voice.' : 'From your mood rating. Add a voice note to include vocal energy.',
    },
    {
      icon: Moon, tone: 'text-indigo-400', title: 'Rest & sleep balance',
      value: sleepLabel,
      text: latest.sleep >= 4 ? 'You reported sleeping well. Keep a regular bedtime.' : 'Try stopping revision 30 minutes before bed tonight.',
    },
    {
      icon: Smile, tone: 'text-emerald-500', title: 'Positivity indicator',
      value: positivityLabel,
      text: latest.stress >= 4 ? 'Stress is high right now. Short breaks really help.' : 'Your mood and stress balance look manageable.',
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(({ icon: Icon, tone, title, value, text }) => (
          <Card key={title} className="p-5">
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-2"><Icon className={`w-4 h-4 ${tone}`} /> {title}</p>
            <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-500 mt-2">{text}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5 sm:p-6 space-y-2">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">7-day wellbeing trend</h3>
        <p className="text-xs text-slate-500">
          {daysWithData < 2
            ? 'Check in on a few different days to see your weekly pattern.'
            : spread <= 15
              ? 'Showing smooth consistency across your check-ins this week.'
              : 'Your week has had some ups and downs. That is normal around exams.'}
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: 12, border: 'none', color: '#fff', fontSize: 12 }} formatter={v => [v, 'Wellbeing']} />
              <Line type="monotone" dataKey="score" stroke="#2dd4bf" strokeWidth={3} dot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
};
