import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  Bell,
  Search,
  Moon,
  Sun,
  Shield,
  CheckCheck,
  Calendar,
  Sparkles,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';

export const Topbar: React.FC = () => {
  const {
    userRole,
    setUserRole,
    darkMode,
    toggleDarkMode,
    searchQuery,
    setSearchQuery,
    alerts,
    unreadAlertCount,
    markAlertRead,
    markAllAlertsRead,
    setSelectedStudent,
    students
  } = useApp();

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Search & School Info */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student ID, name, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue dark:text-white transition"
          />
        </div>
      </div>

      {/* Right: Date, Notifications, Theme, Quick Role Switcher */}
      <div className="flex items-center gap-3">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
          <Calendar className="w-3.5 h-3.5 text-brand-blue" />
          <span>{formattedDate}</span>
        </div>

        {/* Quick Role Switcher (For easy hackathon evaluation) */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 hidden lg:inline">Role:</span>
          {(['counselor', 'admin', 'peer-mentor', 'student'] as UserRole[]).map((role) => (
            <button
              key={role}
              onClick={() => setUserRole(role)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all capitalize ${
                userRole === role
                  ? 'bg-white dark:bg-slate-700 text-brand-blue shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {role === 'peer-mentor' ? 'Peer' : role}
            </button>
          ))}
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            title="Alert Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadAlertCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadAlertCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Alert Notifications</h4>
                  {unreadAlertCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 rounded-full">
                      {unreadAlertCount} New
                    </span>
                  )}
                </div>
                {unreadAlertCount > 0 && (
                  <button
                    onClick={markAllAlertsRead}
                    className="text-xs text-brand-blue hover:underline flex items-center gap-1 font-medium"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No recent alerts</p>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        markAlertRead(alert.id);
                        const match = students.find((s) => s.id === alert.studentId);
                        if (match) setSelectedStudent(match);
                        setNotificationsOpen(false);
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start gap-2.5 ${
                        alert.severity === 'critical'
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                          : alert.severity === 'high'
                          ? 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900 text-orange-900 dark:text-orange-200'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300'
                      } ${!alert.read ? 'ring-2 ring-brand-blue/30' : 'opacity-80'}`}
                    >
                      {alert.severity === 'critical' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span>{alert.studentId}</span>
                          <span className="text-[10px] text-slate-400">{alert.timestamp}</span>
                        </div>
                        <p className="leading-snug">{alert.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};
