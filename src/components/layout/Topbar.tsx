import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS, timeAgo } from '../../lib/format';
import { errorMessage } from '../../lib/api';
import { Bell, Search, Moon, Sun, CheckCheck, AlertTriangle, ShieldAlert, Menu, CalendarDays } from 'lucide-react';

export const Topbar: React.FC<{ onMenu: () => void }> = ({ onMenu }) => {
  const {
    user,
    darkMode,
    toggleDarkMode,
    searchQuery,
    setSearchQuery,
    alerts,
    unreadAlertCount,
    markAlertRead,
    markAllAlertsRead,
    setSelectedStudentId,
    setActivePage,
    activePage,
    notify,
  } = useApp();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const isStaff = user?.role === 'counselor' || user?.role === 'admin';
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setToday(new Date()), 60000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const openAlert = async (alertId: string, studentId: string | null) => {
    try {
      await markAlertRead(alertId);
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
    if (studentId) {
      setActivePage('dashboard');
      setSelectedStudentId(studentId);
    }
    setOpen(false);
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-2 flex-1 min-w-0 max-w-md">
        <button onClick={onMenu} className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        {isStaff && (
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search student ID or class…"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (activePage !== 'dashboard' && e.target.value.trim()) setActivePage('dashboard');
              }}
              aria-label="Search students"
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue dark:text-white transition"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <CalendarDays className="w-4 h-4 text-brand-blue" />
          {today.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        {user && (
          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs" title="Your role is set by your account">
            <span className="font-bold text-slate-400 uppercase text-[10px]">Role</span>
            <span className="font-bold text-brand-blue">{ROLE_LABELS[user.role]}</span>
          </span>
        )}
        {isStaff && (
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setOpen(!open)}
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              aria-label={`Alerts (${unreadAlertCount} unread)`}
            >
              <Bell className="w-5 h-5" />
              {unreadAlertCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
                </span>
              )}
            </button>

            {open && (
              <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Open alerts</h4>
                  {unreadAlertCount > 0 && (
                    <button
                      onClick={() => markAllAlertsRead().catch(err => notify(errorMessage(err), 'error'))}
                      className="text-xs text-brand-blue hover:underline flex items-center gap-1 font-medium"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {alerts.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No open alerts</p>
                  ) : (
                    alerts.slice(0, 30).map(alert => (
                      <button
                        key={alert.id}
                        onClick={() => openAlert(alert.id, alert.student_id)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-start gap-2.5 ${
                          alert.severity === 'critical'
                            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                            : 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900 text-orange-900 dark:text-orange-200'
                        } ${!alert.is_read ? 'ring-2 ring-brand-blue/30' : 'opacity-80'}`}
                      >
                        {alert.severity === 'critical' ? (
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between font-semibold">
                            <span>{alert.student_anon_id ?? 'School-wide'}</span>
                            <span className="text-[10px] text-slate-400">{timeAgo(alert.created_at)}</span>
                          </div>
                          <p className="leading-snug">{alert.message}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={toggleDarkMode}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};
