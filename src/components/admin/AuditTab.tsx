import React, { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { downloadFile, formatDateTime, toCsv } from '../../lib/format';
import type { AuditEntry } from '../../types';
import { Card, EmptyState, ErrorBox, Spinner, inputClass, secondaryButton } from '../common/ui';

const ACTIONS: Record<string, string> = {
  login: 'Signed in',
  password_changed: 'Changed password',
  password_reset: 'Password reset',
  user_created: 'Created account',
  users_imported: 'Imported accounts',
  user_updated: 'Updated account',
  user_deleted: 'Deleted account',
  identity_revealed: 'Revealed student identity',
  student_escalated: 'Escalated student',
  escalation_resolved: 'Resolved escalation',
  alert_resolved: 'Resolved alert',
  settings_updated: 'Changed settings',
  retention_run: 'Ran data clean-up',
  consent_given: 'Student opted in',
  consent_withdrawn: 'Student opted out',
  crisis_button: 'Student pressed help button',
};

export const AuditTab: React.FC = () => {
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');

  const load = useCallback(() => {
    setRows(null);
    api.get<AuditEntry[]>(`/api/audit?limit=500${action ? `&action=${encodeURIComponent(action)}` : ''}`)
      .then(r => { setRows(r); setError(''); })
      .catch(err => setError(errorMessage(err)));
  }, [action]);
  useEffect(load, [load]);

  const exportCsv = () =>
    rows && downloadFile('audit-log.csv', toCsv(rows.map(r => ({ time: r.created_at, actor: r.actor_name, role: r.actor_role, action: r.action, target: r.target, details: r.details }))), 'text/csv');

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <select value={action} onChange={e => setAction(e.target.value)} className={`${inputClass} sm:w-72`} aria-label="Filter by action">
          <option value="">All actions</option>
          {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={exportCsv} disabled={!rows?.length} className={secondaryButton}><Download className="w-4 h-4" /> Export CSV</button>
      </Card>
      {error && <ErrorBox message={error} onRetry={load} />}
      <Card className="overflow-hidden">
        {!rows ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState title="No entries" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-slate-400 bg-slate-50/60 dark:bg-slate-800/40">
                <tr><th className="text-left p-3">When</th><th className="text-left p-3">Who</th><th className="text-left p-3">Action</th><th className="text-left p-3">Target</th><th className="text-left p-3 hidden md:table-cell">Details</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {rows.map(r => (
                  <tr key={r.id} className={r.action === 'identity_revealed' ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                    <td className="p-3 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                    <td className="p-3">{r.actor_name}</td>
                    <td className="p-3 font-semibold">{ACTIONS[r.action] ?? r.action}</td>
                    <td className="p-3 font-mono">{r.target ?? '—'}</td>
                    <td className="p-3 hidden md:table-cell max-w-md truncate" title={r.details ?? ''}>{r.details ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
