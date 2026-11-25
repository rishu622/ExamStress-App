import type { RiskZone } from '../types';

export const timeAgo = (iso: string | null | undefined): string => {
  if (!iso) return 'Never';
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
};

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

export const ZONE_COLORS: Record<RiskZone, string> = {
  green: '#2E7D32',
  yellow: '#F57F17',
  orange: '#E65100',
  red: '#C62828',
};

export const ZONE_LABELS: Record<RiskZone, string> = {
  green: 'Green · Doing well',
  yellow: 'Yellow · Mild strain',
  orange: 'Orange · Needs check-in',
  red: 'Red · Priority',
};

export const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  'peer-mentor': 'Peer Mentor',
  counselor: 'Counselor',
  admin: 'Administrator',
};

export const MOOD_LABELS = ['', 'Very low', 'Low', 'Okay', 'Good', 'Great'];
export const STRESS_LABELS = ['', 'None', 'A little', 'Moderate', 'High', 'Extreme'];
export const SLEEP_LABELS = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Very good'];

export const downloadFile = (filename: string, content: BlobPart, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value);
    // Prevent spreadsheet formula injection and quote fields that need it.
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [headers.join(','), ...rows.map(row => headers.map(h => escape(row[h])).join(','))].join('\n');
};
