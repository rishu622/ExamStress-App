import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  Shield,
  Download,
  Sliders,
  Bell,
  Lock,
  CheckCircle2,
  Users,
  AlertTriangle,
  HeartHandshake,
  TrendingUp,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend
} from 'recharts';

export const AdminPage: React.FC = () => {
  const { students, settings, updateSettings } = useApp();

  const [exportSuccess, setExportSuccess] = useState(false);

  // Compute school-wide zone distribution
  const zoneCounts = [
    { name: 'Green Zone (Healthy)', value: 1240, color: '#4CAF50' },
    { name: 'Yellow Zone (Mild)', value: 180, color: '#FFC107' },
    { name: 'Orange Zone (At-Risk)', value: 65, color: '#FF9800' },
    { name: 'Red Zone (Crisis)', value: 15, color: '#F44336' },
  ];

  // Weekly shift trends (4 weeks stacked bar chart data)
  const weeklyTrends = [
    { week: 'Week 1', Green: 1280, Yellow: 150, Orange: 55, Red: 15 },
    { week: 'Week 2', Green: 1260, Yellow: 165, Orange: 60, Red: 15 },
    { week: 'Week 3', Green: 1250, Yellow: 172, Orange: 63, Red: 15 },
    { week: 'Week 4 (Current)', Green: 1240, Yellow: 180, Orange: 65, Red: 15 },
  ];

  const handleExportPDF = () => {
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              School Administrator & Principal Overview
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded-full font-mono">
              CBSE Compliance Ready
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            School-wide mental health metrics, threshold controls, integration configuration, and official board report exporter.
          </p>
        </div>

        <button
          onClick={handleExportPDF}
          className="px-4 py-2.5 text-xs font-bold text-white bg-brand-blue hover:bg-blue-600 rounded-2xl shadow-lg shadow-brand-blue/25 transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Export School Board PDF Report</span>
        </button>
      </div>

      {exportSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Official Board Summary Report generated successfully as `ExamStress_Monthly_Report_Sep2026.pdf`.</span>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Monitored Students</span>
            <Users className="w-4 h-4 text-brand-blue" />
          </div>
          <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white block mt-2">
            1,500
          </span>
          <span className="text-[11px] text-emerald-600 font-medium">100% Morning Call Coverage</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Active Zone Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white block mt-2">
            5 Alerts
          </span>
          <span className="text-[11px] text-slate-400">1 Critical Red • 4 Orange</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Counselor Interventions</span>
            <HeartHandshake className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white block mt-2">
            18 This Week
          </span>
          <span className="text-[11px] text-emerald-600 font-medium">+14% Resolution Rate</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Counselor Capacity</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white block mt-2">
            92% Utilized
          </span>
          <span className="text-[11px] text-slate-400">Optimal Staff Allocation</span>
        </div>
      </div>

      {/* Middle Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart: Zone Distribution (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            School-Wide Risk Zone Distribution
          </h3>
          <p className="text-xs text-slate-400">
            Categorized across 1,500 total students based on passive attendance voice check-ins.
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={zoneCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {zoneCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
            {zoneCounts.map((zone) => (
              <div key={zone.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                <span className="text-slate-600 dark:text-slate-300 truncate">{zone.name}: <strong>{zone.value}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Stacked Bar Chart: Weekly Shifts (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            4-Week Zone Shift Trends
          </h3>
          <p className="text-xs text-slate-400">
            Tracking longitudinal shifts in risk zones following mid-term exam schedule.
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrends}>
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Green" stackId="a" fill="#4CAF50" />
                <Bar dataKey="Yellow" stackId="a" fill="#FFC107" />
                <Bar dataKey="Orange" stackId="a" fill="#FF9800" />
                <Bar dataKey="Red" stackId="a" fill="#F44336" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Deployment & Settings Controls Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <Sliders className="w-5 h-5 text-brand-blue" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Deployment & Privacy Settings Configuration
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Integration & Thresholds */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                Attendance Integration Method
              </label>
              <select
                value={settings.attendanceIntegration}
                onChange={(e) => updateSettings({ attendanceIntegration: e.target.value as any })}
                className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold dark:text-white"
              >
                <option value="api">Automated VoIP School Telephony API (SIP/WebRTC)</option>
                <option value="phone">IVR Phone Inbound Attendance</option>
                <option value="manual">Manual Classroom Teacher Audio Batch Upload</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                Zone Score Boundaries
              </label>
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Green Zone Minimum Score</span>
                    <span className="font-mono text-emerald-600">{settings.thresholdGreenMin}</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={80}
                    value={settings.thresholdGreenMin}
                    onChange={(e) => updateSettings({ thresholdGreenMin: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Yellow Zone Minimum Score</span>
                    <span className="font-mono text-amber-600">{settings.thresholdYellowMin}</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={60}
                    value={settings.thresholdYellowMin}
                    onChange={(e) => updateSettings({ thresholdYellowMin: Number(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Notifications */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                Privacy & Data Retention (DPDP Act 2023)
              </label>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Raw Audio Retention Period</span>
                  <span className="font-mono font-bold text-brand-blue">{settings.dataRetentionDays} Days</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.autoDeleteEnabled}
                    onChange={(e) => updateSettings({ autoDeleteEnabled: e.target.checked })}
                    className="rounded text-brand-blue focus:ring-brand-blue"
                  />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    Auto-delete raw voice clips after feature extraction
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                Alert Notification Channels
              </label>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.smsNotifications}
                    onChange={(e) => updateSettings({ smsNotifications: e.target.checked })}
                    className="rounded text-brand-blue"
                  />
                  <span>SMS Alerts</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => updateSettings({ emailNotifications: e.target.checked })}
                    className="rounded text-brand-blue"
                  />
                  <span>Email Alerts</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
