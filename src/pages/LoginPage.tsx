import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { Shield, Sparkles, Activity, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const LoginPage: React.FC = () => {
  const { loginAsDemo, setUserRole } = useApp();

  const [selectedRole, setSelectedRole] = useState<UserRole>('counselor');
  const [email, setEmail] = useState('counselor@dps.edu.in');
  const [password, setPassword] = useState('••••••••••••');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginAsDemo(selectedRole);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Animated Calming Background Circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-blue/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-mint/20 rounded-full blur-3xl animate-pulse pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 dark:border-slate-800 p-8 space-y-6 relative z-10"
      >
        {/* Brand Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-mint flex items-center justify-center text-white font-bold shadow-lg shadow-brand-blue/30">
            <Activity className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Exam<span className="text-brand-blue">Stress</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            AI-Powered Voice-Based Student Mental Health Early Warning System
          </p>
        </div>

        {/* Role Selector Pills */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 text-center">
            Select Portal Access Role
          </label>
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            {(['counselor', 'admin', 'peer-mentor', 'student'] as UserRole[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition capitalize ${
                  selectedRole === role
                    ? 'bg-white dark:bg-slate-700 text-brand-blue shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {role === 'peer-mentor' ? 'Peer Mentor' : role}
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Institutional Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-blue/30 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-blue/30 dark:text-white"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 text-xs sm:text-sm font-bold text-white bg-brand-blue hover:bg-blue-600 rounded-xl shadow-lg shadow-brand-blue/30 transition flex items-center justify-center gap-2"
          >
            <span>Sign In to {selectedRole.replace('-', ' ')} Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Instant Hackathon Demo Mode Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span className="bg-white dark:bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-400 absolute">
            Hackathon Judge Access
          </span>
        </div>

        <button
          type="button"
          onClick={() => loginAsDemo('counselor')}
          className="w-full py-3 px-4 rounded-xl border-2 border-brand-mint text-emerald-700 dark:text-brand-mint bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 font-extrabold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span>⚡ Instant Hackathon Demo Mode (Bypass Auth)</span>
        </button>
      </motion.div>
    </div>
  );
};
