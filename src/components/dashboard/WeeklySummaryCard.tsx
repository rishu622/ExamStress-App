import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, ArrowRight, ShieldCheck, UserCheck, TrendingUp, Calendar } from 'lucide-react';

export const WeeklySummaryCard: React.FC = () => {
  const { students } = useApp();

  const totalInterventions = students.filter(s => s.isContacted || s.notes.length > 0).length;
  const improvedStudentsCount = students.filter(s => s.trendDirection === 'up').length;

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden flex flex-col justify-between">
      {/* Subtle background decoration circle */}
      <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-brand-mint" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Weekly AI Impact & Intervention Summary</h3>
              <p className="text-xs text-blue-100/80 font-mono">Aug 27 – Sep 02, 2026</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-semibold text-brand-mint font-mono">
            Auto-Generated
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10">
            <span className="text-[10px] uppercase font-semibold text-blue-200 block">Interventions</span>
            <span className="text-xl font-extrabold font-mono text-white mt-1 block">{totalInterventions} Made</span>
          </div>

          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10">
            <span className="text-[10px] uppercase font-semibold text-blue-200 block">Improving Trends</span>
            <span className="text-xl font-extrabold font-mono text-brand-mint mt-1 block">{improvedStudentsCount} Students</span>
          </div>

          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10">
            <span className="text-[10px] uppercase font-semibold text-blue-200 block">Red → Orange Shifts</span>
            <span className="text-xl font-extrabold font-mono text-emerald-300 mt-1 block">1 Recovered</span>
          </div>
        </div>

        <p className="text-xs text-blue-100 leading-relaxed">
          <strong>Key Highlights:</strong> 82% of morning attendance voice checks analyzed within 12 seconds. Student #1007 successfully transitioned out of Orange zone following counselor check-in.
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-blue-100">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-brand-mint" /> 98.4% System Analysis Accuracy
        </span>
      </div>
    </div>
  );
};
