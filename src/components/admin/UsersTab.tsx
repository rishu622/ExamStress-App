import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlus, Upload, KeyRound, Trash2, Search, Loader2, Download, Copy, Power } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api, errorMessage } from '../../lib/api';
import { ROLE_LABELS, downloadFile, timeAgo, toCsv } from '../../lib/format';
import type { User, UserRole } from '../../types';
import { Card, EmptyState, ErrorBox, Modal, Spinner, dangerButton, inputClass, primaryButton, secondaryButton } from '../common/ui';

type Credential = { name: string; email: string; role: string; grade_class?: string | null; temporary_password: string };

const ROLES: UserRole[] = ['student', 'peer-mentor', 'counselor', 'admin'];

const CredentialsModal: React.FC<{ creds: Credential[]; errors?: { line: number; error: string }[]; onClose: () => void }> = ({ creds, errors, onClose }) => {
  const { notify } = useApp();
  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => notify('Copied.')).catch(() => undefined);
  return (
    <Modal open onClose={onClose} title={creds.length === 1 ? 'Temporary password' : `${creds.length} accounts created`} wide={creds.length > 1}>
      <div className="space-y-4 text-sm">
        <p className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-100 text-xs">
          These passwords are shown <strong>only once</strong>. Hand them out privately. Each person must choose their own password when they first sign in.
        </p>
        {errors && errors.length > 0 && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs space-y-1">
            <p className="font-bold">{errors.length} row(s) were skipped:</p>
            {errors.slice(0, 20).map(e => <p key={e.line}>Line {e.line}: {e.error}</p>)}
          </div>
        )}
        {creds.length > 0 && (
          <div className="overflow-x-auto max-h-80 border border-slate-100 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px]">
                <tr><th className="text-left p-2">Name</th><th className="text-left p-2">E-mail</th><th className="text-left p-2">Password</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {creds.map(c => (
                  <tr key={c.email}>
                    <td className="p-2">{c.name}</td>
                    <td className="p-2 break-all">{c.email}</td>
                    <td className="p-2 font-mono font-bold">
                      <button onClick={() => copy(c.temporary_password)} className="inline-flex items-center gap-1 hover:text-brand-blue">{c.temporary_password} <Copy className="w-3 h-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          {creds.length > 0 && (
            <button onClick={() => downloadFile('new-accounts.csv', toCsv(creds.map(c => ({ name: c.name, email: c.email, role: c.role, class: c.grade_class ?? '', temporary_password: c.temporary_password }))), 'text/csv')} className={secondaryButton}>
              <Download className="w-4 h-4" /> Download CSV
            </button>
          )}
          <button onClick={onClose} className={primaryButton}>Done</button>
        </div>
      </div>
    </Modal>
  );
};

export const UsersTab: React.FC = () => {
  const { user: me, notify } = useApp();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'student' as UserRole, grade_class: '' });
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState<{ creds: Credential[]; errors?: { line: number; error: string }[] } | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'student' as UserRole, grade_class: '' });

  const load = useCallback(() => {
    api.get<User[]>('/api/users').then(u => { setUsers(u); setError(''); }).catch(err => setError(errorMessage(err)));
  }, []);
  useEffect(load, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users ?? []).filter(u =>
      (roleFilter === 'all' || u.role === roleFilter) &&
      (!q || u.name.toLowerCase().includes(q) || u.email.includes(q) || (u.anon_id ?? '').toLowerCase().includes(q) || (u.grade_class ?? '').toLowerCase().includes(q)),
    );
  }, [users, query, roleFilter]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api.post<{ user: User; temporary_password: string }>('/api/users', { ...form, grade_class: form.grade_class || null });
      setCreateOpen(false);
      setForm({ name: '', email: '', role: form.role, grade_class: '' });
      setCreds({ creds: [{ name: data.user.name, email: data.user.email, role: data.user.role, grade_class: data.user.grade_class, temporary_password: data.temporary_password }] });
      load();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const importCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const data = await api.post<{ created: Credential[]; errors: { line: number; error: string }[] }>('/api/users/import', body);
      setCreds({ creds: data.created, errors: data.errors });
      load();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (u: User) => {
    if (!window.confirm(`Reset the password for ${u.name}? They will be signed out everywhere.`)) return;
    try {
      const data = await api.post<{ temporary_password: string }>(`/api/users/${u.id}/reset-password`);
      setCreds({ creds: [{ name: u.name, email: u.email, role: u.role, temporary_password: data.temporary_password }] });
      load();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const toggleActive = async (u: User) => {
    if (u.is_active && !window.confirm(`Deactivate ${u.name}? They will be signed out and unable to sign in. Their data is kept.`)) return;
    try {
      await api.patch(`/api/users/${u.id}`, { is_active: !u.is_active });
      notify(u.is_active ? 'Account deactivated.' : 'Account reactivated.');
      load();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const remove = async (u: User) => {
    const typed = window.prompt(`This PERMANENTLY deletes ${u.name} and all their check-ins, chats and notes. This cannot be undone.\n\nType DELETE to confirm.`);
    if (typed !== 'DELETE') return;
    try {
      await api.delete(`/api/users/${u.id}`);
      notify('Account and data deleted.');
      setEditing(null);
      load();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setEditForm({ name: u.name, role: u.role, grade_class: u.grade_class ?? '' });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await api.patch(`/api/users/${editing.id}`, { name: editForm.name, role: editForm.role, grade_class: editForm.grade_class });
      notify('Saved.');
      setEditing(null);
      load();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, e-mail, ID, class" className={`${inputClass} pl-9`} aria-label="Search users" />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as UserRole | 'all')} className={`${inputClass} sm:w-44`} aria-label="Filter by role">
              <option value="all">All roles</option>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}s</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <label className={`${secondaryButton} cursor-pointer ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={importCsv} />
            </label>
            <button onClick={() => setCreateOpen(true)} className={primaryButton}><UserPlus className="w-4 h-4" /> Add user</button>
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          CSV import: columns <code>name,email</code> plus optional <code>role</code> (student, peer-mentor, counselor, admin; default student) and <code>grade_class</code>.{' '}
          <button className="text-brand-blue underline" onClick={() => downloadFile('students-template.csv', 'name,email,grade_class,role\nAsha Kumar,asha.kumar@school.edu,10-A,student\n', 'text/csv')}>Download template</button>
        </p>
      </Card>

      {error && <ErrorBox message={error} onRetry={load} />}

      <Card className="overflow-hidden">
        {!users ? (
          <Spinner />
        ) : visible.length === 0 ? (
          <EmptyState title={users.length ? 'No users match' : 'No users yet'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase text-slate-400 bg-slate-50/60 dark:bg-slate-800/40">
                <tr>
                  <th className="text-left font-bold px-4 py-2.5">Name</th>
                  <th className="text-left font-bold px-4 py-2.5">Role</th>
                  <th className="text-left font-bold px-4 py-2.5 hidden md:table-cell">Class / ID</th>
                  <th className="text-left font-bold px-4 py-2.5 hidden lg:table-cell">Last sign-in</th>
                  <th className="text-right font-bold px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visible.map(u => (
                  <tr key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(u)} className="text-left hover:text-brand-blue">
                        <div className="font-semibold text-slate-900 dark:text-white">{u.name}{u.id === me?.id && ' (you)'}</div>
                        <div className="text-xs text-slate-500 break-all">{u.email}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {ROLE_LABELS[u.role]}
                      {!u.is_active && <div className="text-rose-600 font-bold">Deactivated</div>}
                      {u.is_active && u.must_change_password && <div className="text-amber-600">Awaiting first sign-in</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                      {u.grade_class ?? '—'}
                      {u.anon_id && <div className="font-mono">{u.anon_id}{u.role === 'student' && !u.consent_given && ' · not opted in'}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">{timeAgo(u.last_login_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => resetPassword(u)} className="p-2 rounded-lg text-slate-500 hover:text-brand-blue hover:bg-slate-100 dark:hover:bg-slate-800" title="Reset password" aria-label={`Reset password for ${u.name}`}><KeyRound className="w-4 h-4" /></button>
                        {u.id !== me?.id && (
                          <button onClick={() => toggleActive(u)} className="p-2 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800" title={u.is_active ? 'Deactivate' : 'Reactivate'} aria-label={`${u.is_active ? 'Deactivate' : 'Reactivate'} ${u.name}`}><Power className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add user">
        <form onSubmit={create} className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Full name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className={`${inputClass} mt-1`} /></label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">E-mail<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className={`${inputClass} mt-1`} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Role
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })} className={`${inputClass} mt-1`}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Class<input value={form.grade_class} onChange={e => setForm({ ...form, grade_class: e.target.value })} placeholder="e.g. 10-A" className={`${inputClass} mt-1`} /></label>
          </div>
          <p className="text-xs text-slate-500">A temporary password is generated and shown once.</p>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primaryButton}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Create account</button>
            <button type="button" onClick={() => setCreateOpen(false)} className={secondaryButton}>Cancel</button>
          </div>
        </form>
      </Modal>

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={`Edit ${editing.name}`}>
          <form onSubmit={saveEdit} className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Full name<input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required className={`${inputClass} mt-1`} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Role
                <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value as UserRole })} className={`${inputClass} mt-1`}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Class<input value={editForm.grade_class} onChange={e => setEditForm({ ...editForm, grade_class: e.target.value })} className={`${inputClass} mt-1`} /></label>
            </div>
            <p className="text-xs text-slate-500 break-all">E-mail: {editing.email}{editing.anon_id && ` · ID ${editing.anon_id}`}</p>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={primaryButton}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Save</button>
              <button type="button" onClick={() => setEditing(null)} className={secondaryButton}>Cancel</button>
              {editing.id !== me?.id && (
                <button type="button" onClick={() => remove(editing)} className={`${dangerButton} sm:ml-auto`}><Trash2 className="w-4 h-4" /> Delete permanently</button>
              )}
            </div>
          </form>
        </Modal>
      )}

      {creds && <CredentialsModal creds={creds.creds} errors={creds.errors} onClose={() => setCreds(null)} />}
    </div>
  );
};
