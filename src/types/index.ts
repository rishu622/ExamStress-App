export type UserRole = 'student' | 'peer-mentor' | 'counselor' | 'admin';

export type RiskZone = 'green' | 'yellow' | 'orange' | 'red';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  anon_id: string | null;
  grade_class: string | null;
  is_active: boolean;
  must_change_password: boolean;
  consent_given: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface PublicSettings {
  school_name: string;
  helpline_text: string;
  counselor_contact_text: string;
}

export interface SchoolSettings extends PublicSettings {
  threshold_green_min: number;
  threshold_yellow_min: number;
  threshold_orange_min: number;
  data_retention_days: number;
  email_alerts_enabled: boolean;
  alert_email_recipients: string;
  smtp_configured: boolean;
}

export interface VoiceFeatures {
  duration_s: number | null;
  pitch_hz: number | null;
  energy_db: number | null;
  pause_ratio: number | null;
  deviation: number | null;
}

export interface StudentCheckIn {
  id: string;
  created_at: string;
  mood: number;
  stress: number;
  sleep: number;
  score: number;
  note_text: string | null;
  has_voice: boolean;
  voice: VoiceFeatures | null;
}

export interface StudentSummary {
  consent_given: boolean;
  total_checkins: number;
  checkins_this_week: number;
  average_score_this_week: number | null;
  voice_baseline_count: number;
  latest: StudentCheckIn | null;
  checked_in_today: boolean;
  history: StudentCheckIn[];
}

export interface Tip {
  kind: string;
  title: string;
  text: string;
}

export interface CheckInResult {
  checkin: StudentCheckIn;
  crisis: boolean;
  tips: Tip[];
  helpline_text: string | null;
  voice_baseline_ready: boolean;
}

export interface StudentRow {
  id: string;
  anon_id: string;
  grade_class: string | null;
  is_active: boolean;
  consent_given: boolean;
  score: number | null;
  zone: RiskZone | null;
  previous_zone: RiskZone | null;
  trend: 'up' | 'down' | 'stable';
  last_checkin_at: string | null;
  days_in_zone: number;
  escalated: boolean;
  last_contacted_at: string | null;
  open_alerts: number;
  sparkline: number[];
  crisis_flag: boolean;
}

export interface CounselorCheckIn {
  id: string;
  created_at: string;
  score: number;
  zone: RiskZone;
  mood: number;
  stress: number;
  sleep: number;
  self_report_score: number;
  note_text: string | null;
  language_flags: string[];
  crisis_language: boolean;
  voice_energy_db: number | null;
  voice_pause_ratio: number | null;
  voice_pitch_hz: number | null;
  voice_deviation: number | null;
}

export interface CaseNote {
  id: string;
  created_at: string;
  action_type: 'note' | 'contact' | 'escalate' | 'resolve';
  text: string;
  author_name: string;
}

export interface StudentDetail extends StudentRow {
  escalation_reason: string | null;
  history: CounselorCheckIn[];
  notes: CaseNote[];
}

export interface Alert {
  id: string;
  student_id: string | null;
  student_anon_id: string | null;
  conversation_id: string | null;
  type: 'zone_shift' | 'crisis_language' | 'crisis_button' | 'chat_flag' | 'escalation';
  severity: 'critical' | 'high' | 'medium';
  message: string;
  is_read: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  alias: string;
  topic: string | null;
  status: 'open' | 'escalated' | 'closed';
  created_at: string;
  updated_at: string;
  last_message: string | null;
  last_sender_role: string | null;
  student_anon_id: string | null;
  student_id: string | null;
}

export interface ChatMessage {
  id: string;
  sender_role: 'student' | 'peer-mentor' | 'counselor' | 'system';
  sender_label: string;
  is_mine: boolean;
  body: string;
  flagged: boolean;
  created_at: string;
}

export interface ZoneCounts {
  green: number;
  yellow: number;
  orange: number;
  red: number;
}

export interface OverviewStats {
  total_students: number;
  students_with_data: number;
  active_this_week: number;
  checkins_this_week: number;
  consented_students: number;
  distribution: ZoneCounts;
  escalated: number;
  open_alerts: { total: number; critical: number; high: number };
  interventions_this_week: number;
  weekly: (ZoneCounts & { week_start: string; label: string; checked_in: number })[];
  daily_checkins: { date: string; count: number }[];
  staff: { counselor: number; 'peer-mentor': number; admin: number };
  generated_at: string;
}

export interface AuditEntry {
  id: string;
  created_at: string;
  actor_name: string;
  actor_role: string | null;
  action: string;
  target: string | null;
  details: string | null;
}
