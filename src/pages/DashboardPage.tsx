import React from 'react';
import { useApp } from '../context/AppContext';
import { ZoneCards } from '../components/dashboard/ZoneCards';
import { StudentTable } from '../components/dashboard/StudentTable';
import { WeeklySummaryCard } from '../components/dashboard/WeeklySummaryCard';
import { StudentDetailModal } from '../components/dashboard/StudentDetailModal';
import {
  Bell,
  CheckCheck,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  Mic,
  MessageSquareHeart,
  Download,
  Calendar,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const {
    students,
    alerts,
    markAlertRead,
    setSelectedStudent,
    setActivePage,
    unreadAlertCount
  } = useApp();

  // 4-Week aggregated zone count trends for bottom chart
  const weekly4WeekTrends = [
    { week: 'Week 1', Green: 10, Yellow: 3, Orange: 1, Red: 1 },
    { week: 'Week 2', Green: 9, Yellow: 4, Orange: 1, Red: 1 },
    { week: 'Week 3', Green: 8, Yellow: 4, Orange: 2, Red: 1 },
    { week: 'Week 4 (Current)', Green: 8, Yellow: 4, Orange: 2, Red: 1 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            School Counselor Primary Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Passive voice analysis monitoring for 15 active student attendance profiles. Green (8), Yellow (4), Orange (2), Red (1).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActivePage('simulator')}
            className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition flex items-center gap-2"
          >
            <Mic className="w-4 h-4 text-brand-blue" />
            <span>Launch Attendance Simulator</span>
          </button>
        </div>
      </div>

      {/* 1. Risk Stratification Cards */}
      <ZoneCards />

      {/* 2. Main Middle Section: Table + Right Alert Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* At-Risk Student List Table (8 cols) */}
        <div className="lg:col-span-8">
          <StudentTable />
        </div>

        {/* Right Sidebar: Recent Alerts & Quick Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Recent Alerts Feed */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-blue" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Real-Time Alert Feed
                </h3>
              </div>
              {unreadAlertCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                  {unreadAlertCount}
                </span>
              )}
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => {
                    markAlertRead(alert.id);
                    const match = students.find(s => s.id === alert.studentId);
                    if (match) setSelectedStudent(match);
                  }}
                  className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition flex items-start gap-3 ${
                    alert.severity === 'critical'
                      ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                      : alert.severity === 'high'
                      ? 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900 text-orange-900 dark:text-orange-200'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {alert.severity === 'critical' ? (
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Student {alert.studentId}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{alert.timestamp}</span>
                    </div>
                    <p className="leading-snug text-slate-700 dark:text-slate-300">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-blue" /> Counselor Shortcuts
            </h3>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => setActivePage('peer-chat')}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-left font-semibold text-slate-700 dark:text-slate-200 transition flex items-center justify-between"
              >
                <span>View Peer Mentor Ambassador Network</span>
                <MessageSquareHeart className="w-4 h-4 text-brand-blue" />
              </button>

              <button
                onClick={() => setActivePage('admin')}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-left font-semibold text-slate-700 dark:text-slate-200 transition flex items-center justify-between"
              >
                <span>Export Board Compliance Reports</span>
                <Download className="w-4 h-4 text-brand-blue" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Weekly Trend Line Chart & Weekly Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Trend Line Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                4-Week Risk Zone Count Trajectory
              </h3>
              <p className="text-xs text-slate-400">
                Tracking longitudinal student count progression across zones.
              </p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly4WeekTrends}>
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="Green" stroke="#4CAF50" strokeWidth={2.5} />
                <Line type="monotone" dataKey="Yellow" stroke="#FFC107" strokeWidth={2.5} />
                <Line type="monotone" dataKey="Orange" stroke="#FF9800" strokeWidth={2.5} />
                <Line type="monotone" dataKey="Red" stroke="#F44336" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Impact Summary Card (5 cols) */}
        <div className="lg:col-span-5">
          <WeeklySummaryCard />
        </div>
      </div>

      {/* Modal Overlay */}
      <StudentDetailModal />
    </div>
  );
};
