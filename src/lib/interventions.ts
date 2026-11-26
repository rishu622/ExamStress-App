import type { StudentRow } from '../types';

/** Rule-based next step for a counselor, from the student's zone, trend and history. */
export const suggestIntervention = (s: StudentRow): string => {
  if (s.crisis_flag) return 'Crisis language detected: contact today and follow the safeguarding procedure.';
  if (!s.zone) return s.consent_given ? 'No check-ins yet: send a gentle reminder.' : 'Not opted in: share the privacy notice in class.';
  const stale = s.last_checkin_at ? (Date.now() - new Date(s.last_checkin_at).getTime()) / 86400000 > 7 : true;
  if (s.zone === 'red') {
    return s.last_contacted_at ? 'Follow up on last contact; consider parent or specialist referral.' : 'Immediate one-to-one meeting today.';
  }
  if (s.zone === 'orange') {
    if (s.trend === 'down') return 'Score falling: schedule a check-in within 48 hours.';
    return s.days_in_zone >= 7 ? `In orange for ${s.days_in_zone} days: book a counselling session.` : 'Schedule a voluntary chat this week.';
  }
  if (s.zone === 'yellow') {
    return s.trend === 'down' ? 'Trending down: suggest a peer mentor chat and a study-break plan.' : 'Share exam-stress and sleep tips; keep monitoring.';
  }
  if (stale) return 'No recent check-in: encourage a quick check-in.';
  return s.trend === 'up' ? 'Improving: acknowledge their progress.' : 'Doing well: no action needed.';
};
