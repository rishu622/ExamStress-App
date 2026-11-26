import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Alert, PublicSettings, User, UserRole } from '../types';
import { api, getToken, setToken, setUnauthorizedHandler } from '../lib/api';

export type ActivePage = 'dashboard' | 'simulator' | 'peer-chat' | 'admin' | 'student-portal' | 'account';

export const PAGE_ROLES: Record<ActivePage, UserRole[]> = {
  dashboard: ['counselor', 'admin'],
  simulator: ['counselor', 'admin'],
  admin: ['admin', 'counselor'],
  'peer-chat': ['student', 'peer-mentor', 'counselor'],
  'student-portal': ['student'],
  account: ['student', 'peer-mentor', 'counselor', 'admin'],
};

const HOME_PAGE: Record<UserRole, ActivePage> = {
  counselor: 'dashboard',
  admin: 'admin',
  'peer-mentor': 'peer-chat',
  student: 'student-portal',
};

type Toast = { id: number; kind: 'success' | 'error' | 'info'; text: string };

interface AppContextType {
  user: User | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  applySession: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  isGuest: boolean;
  setGuest: (guest: boolean) => void;

  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;

  darkMode: boolean;
  toggleDarkMode: () => void;

  publicSettings: PublicSettings | null;
  refreshPublicSettings: () => void;

  alerts: Alert[];
  unreadAlertCount: number;
  refreshAlerts: () => Promise<void>;
  markAlertRead: (id: string) => Promise<void>;
  markAllAlertsRead: () => Promise<void>;
  resolveAlert: (id: string) => Promise<void>;

  // Dashboard → detail modal + search shared with the top bar
  selectedStudentId: string | null;
  setSelectedStudentId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  dataVersion: number;
  bumpDataVersion: () => void;

  toasts: Toast[];
  notify: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const readHashPage = (): ActivePage | null => {
  const value = window.location.hash.replace(/^#\/?/, '');
  return (Object.keys(PAGE_ROLES) as ActivePage[]).includes(value as ActivePage) ? (value as ActivePage) : null;
};

const readDarkPreference = () => {
  try {
    const stored = localStorage.getItem('examstress.dark');
    if (stored !== null) return stored === '1';
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState<boolean>(!!getToken());
  const [activePage, setActivePageState] = useState<ActivePage>(readHashPage() ?? 'dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(readDarkPreference);
  const [publicSettings, setPublicSettings] = useState<PublicSettings | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dataVersion, setDataVersion] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const notify = useCallback((text: string, kind: Toast['kind'] = 'success') => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, kind, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), kind === 'error' ? 7000 : 4000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('examstress.dark', darkMode ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [darkMode]);

  const resetSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setAlerts([]);
    setUnreadAlertCount(0);
    setSelectedStudentId(null);
    setSearchQuery('');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      resetSession();
      notify('Your session has ended. Please sign in again.', 'info');
    });
  }, [resetSession, notify]);

  // Keep the visible page valid for the signed-in role, and mirror it in the URL hash.
  const setActivePage = useCallback((page: ActivePage) => {
    setActivePageState(page);
    if (window.location.hash !== `#/${page}`) window.location.hash = `/${page}`;
  }, []);

  useEffect(() => {
    const onHash = () => {
      const page = readHashPage();
      if (page) setActivePageState(page);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (user && !PAGE_ROLES[activePage].includes(user.role)) setActivePage(HOME_PAGE[user.role]);
  }, [user, activePage, setActivePage]);

  const refreshPublicSettings = useCallback(() => {
    api.get<PublicSettings>('/api/settings/public').then(setPublicSettings).catch(() => undefined);
  }, []);

  // Restore the session after a page refresh.
  useEffect(() => {
    if (!getToken()) return;
    api.get<User>('/api/auth/me')
      .then(setUser)
      .catch(() => resetSession())
      .finally(() => setAuthLoading(false));
  }, [resetSession]);

  useEffect(() => {
    if (user) refreshPublicSettings();
  }, [user, refreshPublicSettings]);

  const applySession = useCallback((token: string, nextUser: User) => {
    setToken(token);
    setUser(nextUser);
    setGuest(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/api/auth/login', { email, password });
    applySession(data.token, data.user);
    setActivePage(readHashPage() && PAGE_ROLES[readHashPage()!].includes(data.user.role) ? readHashPage()! : HOME_PAGE[data.user.role]);
    return data.user;
  }, [applySession, setActivePage]);

  const logout = useCallback(() => {
    resetSession();
    window.location.hash = '';
  }, [resetSession]);

  // ---------------------------------------------------------------- alerts (staff only)
  const isStaff = !!user && !user.must_change_password && (user.role === 'counselor' || user.role === 'admin');

  const refreshAlerts = useCallback(async () => {
    if (!isStaff) return;
    try {
      const data = await api.get<{ alerts: Alert[]; unread_count: number }>('/api/alerts');
      setAlerts(data.alerts);
      setUnreadAlertCount(data.unread_count);
    } catch {
      /* polling failures are silent; the next poll retries */
    }
  }, [isStaff]);

  useEffect(() => {
    if (!isStaff) return;
    refreshAlerts();
    const interval = window.setInterval(refreshAlerts, 20000);
    return () => window.clearInterval(interval);
  }, [isStaff, refreshAlerts]);

  const markAlertRead = useCallback(async (id: string) => {
    await api.post(`/api/alerts/${id}/read`);
    await refreshAlerts();
  }, [refreshAlerts]);

  const markAllAlertsRead = useCallback(async () => {
    await api.post('/api/alerts/read-all');
    await refreshAlerts();
  }, [refreshAlerts]);

  const resolveAlert = useCallback(async (id: string) => {
    await api.post(`/api/alerts/${id}/resolve`);
    await refreshAlerts();
    setDataVersion(v => v + 1);
  }, [refreshAlerts]);

  const value = useMemo<AppContextType>(() => ({
    user,
    authLoading,
    login,
    logout,
    applySession,
    updateUser: setUser,
    isGuest,
    setGuest,
    activePage,
    setActivePage,
    darkMode,
    toggleDarkMode: () => setDarkMode(prev => !prev),
    publicSettings,
    refreshPublicSettings,
    alerts,
    unreadAlertCount,
    refreshAlerts,
    markAlertRead,
    markAllAlertsRead,
    resolveAlert,
    selectedStudentId,
    setSelectedStudentId,
    searchQuery,
    setSearchQuery,
    dataVersion,
    bumpDataVersion: () => setDataVersion(v => v + 1),
    toasts,
    notify,
    dismissToast,
  }), [user, isGuest, authLoading, login, logout, applySession, activePage, setActivePage, darkMode, publicSettings,
    refreshPublicSettings, alerts, unreadAlertCount, refreshAlerts, markAlertRead, markAllAlertsRead, resolveAlert,
    selectedStudentId, searchQuery, dataVersion, toasts, notify, dismissToast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
