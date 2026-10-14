import React from 'react';
import { useApp } from '../../context/AppContext';
import { ActivePage } from '../../context/AppContext';
import {
  LayoutDashboard,
  Mic,
  MessageSquareHeart,
  BarChart3,
  Heart,
  Settings,
  Shield,
  GraduationCap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { activePage, setActivePage, userRole, logout } = useApp();

  const navItems: { id: ActivePage; label: string; icon: React.ElementType; roles: string[] }[] = [
    {
      id: 'dashboard',
      label: 'Counselor Dashboard',
      icon: LayoutDashboard,
      roles: ['counselor', 'admin'],
    },
    {
      id: 'simulator',
      label: 'Attendance Simulator',
      icon: Mic,
      roles: ['counselor', 'admin', 'peer-mentor', 'student'],
    },
    {
      id: 'peer-chat',
      label: 'Anonymous Peer Chat',
      icon: MessageSquareHeart,
      roles: ['counselor', 'admin', 'peer-mentor', 'student'],
    },
    {
      id: 'admin',
      label: 'School Admin Overview',
      icon: BarChart3,
      roles: ['admin', 'counselor'],
    },
    {
      id: 'student-portal',
      label: 'My Wellbeing',
      icon: Heart,
      roles: ['student', 'peer-mentor', 'counselor', 'admin'],
    },
    {
      id: 'settings',
      label: 'Deployment & Settings',
      icon: Settings,
      roles: ['counselor', 'admin'],
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-mint flex items-center justify-center text-white font-bold shadow-md shadow-brand-blue/20 shrink-0">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight leading-none text-lg">
                Exam<span className="text-brand-blue">Stress</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-1">
                Hear the Unheard
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Role Badge Banner */}
      {!collapsed && (
        <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-blue-50/70 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700/50 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/20">
            {userRole === 'counselor' ? (
              <Shield className="w-4 h-4" />
            ) : userRole === 'admin' ? (
              <BarChart3 className="w-4 h-4" />
            ) : (
              <GraduationCap className="w-4 h-4" />
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">
              {userRole.replace('-', ' ')}
            </span>
            <span className="text-[10px] text-slate-400 truncate">Delhi Public School</span>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems
          .filter(item => item.roles.includes(userRole))
          .map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/25 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-blue'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                SR
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  Dr. Sunita Rao
                </span>
                <span className="text-[10px] text-slate-400 truncate">Lead Counselor</span>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
