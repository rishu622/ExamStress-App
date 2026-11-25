import React, { useState } from 'react';
import { AppProvider, PAGE_ROLES, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { Footer } from './components/layout/Footer';
import { Spinner, Toasts } from './components/common/ui';
import { LoginPage, ChangePasswordPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PeerChatPage } from './pages/PeerChatPage';
import { AdminPage } from './pages/AdminPage';
import { StudentPortalPage } from './pages/StudentPortalPage';
import { AccountPage } from './pages/AccountPage';
import { GuestPage } from './pages/GuestPage';

const MainLayout: React.FC = () => {
  const { user, authLoading, activePage, isGuest } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC] dark:bg-slate-950">
        <Spinner label="Loading…" />
      </div>
    );
  }
  if (!user) return isGuest ? <GuestPage /> : <LoginPage />;
  if (user.must_change_password) return <ChangePasswordPage forced />;

  const page = (() => {
    // Until the redirect effect runs, never mount a page this role may not use.
    if (!PAGE_ROLES[activePage].includes(user.role)) return null;
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'peer-chat':
        return <PeerChatPage />;
      case 'admin':
        return <AdminPage />;
      case 'student-portal':
        return <StudentPortalPage />;
      case 'account':
        return <AccountPage />;
      default:
        return null;
    }
  })();

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">{page}</main>
        <Footer />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
      <Toasts />
    </AppProvider>
  );
}
