import React from 'react';
import { useApp } from '../context/AppContext';
import { Heart, Sparkles, MessageSquareHeart, Sun, Moon, Smile, ShieldCheck, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export const StudentPortalPage: React.FC = () => {
  const { setActivePage } = useApp();

  const wellbeingData = [
    { day: 'Mon', energy: 85, balance: 80 },
    { day: 'Tue', energy: 82, balance: 84 },
    { day: 'Wed', energy: 78, balance: 82 },
    { day: 'Thu', energy: 88, balance: 86 },
    { day: 'Fri', energy: 90, balance: 88 },
    { day: 'Sat', energy: 92, balance: 90 },
    { day: 'Sun', energy: 89, balance: 89 },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Warm Header Card */}
      <div className="bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-xs rounded-full text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 fill-current" /> My Daily Wellbeing Space
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Hello! Your Vocal Energy Levels Have Been Steady & Strong
          </h1>
          <p className="text-sm text-blue-50 leading-relaxed max-w-2xl">
            ExamStress passive voice analysis helps you keep track of your energy, sleep balance, and acoustic harmony in a supportive, completely private way.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => setActivePage('peer-chat')}
              className="px-5 py-2.5 bg-white text-brand-blue font-bold text-xs sm:text-sm rounded-2xl shadow-md hover:bg-slate-50 transition flex items-center gap-2"
            >
              <MessageSquareHeart className="w-4 h-4" />
              <span>Talk to Senior Peer Mentor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Non-Clinical Wellbeing Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            <Sun className="w-4 h-4 text-amber-500" /> Morning Energy Resonance
          </div>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono block">
            88% Optimal
          </span>
          <p className="text-xs text-slate-500">Your vocal warmth indicates good morning alertness.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            <Moon className="w-4 h-4 text-indigo-500" /> Rest & Sleep Balance
          </div>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono block">
            Steady Rhythm
          </span>
          <p className="text-xs text-slate-500">Response latencies suggest healthy overnight rest.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            <Smile className="w-4 h-4 text-emerald-500" /> Positivity Indicator
          </div>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono block">
            Very High
          </span>
          <p className="text-xs text-slate-500">Clear pitch dynamics during attendance calls.</p>
        </div>
      </div>

      {/* Weekly Energy Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">
          7-Day Vocal Vitality Trend
        </h3>
        <p className="text-xs text-slate-400">
          Showing smooth consistency across morning attendance checks.
        </p>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={wellbeingData}>
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[50, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
              <Line type="monotone" dataKey="energy" stroke="#50E3C2" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Friendly Personalized Tips Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-blue" /> Supportive Daily Recommendations
        </h3>

        <div className="space-y-3 text-xs sm:text-sm">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-brand-blue font-bold">💡</span>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Sleep Routine Optimization</span>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Consider sleeping 30 minutes earlier on Sunday night — your vocal response time suggests mild Thursday evening fatigue before physics class.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-bold">🌱</span>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Hydration & Breathing</span>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Drinking a warm glass of water before morning roll call keeps vocal cords relaxed and vocal resonance open.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
