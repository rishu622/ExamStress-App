import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserRole,
  Student,
  Alert,
  RiskZone,
  VoiceSample,
  SchoolSettings,
  PeerConversation,
  PeerChatMessage
} from '../types';
import {
  MOCK_STUDENTS,
  MOCK_ALERTS,
  MOCK_VOICE_SAMPLES,
  MOCK_PEER_CONVERSATIONS,
  MOCK_PEER_MESSAGES,
  INITIAL_SCHOOL_SETTINGS
} from '../mock/mockData';

export type ActivePage = 'dashboard' | 'simulator' | 'peer-chat' | 'admin' | 'student-portal' | 'settings';

interface AppContextType {
  // Authentication & Role
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  loginAsDemo: (role?: UserRole) => void;
  logout: () => void;

  // Navigation
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;

  // Dark Mode
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;

  // Student Data & Filtering
  students: Student[];
  selectedStudent: Student | null;
  setSelectedStudent: (student: Student | null) => void;
  selectedZoneFilter: RiskZone | 'all';
  setSelectedZoneFilter: (zone: RiskZone | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Actions on Student
  revealStudentIdentity: (studentId: string) => void;
  markStudentContacted: (studentId: string, noteText: string) => void;
  escalateStudentToRed: (studentId: string, reason: string) => void;

  // Alerts
  alerts: Alert[];
  unreadAlertCount: number;
  markAlertRead: (alertId: string) => void;
  markAllAlertsRead: () => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void;

  // Simulator
  activeVoiceSample: VoiceSample | null;
  setActiveVoiceSample: (sample: VoiceSample | null) => void;

  // Peer Chat
  conversations: PeerConversation[];
  activeConversationId: string;
  setActiveConversationId: (id: string) => void;
  messages: Record<string, PeerChatMessage[]>;
  sendMessage: (convId: string, text: string, isVoice?: boolean, durationSec?: number) => void;
  triggerCrisisEscalation: (convId: string) => void;

  // Settings
  settings: SchoolSettings;
  updateSettings: (newSettings: Partial<SchoolSettings>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole>('counselor');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // Default true for frictionless demo
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<RiskZone | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [activeVoiceSample, setActiveVoiceSample] = useState<VoiceSample | null>(MOCK_VOICE_SAMPLES[2]); // Depressed Arjun by default

  const [conversations, setConversations] = useState<PeerConversation[]>(MOCK_PEER_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string>('conv-1');
  const [messages, setMessages] = useState<Record<string, PeerChatMessage[]>>(MOCK_PEER_MESSAGES);

  const [settings, setSettings] = useState<SchoolSettings>(INITIAL_SCHOOL_SETTINGS);

  // Sync dark mode class with html root element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const loginAsDemo = (role: UserRole = 'counselor') => {
    setUserRole(role);
    setIsAuthenticated(true);
    if (role === 'counselor') setActivePage('dashboard');
    else if (role === 'admin') setActivePage('admin');
    else if (role === 'peer-mentor') setActivePage('peer-chat');
    else if (role === 'student') setActivePage('student-portal');
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  // Student Actions
  const revealStudentIdentity = (studentId: string) => {
    setStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, isIdentified: true } : s))
    );
    if (selectedStudent && selectedStudent.id === studentId) {
      setSelectedStudent(prev => prev ? { ...prev, isIdentified: true } : null);
    }
  };

  const markStudentContacted = (studentId: string, noteText: string) => {
    const newNote = {
      id: `n-${Date.now()}`,
      timestamp: 'Just now',
      counselorName: 'Dr. Sunita Rao',
      note: noteText || 'Initiated counselor check-in with student.',
      actionType: 'contact' as const,
    };

    setStudents(prev =>
      prev.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            isContacted: true,
            notes: [newNote, ...s.notes],
          };
        }
        return s;
      })
    );

    if (selectedStudent && selectedStudent.id === studentId) {
      setSelectedStudent(prev =>
        prev
          ? {
              ...prev,
              isContacted: true,
              notes: [newNote, ...prev.notes],
            }
          : null
      );
    }
  };

  const escalateStudentToRed = (studentId: string, reason: string) => {
    const newNote = {
      id: `n-${Date.now()}`,
      timestamp: 'Just now',
      counselorName: 'Dr. Sunita Rao',
      note: `ESCALATED TO RED ZONE: ${reason}`,
      actionType: 'escalate' as const,
    };

    setStudents(prev =>
      prev.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            zone: 'red' as RiskZone,
            riskScore: Math.min(s.riskScore, 22),
            trendDirection: 'down' as const,
            notes: [newNote, ...s.notes],
          };
        }
        return s;
      })
    );

    // Also trigger immediate high severity alert
    addAlert({
      studentId,
      type: 'zone_shift',
      zoneTo: 'red',
      message: `Manual Counselor Escalation: Student ${studentId} flagged as Critical Red Zone (${reason}).`,
      severity: 'critical',
    });

    if (selectedStudent && selectedStudent.id === studentId) {
      setSelectedStudent(prev =>
        prev
          ? {
              ...prev,
              zone: 'red' as RiskZone,
              riskScore: Math.min(prev.riskScore, 22),
              trendDirection: 'down',
              notes: [newNote, ...prev.notes],
            }
          : null
      );
    }
  };

  // Alerts
  const unreadAlertCount = alerts.filter(a => !a.read).length;

  const markAlertRead = (alertId: string) => {
    setAlerts(prev => prev.map(a => (a.id === alertId ? { ...a, read: true } : a)));
  };

  const markAllAlertsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  const addAlert = (alertData: Omit<Alert, 'id' | 'timestamp' | 'read'>) => {
    const newAlert: Alert = {
      ...alertData,
      id: `alt-${Date.now()}`,
      timestamp: 'Just now',
      read: false,
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  // Peer Chat
  const sendMessage = (convId: string, text: string, isVoice = false, durationSec = 15) => {
    const newMsg: PeerChatMessage = {
      id: `m-${Date.now()}`,
      conversationId: convId,
      senderId: userRole === 'peer-mentor' ? 'mentor-1' : 'stud-4421',
      senderRole: userRole === 'peer-mentor' ? 'peer-mentor' : 'student',
      senderName: userRole === 'peer-mentor' ? 'Mental Health Ambassador (Class 12)' : 'Student #4421',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
      isVoice,
      audioDurationSec: isVoice ? durationSec : undefined,
    };

    setMessages(prev => ({
      ...prev,
      [convId]: [...(prev[convId] || []), newMsg],
    }));

    setConversations(prev =>
      prev.map(c =>
        c.id === convId
          ? {
              ...c,
              lastMessage: isVoice ? `[Voice Note 0:${durationSec}] ${text}` : text,
              lastTimestamp: 'Just now',
            }
          : c
      )
    );
  };

  const triggerCrisisEscalation = (convId: string) => {
    const systemMsg: PeerChatMessage = {
      id: `sys-${Date.now()}`,
      conversationId: convId,
      senderId: 'system',
      senderRole: 'system',
      senderName: 'ExamStress Crisis Escalation',
      timestamp: 'Just now',
      text: '⚠️ Immediate Help Request received. School Counselor Dr. Sunita Rao has been notified. National Crisis Helpline (1800-599-0019) is available 24/7.',
    };

    setMessages(prev => ({
      ...prev,
      [convId]: [...(prev[convId] || []), systemMsg],
    }));

    addAlert({
      studentId: '#4421',
      type: 'crisis_button',
      zoneTo: 'red',
      message: '🚨 CRISIS ESCALATION BUTTON TRIGGERED by Student #4421 in Anonymous Peer Chat.',
      severity: 'critical',
    });
  };

  const updateSettings = (newSettings: Partial<SchoolSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <AppContext.Provider
      value={{
        userRole,
        setUserRole,
        isAuthenticated,
        setIsAuthenticated,
        loginAsDemo,
        logout,
        activePage,
        setActivePage,
        darkMode,
        setDarkMode,
        toggleDarkMode,
        students,
        selectedStudent,
        setSelectedStudent,
        selectedZoneFilter,
        setSelectedZoneFilter,
        searchQuery,
        setSearchQuery,
        revealStudentIdentity,
        markStudentContacted,
        escalateStudentToRed,
        alerts,
        unreadAlertCount,
        markAlertRead,
        markAllAlertsRead,
        addAlert,
        activeVoiceSample,
        setActiveVoiceSample,
        conversations,
        activeConversationId,
        setActiveConversationId,
        messages,
        sendMessage,
        triggerCrisisEscalation,
        settings,
        updateSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
