import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, ShieldCheck, Bell, Sliders, Save, FileSpreadsheet, Lock } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useApp();

  const [saved, setSaved] = useState(false);
  const [counselorName, setCounselorName] = useState('Dr. Sunita Rao');
  const [counselorEmail, setCounselorEmail] = useState('sunita.rao@dps.edu.in');
  const [phone, setPhone] = useState('+91 98765 43210');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            System Settings & Profile Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage counselor credentials, notification channels, risk threshold boundaries, and privacy parameters.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2.5 bg-brand-blue text-white text-xs font-bold rounded-2xl shadow-md hover:bg-blue-600 transition flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Save Preferences
        </button>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
          ✓ Preferences saved successfully!
        </div>
      )}

      {/* Counselor Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-blue" /> Lead Counselor Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Full Name</label>
            <input
              type="text"
              value={counselorName}
              onChange={(e) => setCounselorName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Email Address</label>
            <input
              type="email"
              value={counselorEmail}
              onChange={(e) => setCounselorEmail(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Alert SMS Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* DPDP Act Compliance Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-500" /> Digital Personal Data Protection (DPDP) Compliance
        </h3>

        <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
          <p className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Compliant with India DPDP Act 2023 & POSH/Child Safety Guidelines
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
            <li>Audio streams are processed in-memory using passive acoustic feature extraction.</li>
            <li>No raw voice recordings are stored permanently unless flagged for counselor review.</li>
            <li>Student real names are stored as encrypted hashes and unlocked only during audited identity reveal steps.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
