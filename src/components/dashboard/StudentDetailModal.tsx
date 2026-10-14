import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RiskBadge } from '../common/RiskBadge';
import { RiskScoreRing } from '../common/RiskScoreRing';
import { RevealIdentityModal } from '../common/RevealIdentityModal';
import {
  X,
  Lock,
  Unlock,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  ShieldAlert,
  Send,
  History,
  Activity,
  Zap,
  Clock,
  Volume2,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export const StudentDetailModal: React.FC = () => {
  const {
    selectedStudent,
    setSelectedStudent,
    revealStudentIdentity,
    markStudentContacted,
    escalateStudentToRed
  } = useApp();

  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [activeTab, setActiveTab] = useState<'biomarkers' | 'radar' | 'timeline'>('biomarkers');

  if (!selectedStudent) return null;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    markStudentContacted(selectedStudent.id, noteText);
    setNoteText('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-4">
              <RiskScoreRing score={selectedStudent.riskScore} size={84} strokeWidth={8} zone={selectedStudent.zone} />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                    Student {selectedStudent.id}
                  </h2>
                  <RiskBadge zone={selectedStudent.zone} />
                  {selectedStudent.isContacted && (
                    <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" /> Contacted
                    </span>
                  )}
                </div>

                {/* Identity reveal line */}
                <div className="flex items-center gap-3 mt-1.5 text-sm">
                  {selectedStudent.isIdentified ? (
                    <div className="flex items-center gap-2 text-brand-blue font-bold">
                      <Unlock className="w-4 h-4 text-emerald-500" />
                      <span>{selectedStudent.realName}</span>
                      <span className="text-slate-400 font-normal">({selectedStudent.gradeClass})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono">Real Identity Encrypted</span>
                      <button
                        onClick={() => setRevealModalOpen(true)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition flex items-center gap-1.5"
                      >
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span>Reveal Identity</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedStudent(null)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* AI Insight Callout Box */}
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800/80 border border-blue-100 dark:border-slate-700 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-brand-blue text-white shadow-xs shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-blue dark:text-brand-mint">
                AI Diagnostic Early Warning Insight
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">
                "{selectedStudent.aiIntervention}"
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 mt-4">
            <button
              onClick={() => setActiveTab('biomarkers')}
              className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'biomarkers'
                  ? 'border-brand-blue text-brand-blue font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" /> 30-Day Biomarker Line Trends
            </button>
            <button
              onClick={() => setActiveTab('radar')}
              className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'radar'
                  ? 'border-brand-blue text-brand-blue font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Zap className="w-4 h-4" /> Baseline vs Current Radar
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'timeline'
                  ? 'border-brand-blue text-brand-blue font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" /> Counselor Intervention Log ({selectedStudent.notes.length})
            </button>
          </div>

          {/* Scrollable Main Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'biomarkers' && (
              <div className="space-y-6">
                {/* 1. Voice Energy Level (Normalized 0.0 - 1.0) */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                        Acoustic Energy Level (dB normalized)
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-slate-500">30-Day Trajectory</span>
                  </div>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedStudent.biomarkers30Days}>
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 1]} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                        />
                        <Line type="monotone" dataKey="energyLevel" stroke="#4A90E2" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Grid for 2 sub charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Response Latency (ms) */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-rose-500" />
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                          Response Latency (Pause ms)
                        </h4>
                      </div>
                    </div>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedStudent.biomarkers30Days}>
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                          <Line type="monotone" dataKey="responseLatency" stroke="#F44336" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Absolutist Language Count */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                          Absolutist Language Word Count
                        </h4>
                      </div>
                    </div>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedStudent.biomarkers30Days}>
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                          <Line type="monotone" dataKey="absolutistWords" stroke="#A855F7" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'radar' && (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col items-center">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Baseline (Initial 14 Days) vs Current Acoustic Biomarker Radar Profile
                </h4>
                <div className="w-full max-w-lg h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={selectedStudent.radarData}>
                      <PolarGrid stroke="#cbd5e1" />
                      <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={11} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" fontSize={9} />
                      <Radar name="Healthy Baseline" dataKey="baseline" stroke="#50E3C2" fill="#50E3C2" fillOpacity={0.3} />
                      <Radar name="Current Status" dataKey="current" stroke="#F44336" fill="#F44336" fillOpacity={0.4} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-4">
                {/* Form to add note */}
                <form onSubmit={handleAddNote} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Log New Counselor Intervention Note
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter observation, phone conversation summary, or follow-up plan..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full p-3 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:outline-hidden dark:text-white"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => escalateStudentToRed(selectedStudent.id, noteText || 'Critical voice drop observed')}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-100 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-200 rounded-xl transition flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-4 h-4" /> Escalate to Red Zone
                    </button>
                    <button
                      type="submit"
                      disabled={!noteText.trim()}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-blue hover:bg-blue-600 disabled:opacity-40 rounded-xl shadow-xs transition flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Save Note & Mark Contacted
                    </button>
                  </div>
                </form>

                {/* Timeline List */}
                <div className="space-y-3 pt-2">
                  {selectedStudent.notes.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No previous counselor notes logged.</p>
                  ) : (
                    selectedStudent.notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{note.counselorName}</span>
                          <span className="font-mono text-[10px]">{note.timestamp}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{note.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              Student ID: {selectedStudent.id} • Last Check: {selectedStudent.lastVoiceCheck}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Close Modal
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Identity Reveal Modal */}
      <RevealIdentityModal
        isOpen={revealModalOpen}
        onClose={() => setRevealModalOpen(false)}
        onConfirm={() => revealStudentIdentity(selectedStudent.id)}
        studentId={selectedStudent.id}
      />
    </AnimatePresence>
  );
};
