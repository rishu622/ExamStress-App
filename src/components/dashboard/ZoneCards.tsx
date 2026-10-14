import React from 'react';
import { useApp } from '../../context/AppContext';
import { RiskZone } from '../../types';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { motion } from 'framer-motion';

export const ZoneCards: React.FC = () => {
  const { students, selectedZoneFilter, setSelectedZoneFilter } = useApp();

  const total = students.length;

  const counts: Record<RiskZone, number> = {
    green: students.filter(s => s.zone === 'green').length,
    yellow: students.filter(s => s.zone === 'yellow').length,
    orange: students.filter(s => s.zone === 'orange').length,
    red: students.filter(s => s.zone === 'red').length,
  };

  const cards: {
    zone: RiskZone;
    title: string;
    scoreRange: string;
    count: number;
    bgClass: string;
    textClass: string;
    borderClass: string;
    ringClass: string;
    icon: React.ElementType;
    trendText: string;
    trendDir: 'up' | 'down' | 'stable';
  }[] = [
    {
      zone: 'green',
      title: 'Green Zone (Healthy)',
      scoreRange: '70 - 100',
      count: counts.green,
      bgClass: 'bg-emerald-50/80 dark:bg-emerald-950/40',
      textClass: 'text-emerald-700 dark:text-emerald-300',
      borderClass: 'border-emerald-200 dark:border-emerald-800',
      ringClass: 'ring-emerald-500',
      icon: ShieldCheck,
      trendText: '+2 students improved this week',
      trendDir: 'up',
    },
    {
      zone: 'yellow',
      title: 'Yellow Zone (Mild Stress)',
      scoreRange: '50 - 69',
      count: counts.yellow,
      bgClass: 'bg-amber-50/80 dark:bg-amber-950/40',
      textClass: 'text-amber-700 dark:text-amber-300',
      borderClass: 'border-amber-200 dark:border-amber-800',
      ringClass: 'ring-amber-500',
      icon: AlertTriangle,
      trendText: 'Stable count over 7 days',
      trendDir: 'stable',
    },
    {
      zone: 'orange',
      title: 'Orange Zone (At-Risk)',
      scoreRange: '30 - 49',
      count: counts.orange,
      bgClass: 'bg-orange-50/80 dark:bg-orange-950/40',
      textClass: 'text-orange-700 dark:text-orange-300',
      borderClass: 'border-orange-200 dark:border-orange-800',
      ringClass: 'ring-orange-500',
      icon: AlertCircle,
      trendText: 'Requires counselor follow-up',
      trendDir: 'down',
    },
    {
      zone: 'red',
      title: 'Red Zone (Critical Crisis)',
      scoreRange: '0 - 29',
      count: counts.red,
      bgClass: 'bg-rose-50/80 dark:bg-rose-950/40',
      textClass: 'text-rose-700 dark:text-rose-300',
      borderClass: 'border-rose-200 dark:border-rose-800',
      ringClass: 'ring-rose-500',
      icon: ShieldAlert,
      trendText: '1 immediate crisis intervention needed',
      trendDir: 'down',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const percentage = total > 0 ? Math.round((card.count / total) * 100) : 0;
        const isSelected = selectedZoneFilter === card.zone;

        return (
          <motion.div
            key={card.zone}
            whileHover={{ y: -4, transition: { duration: 0.15 } }}
            onClick={() => {
              if (selectedZoneFilter === card.zone) setSelectedZoneFilter('all');
              else setSelectedZoneFilter(card.zone);
            }}
            className={`cursor-pointer rounded-2xl p-5 border transition-all ${card.bgClass} ${card.borderClass} ${
              isSelected ? `ring-2 ${card.ringClass} shadow-md` : 'hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${card.textClass}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${card.textClass}`}>
                  {card.title}
                </span>
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                {card.scoreRange}
              </span>
            </div>

            <div className="flex items-baseline justify-between my-2">
              <span className={`text-3xl font-extrabold font-mono tracking-tight ${card.textClass}`}>
                {card.count}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {percentage}% of students
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
              {card.trendDir === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />}
              {card.trendDir === 'down' && <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
              {card.trendDir === 'stable' && <Minus className="w-3.5 h-3.5 text-amber-500" />}
              <span className="truncate">{card.trendText}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
