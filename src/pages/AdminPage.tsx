import React, { useState } from 'react';
import { BarChart3, Users, Settings, ScrollText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/common/ui';
import { OverviewTab } from '../components/admin/OverviewTab';
import { UsersTab } from '../components/admin/UsersTab';
import { SettingsTab } from '../components/admin/SettingsTab';
import { AuditTab } from '../components/admin/AuditTab';

type Tab = 'overview' | 'users' | 'settings' | 'audit';

const TABS: { id: Tab; label: string; icon: React.ElementType; adminOnly: boolean }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3, adminOnly: false },
  { id: 'users', label: 'Users', icon: Users, adminOnly: true },
  { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
  { id: 'audit', label: 'Audit log', icon: ScrollText, adminOnly: true },
];

export const AdminPage: React.FC = () => {
  const { user, publicSettings } = useApp();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<Tab>('overview');
  const tabs = TABS.filter(t => isAdmin || !t.adminOnly);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Card className="p-5 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isAdmin ? 'School administration' : 'School overview'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {publicSettings?.school_name}: {isAdmin ? 'school-wide statistics, accounts, settings and audit trail.' : 'school-wide wellbeing statistics.'}
          </p>
        </div>
        {tabs.length > 1 && (
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto" role="tablist">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`flex-1 min-w-fit inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl transition ${
                  tab === id ? 'bg-white dark:bg-slate-700 text-brand-blue shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        )}
      </Card>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'users' && isAdmin && <UsersTab />}
      {tab === 'settings' && isAdmin && <SettingsTab />}
      {tab === 'audit' && isAdmin && <AuditTab />}
    </div>
  );
};
