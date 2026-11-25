import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, ShieldAlert, AlertTriangle, TrendingUp, TrendingDown, Minus, Eye, CheckCircle2, Users, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import { ZONE_COLORS, timeAgo } from '../lib/format';
import type { OverviewStats, RiskZone, StudentRow } from '../types';
import { Card, EmptyState, ErrorBox, Spinner } from '../components/common/ui';
import { RiskBadge } from '../components/common/RiskBadge';
import { StudentDetailModal } from '../components/dashboard/StudentDetailModal';

type Filter = 'attention' | 'all' | 'no-data' | RiskZone;

const ZONE_META: { zone: RiskZone; title: string; icon: React.ElementType; tone: string }[] = [
  { zone: 'green', title: 'Doing well', icon: ShieldCheck, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
  { zone: 'yellow', title: 'Mild strain', icon: AlertTriangle, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
  { zone: 'orange', title: 'Needs check-in', icon: AlertCircle, tone: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40' },
  { zone: 'red', title: 'Priority', icon: ShieldAlert, tone: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
];

const Sparkline: React.FC<{ values: number[]; zone: RiskZone | null }> = ({ values, zone }) => {
  if (values.length < 2) return <span className="text-[11px] text-slate-400">—</span>;
  const w = 90;
  const h = 28;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / 100) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} aria-hidden>
      <polyline points={points} fill="none" stroke={zone ? ZONE_COLORS[zone] : '#94a3b8'} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

export const DashboardPage: React.FC = () => {
  const { alerts, unreadAlertCount, setSelectedStudentId, selectedStudentId, searchQuery, resolveAlert, markAlertRead, notify, dataVersion, refreshAlerts } = useApp();
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('attention');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [s, o] = await Promise.all([api.get<StudentRow[]>('/api/students'), api.get<OverviewStats>('/api/stats/overview')]);
      setStudents(s);
      setStats(o);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 60000);
    return () => window.clearInterval(interval);
  }, [load, dataVersion]);

  // Refresh the table when new alerts arrive (e.g. a student just checked in).
  const newestAlert = alerts[0]?.id;
  useEffect(() => {
    if (newestAlert) load();
  }, [newestAlert, load]);

  const counts = useMemo(() => {
    const c = { green: 0, yellow: 0, orange: 0, red: 0, none: 0 };
    students?.forEach(s => (s.zone ? c[s.zone]++ : c.none++));
    return c;
  }, [students]);

  const visible = useMemo(() => {
    if (!students) return [];
    const q = searchQuery.trim().toLowerCase();
    const order = { red: 0, orange: 1, yellow: 2, green: 3 } as const;
    return students
      .filter(s => !q || s.anon_id.toLowerCase().includes(q) || (s.grade_class ?? '').toLowerCase().includes(q))
      .filter(s => {
        if (filter === 'all') return true;
        if (filter === 'no-data') return !s.zone;
        if (filter === 'attention') return s.zone === 'red' || s.zone === 'orange' || s.open_alerts > 0;
        return s.zone === filter;
      })
      .sort((a, b) => (a.zone ? order[a.zone] : 4) - (b.zone ? order[b.zone] : 4) || (a.score ?? 101) - (b.score ?? 101));
  }, [students, filter, searchQuery]);

  const openStudent = (id: string) => setSelectedStudentId(id);

  const filterButtons: { id: Filter; label: string }[] = [
    { id: 'attention', label: `Needs attention (${students?.filter(s => s.zone === 'red' || s.zone === 'orange' || s.open_alerts > 0).length ?? 0})` },
    { id: 'all', label: `All (${students?.length ?? 0})` },
    { id: 'red', label: 'Red' },
    { id: 'orange', label: 'Orange' },
    { id: 'yellow', label: 'Yellow' },
    { id: 'green', label: 'Green' },
    { id: 'no-data', label: `No check-ins (${counts.none})` },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Card className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Counselor dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {stats
              ? `${stats.total_students} student${stats.total_students === 1 ? '' : 's'} ·${stats.active_this_week} checked in this week · ${stats.consented_students} opted in`
              : 'Loading school data…'}
          </p>
        </div>
        <button onClick={() => { load(); refreshAlerts(); }} disabled={refreshing} className="self-start md:self-auto inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 disabled:opacity-60">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </Card>

      {error && <ErrorBox message={error} onRetry={load} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {ZONE_META.map(({ zone, title, icon: Icon, tone }) => (
          <button
            key={zone}
            onClick={() => setFilter(filter === zone ? 'attention' : zone)}
            className={`text-left p-4 sm:p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-xs transition hover:shadow-md ${
              filter === zone ? 'border-brand-blue ring-2 ring-brand-blue/30' : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`p-2 rounded-xl ${tone}`}><Icon className="w-4 h-4" /></span>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono" style={{ color: ZONE_COLORS[zone] }}>
                {students ? counts[zone] : '–'}
              </span>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100 capitalize">{zone} zone</p>
            <p className="text-xs text-slate-500">{title}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-blue" /> Students
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {filterButtons.map(b => (
                <button
                  key={b.id}
                  onClick={() => setFilter(b.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                    filter === b.id ? 'bg-brand-blue text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {!students ? (
            <Spinner label="Loading students…" />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={students.length === 0 ? 'No students yet' : filter === 'attention' ? 'Nobody needs attention right now' : 'No students match'}
              text={students.length === 0 ? 'An administrator can add student accounts under School Administration → Users.' : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase text-slate-400 bg-slate-50/60 dark:bg-slate-800/40">
                  <tr>
                    <th className="text-left font-bold px-4 py-2.5">Student</th>
                    <th className="text-left font-bold px-4 py-2.5">Zone</th>
                    <th className="text-left font-bold px-4 py-2.5 hidden sm:table-cell">Trend</th>
                    <th className="text-left font-bold px-4 py-2.5 hidden md:table-cell">Last check-in</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visible.map(s => (
                    <tr key={s.id} onClick={() => openStudent(s.id)} className="cursor-pointer hover:bg-blue-50/40 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {s.anon_id}
                          {s.open_alerts > 0 && <span className="w-2 h-2 rounded-full bg-rose-500" title={`${s.open_alerts} open alert(s)`} />}
                        </div>
                        <div className="text-xs text-slate-500">{s.grade_class ?? 'No class'}{!s.consent_given && ' · not opted in'}</div>
                      </td>
                      <td className="px-4 py-3">
                        {s.zone ? <RiskBadge zone={s.zone} score={s.score ?? undefined} size="sm" /> : <span className="text-xs text-slate-400">No data</span>}
                        {s.escalated && <div className="text-[10px] font-bold text-rose-600 mt-1">ESCALATED</div>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <Sparkline values={s.sparkline} zone={s.zone} />
                          {s.trend === 'up' ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : s.trend === 'down' ? <TrendingDown className="w-4 h-4 text-rose-500" /> : <Minus className="w-4 h-4 text-slate-400" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                        {timeAgo(s.last_checkin_at)}
                        {s.last_contacted_at && <div className="text-emerald-600">Contacted {timeAgo(s.last_contacted_at)}</div>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue">
                          <Eye className="w-4 h-4" /> <span className="hidden sm:inline">Open</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-4 p-4 sm:p-5 space-y-3 self-start">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-blue" /> Open alerts
            </h2>
            {unreadAlertCount > 0 && <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">{unreadAlertCount} new</span>}
          </div>
          <div className="space-y-2.5 max-h-[32rem] overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No open alerts" />
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-2xl border text-xs space-y-2 ${
                    alert.severity === 'critical'
                      ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                      : 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900'
                  } ${!alert.is_read ? 'ring-2 ring-brand-blue/30' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {alert.severity === 'critical' ? <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-100">
                        <span className="font-mono">{alert.student_anon_id ?? '—'}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{timeAgo(alert.created_at)}</span>
                      </div>
                      <p className="leading-snug text-slate-700 dark:text-slate-300 mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    {alert.student_id && (
                      <button
                        onClick={() => { markAlertRead(alert.id).catch(() => undefined); openStudent(alert.student_id!); }}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 font-semibold text-brand-blue border border-slate-200 dark:border-slate-700"
                      >
                        View student
                      </button>
                    )}
                    <button
                      onClick={() => resolveAlert(alert.id).then(() => notify('Alert resolved.')).catch(err => notify(errorMessage(err), 'error'))}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 font-semibold text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6 space-y-3">
        <div>
          <h2 className="font-bold text-base text-slate-900 dark:text-white">4-week zone trend</h2>
          <p className="text-xs text-slate-400">Students in each zone, based on their latest check-in within each week.</p>
        </div>
        {!stats ? (
          <Spinner />
        ) : stats.weekly.every(w => w.checked_in === 0) ? (
          <EmptyState title="No check-ins in the last 4 weeks yet" />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: 12, border: 'none', color: '#fff', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {(['green', 'yellow', 'orange', 'red'] as RiskZone[]).map(z => (
                  <Line key={z} type="monotone" dataKey={z} name={z[0].toUpperCase() + z.slice(1)} stroke={ZONE_COLORS[z]} strokeWidth={2.5} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {selectedStudentId && <StudentDetailModal studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} onChanged={load} />}
    </div>
  );
};
