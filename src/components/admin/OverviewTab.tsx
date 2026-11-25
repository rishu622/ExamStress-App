import React, { useCallback, useEffect, useState } from 'react';
import { Users, AlertTriangle, HeartHandshake, CalendarCheck, Download, FileText, Loader2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';
import { useApp } from '../../context/AppContext';
import { api, errorMessage } from '../../lib/api';
import { ZONE_COLORS, ZONE_LABELS, downloadFile, formatDateTime, toCsv } from '../../lib/format';
import type { OverviewStats, RiskZone } from '../../types';
import { Card, EmptyState, ErrorBox, Spinner, secondaryButton, primaryButton } from '../common/ui';

const ZONES: RiskZone[] = ['green', 'yellow', 'orange', 'red'];
const tooltipStyle = { backgroundColor: '#1e293b', borderRadius: 12, border: 'none', color: '#fff', fontSize: 12 };

async function exportPdf(stats: OverviewStats, schoolName: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const left = 48;
  let y = 56;
  const line = (text: string, size = 11, bold = false, gap = 18) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(text, left, y);
    y += gap;
  };

  line(`${schoolName}: student wellbeing summary`, 18, true, 24);
  line(`Generated ${formatDateTime(stats.generated_at)}. Aggregate figures only; no student is identified.`, 9, false, 26);

  line('Participation', 13, true);
  line(`Students with accounts: ${stats.total_students}   Opted in: ${stats.consented_students}   Checked in this week: ${stats.active_this_week}`);
  line(`Check-ins this week: ${stats.checkins_this_week}   Counselor contacts/escalations this week: ${stats.interventions_this_week}`, 11, false, 26);

  line('Current wellbeing zones (latest check-in per student)', 13, true, 20);
  const total = Math.max(1, stats.students_with_data);
  const colors: Record<RiskZone, [number, number, number]> = { green: [46, 125, 50], yellow: [245, 127, 23], orange: [230, 81, 0], red: [198, 40, 40] };
  ZONES.forEach(z => {
    const count = stats.distribution[z];
    doc.setFillColor(...colors[z]);
    doc.rect(left + 170, y - 9, Math.max(2, (count / total) * 300), 11, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`${ZONE_LABELS[z]}`, left, y);
    doc.text(`${count} (${Math.round((count / total) * 100)}%)`, left + 480, y, { align: 'right' });
    y += 18;
  });
  y += 4;
  line(`Students currently escalated by a counselor: ${stats.escalated}`, 11, false, 26);

  line('Last 4 weeks', 13, true);
  line('Week                Checked in   Green   Yellow   Orange   Red', 10, true, 16);
  stats.weekly.forEach(w => {
    line(`${w.label.padEnd(20)}${String(w.checked_in).padEnd(13)}${String(w.green).padEnd(8)}${String(w.yellow).padEnd(9)}${String(w.orange).padEnd(9)}${w.red}`, 10, false, 15);
  });
  y += 10;
  line('Open alerts', 13, true);
  line(`Total ${stats.open_alerts.total}: ${stats.open_alerts.critical} critical, ${stats.open_alerts.high} high`, 11, false, 26);

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('ExamStress scores are a screening aid built from student self-reports. They are not a clinical diagnosis.', left, 800);
  doc.save(`wellbeing-summary-${stats.generated_at.slice(0, 10)}.pdf`);
}

export const OverviewTab: React.FC = () => {
  const { publicSettings, notify, user } = useApp();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    api.get<OverviewStats>('/api/stats/overview').then(s => { setStats(s); setError(''); }).catch(err => setError(errorMessage(err)));
  }, []);
  useEffect(load, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!stats) return <Spinner label="Loading statistics…" />;

  const pieData = ZONES.map(z => ({ name: ZONE_LABELS[z], value: stats.distribution[z], color: ZONE_COLORS[z] })).filter(d => d.value > 0);
  const coverage = stats.total_students ? Math.round((stats.active_this_week / stats.total_students) * 100) : 0;

  const kpis = [
    { label: 'Students', value: stats.total_students, sub: `${stats.consented_students} opted in`, icon: Users, tone: 'text-brand-blue' },
    { label: 'Checked in this week', value: `${stats.active_this_week}`, sub: `${coverage}% of students · ${stats.checkins_this_week} check-ins`, icon: CalendarCheck, tone: 'text-emerald-500' },
    { label: 'Open alerts', value: stats.open_alerts.total, sub: `${stats.open_alerts.critical} critical · ${stats.open_alerts.high} high`, icon: AlertTriangle, tone: 'text-amber-500' },
    { label: 'Counselor actions (7 days)', value: stats.interventions_this_week, sub: `${stats.escalated} currently escalated`, icon: HeartHandshake, tone: 'text-purple-500' },
  ];

  const handlePdf = async () => {
    setExporting(true);
    try {
      await exportPdf(stats, publicSettings?.school_name ?? 'School');
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleCsv = () => {
    const rows = stats.weekly.map(w => ({ week_starting: w.week_start.slice(0, 10), checked_in: w.checked_in, green: w.green, yellow: w.yellow, orange: w.orange, red: w.red }));
    downloadFile(`weekly-zones-${stats.generated_at.slice(0, 10)}.csv`, toCsv(rows), 'text/csv');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-end">
        <button onClick={handleCsv} className={secondaryButton}><Download className="w-4 h-4" /> Weekly CSV</button>
        <button onClick={handlePdf} disabled={exporting} className={primaryButton}>
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Summary PDF
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, tone }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>{label}</span>
              <Icon className={`w-4 h-4 ${tone}`} />
            </div>
            <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white block mt-2">{value}</span>
            <span className="text-[11px] text-slate-500">{sub}</span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5 p-5 sm:p-6 space-y-3">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Current zone distribution</h3>
          <p className="text-xs text-slate-400">{stats.students_with_data} of {stats.total_students} students have at least one check-in.</p>
          {pieData.length === 0 ? (
            <EmptyState title="No check-ins yet" />
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {pieData.map(d => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {ZONES.map(z => (
                  <div key={z} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ZONE_COLORS[z] }} />
                    <span className="text-slate-600 dark:text-slate-300 truncate">{ZONE_LABELS[z]}: <strong>{stats.distribution[z]}</strong></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="lg:col-span-7 p-5 sm:p-6 space-y-3">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Weekly zones</h3>
          <p className="text-xs text-slate-400">Latest check-in per student within each week.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {ZONES.map(z => <Bar key={z} dataKey={z} name={z[0].toUpperCase() + z.slice(1)} stackId="a" fill={ZONE_COLORS[z]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6 space-y-3">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">Daily check-ins (last 14 days)</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.daily_checkins.map(d => ({ ...d, day: new Date(d.date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Check-ins" fill="#4A90E2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {user?.role === 'admin' && (
          <p className="text-xs text-slate-500">
            Staff: {stats.staff.counselor} counselor(s), {stats.staff['peer-mentor']} peer mentor(s), {stats.staff.admin} administrator(s).
          </p>
        )}
      </Card>
    </div>
  );
};
