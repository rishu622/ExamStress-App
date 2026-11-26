import React from 'react';
import { useApp, PAGE_ROLES } from '../../context/AppContext';
import type { ActivePage } from '../../context/AppContext';
import { ROLE_LABELS } from '../../lib/format';
import {
  LayoutDashboard,
  MessageSquareHeart,
  BarChart3,
  Heart,
  UserCog,
  Shield,
  GraduationCap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  X,
  Mic,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const NAV: { id: ActivePage; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Counselor Dashboard', icon: LayoutDashboard },
  { id: 'simulator', label: 'Attendance Simulator', icon: Mic },
  { id: 'student-portal', label: 'My Wellbeing', icon: Heart },
  { id: 'peer-chat', label: 'Anonymous Peer Chat', icon: MessageSquareHeart },
  { id: 'admin', label: 'School Administration', icon: BarChart3 },
  { id: 'account', label: 'Settings & Profile', icon: UserCog },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const { activePage, setActivePage, user, logout, publicSettings } = useApp();
  if (!user) return null;

  const items = NAV.filter(item => PAGE_ROLES[item.id].includes(user.role)).map(item =>
    item.id === 'admin' && user.role === 'counselor' ? { ...item, label: 'School Admin Overview' } : item,
  );
  const initials = user.name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const wide = !collapsed || mobileOpen;

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300
          ${mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'} ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-mint flex items-center justify-center text-white shadow-md shadow-brand-blue/20 shrink-0">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            {wide && (
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 dark:text-white tracking-tight leading-none text-lg">
                  Exam<span className="text-brand-blue">Stress</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-1 truncate max-w-36">
                  {publicSettings?.school_name ?? 'Student wellbeing'}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {wide && (
          <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-blue-50/70 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700/50 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/20">
              {user.role === 'admin' ? <BarChart3 className="w-4 h-4" /> : user.role === 'counselor' ? <Shield className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{ROLE_LABELS[user.role]}</span>
              <span className="text-[10px] text-slate-400 truncate">{user.grade_class ?? user.email}</span>
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {items.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setMobileOpen(false);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/25 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={!wide ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-blue'}`} />
                {wide && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <div className={`flex items-center ${wide ? 'justify-between' : 'justify-center'} gap-2`}>
            {wide && (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                  {initials}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user.name}</span>
                  <span className="text-[10px] text-slate-400 truncate">{user.anon_id ?? ROLE_LABELS[user.role]}</span>
                </div>
              </div>
            )}
            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
