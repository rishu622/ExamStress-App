export type UserRole = 'counselor' | 'admin' | 'peer-mentor' | 'student';

export type RiskZone = 'green' | 'yellow' | 'orange' | 'red';

export interface BiomarkerTrendPoint {
  day: number;
  date: string;
  pitchVariability: number; // Hz variability or normalized %
  speechRate: number; // words per minute
  responseLatency: number; // milliseconds
  energyLevel: number; // 0.0 to 1.0 normalized
  absolutistWords: number; // count per response
}

export interface RadarPoint {
  subject: string;
  baseline: number; // 0-100 normalized metric
  current: number;  // 0-100 normalized metric
  fullMark: number;
}

export interface InterventionNote {
  id: string;
  timestamp: string;
  counselorName: string;
  note: string;
  actionType: 'contact' | 'escalate' | 'general';
}

export interface Student {
  id: string; // Anonymous ID e.g. #1008
  realName: string; // e.g. "Arjun Nair"
  gradeClass: string; // e.g. "Class 11-B"
  riskScore: number; // 0 - 100 (100 = optimal mental health, 0 = critical)
  zone: RiskZone;
  previousZone: RiskZone;
  trendDirection: 'up' | 'down' | 'stable'; // up = improving score, down = worsening
  lastVoiceCheck: string;
  daysInCurrentZone: number;
  aiIntervention: string;
  biomarkers30Days: BiomarkerTrendPoint[];
  radarData: RadarPoint[];
  isIdentified: boolean;
  isContacted: boolean;
  notes: InterventionNote[];
}

export interface Alert {
  id: string;
  studentId: string;
  timestamp: string;
  type: 'zone_shift' | 'crisis_button' | 'high_latency';
  zoneFrom?: RiskZone;
  zoneTo: RiskZone;
  message: string;
  read: boolean;
  severity: 'critical' | 'high' | 'medium';
}

export interface VoiceSample {
  id: string;
  title: string;
  studentName: string;
  riskScore: number;
  zone: RiskZone;
  pitchHz: number;
  speechRateWpm: number;
  pauseDurationMs: number;
  energyDb: number;
  sentiment: string;
  transcript: string;
  description: string;
}

export interface PeerChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'student' | 'peer-mentor' | 'counselor' | 'system';
  senderName: string;
  timestamp: string;
  text: string;
  isVoice?: boolean;
  audioDurationSec?: number;
  moderationFlag?: boolean;
}

export interface PeerConversation {
  id: string;
  studentAnonymousId: string;
  lastMessage: string;
  lastTimestamp: string;
  unread: boolean;
  status: 'active' | 'escalated' | 'resolved';
}

export interface SchoolSettings {
  attendanceIntegration: 'api' | 'phone' | 'manual';
  thresholdGreenMin: number;
  thresholdYellowMin: number;
  thresholdOrangeMin: number;
  smsNotifications: boolean;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  dataRetentionDays: number;
  autoDeleteEnabled: boolean;
  transparencyMode: boolean;
}
