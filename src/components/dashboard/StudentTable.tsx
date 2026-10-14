import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RiskBadge } from '../common/RiskBadge';
import { SparklineChart } from '../common/SparklineChart';
import type { RiskZone } from '../../types';
import {
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  UserCheck
} from 'lucide-react';

export const StudentTable: React.FC = () => {
  const {
    students,
    setSelectedStudent,
    selectedZoneFilter,
    setSelectedZoneFilter,
    searchQuery,
  } = useApp();

  const [filterMode, setFilterMode] = useState<'at-risk' | 'all' | RiskZone>('at-risk');

  const filteredStudents = students.filter(student => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const idMatch = student.id.toLowerCase().includes(q);
      const nameMatch = student.isIdentified && student.realName.toLowerCase().includes(q);
      const classMatch = student.gradeClass.toLowerCase().includes(q);
      if (!idMatch && !nameMatch && !classMatch) return false;
    }

    if (selectedZoneFilter !== 'all') {
      return student.zone === selectedZoneFilter;
    }

    if (filterMode === 'at-risk') {
      return student.zone === 'orange' || student.zone === 'red';
    } else if (filterMode === 'all') {
      return true;
    } else {
      return student.zone === filterMode;
    }
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Header controls */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
              Student Mental Health Monitoring Table
            </h3>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full font-mono">
              {filteredStudents.length} Students
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click any row to open full 30-day biomarker charts, radar profile, and counselor action panel.
          </p>
        </div>

        {/* Filter Pill Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => {
              setSelectedZoneFilter('all');
              setFilterMode('at-risk');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              filterMode === 'at-risk' && selectedZoneFilter === 'all'
                ? 'bg-rose-500 text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🔥 At-Risk Only (Orange + Red)
          </button>
          <button
            onClick={() => {
              setSelectedZoneFilter('all');
              setFilterMode('all');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              filterMode === 'all' && selectedZoneFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-brand-blue shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Students
          </button>
          <button
            onClick={() => {
              setSelectedZoneFilter('all');
              setFilterMode('red');
            }}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              filterMode === 'red' && selectedZoneFilter === 'all'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Red
          </button>
          <button
            onClick={() => {
              setSelectedZoneFilter('all');
              setFilterMode('orange');
            }}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              filterMode === 'orange' && selectedZoneFilter === 'all'
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Orange
          </button>
          <button
            onClick={() => {
              setSelectedZoneFilter('all');
              setFilterMode('yellow');
            }}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              filterMode === 'yellow' && selectedZoneFilter === 'all'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Yellow
          </button>
          <button
            onClick={() => {
              setSelectedZoneFilter('all');
              setFilterMode('green');
            }}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              filterMode === 'green' && selectedZoneFilter === 'all'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Green
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs md:text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Anonymous Student ID</th>
              <th className="py-3.5 px-4">Zone & Score</th>
              <th className="py-3.5 px-4">14-Day Energy Trend</th>
              <th className="py-3.5 px-4">Last Check</th>
              <th className="py-3.5 px-4">Days in Zone</th>
              <th className="py-3.5 px-4">AI Suggested Intervention</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">
                  No students found matching current filter criteria.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 cursor-pointer transition group"
                >
                  {/* Anonymous ID */}
                  <td className="py-4 px-4 font-mono font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <span>{student.id}</span>
                      {student.isIdentified ? (
                        <span className="px-2 py-0.5 text-[10px] font-sans font-semibold bg-blue-100 text-brand-blue rounded-md">
                          {student.realName} ({student.gradeClass})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-sans font-normal">
                          [{student.gradeClass}]
                        </span>
                      )}
                      {student.isContacted && (
                        <span title="Counselor contacted" className="text-emerald-600 dark:text-emerald-400">
                          <UserCheck className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Zone & Score */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <RiskBadge zone={student.zone} score={student.riskScore} />
                      {student.trendDirection === 'up' && (
                        <span title="Improving trend">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </span>
                      )}
                      {student.trendDirection === 'down' && (
                        <span title="Declining trend">
                          <TrendingDown className="w-4 h-4 text-rose-500 animate-bounce" />
                        </span>
                      )}
                      {student.trendDirection === 'stable' && (
                        <span title="Stable trend">
                          <Minus className="w-4 h-4 text-slate-400" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 14-day Sparkline */}
                  <td className="py-4 px-4">
                    <SparklineChart data={student.biomarkers30Days} zone={student.zone} />
                  </td>

                  {/* Last Check */}
                  <td className="py-4 px-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                    {student.lastVoiceCheck}
                  </td>

                  {/* Days in Zone */}
                  <td className="py-4 px-4">
                    <span className="font-mono font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                      {student.daysInCurrentZone} days
                    </span>
                  </td>

                  {/* AI Intervention */}
                  <td className="py-4 px-4 max-w-xs">
                    <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      <Sparkles className="w-3.5 h-3.5 text-brand-blue shrink-0 mt-0.5" />
                      <span>{student.aiIntervention}</span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudent(student);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-brand-blue bg-blue-50 dark:bg-blue-950/40 hover:bg-brand-blue hover:text-white rounded-xl transition flex items-center gap-1.5 ml-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Profile</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
