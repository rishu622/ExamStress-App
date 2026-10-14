import React, { useState } from 'react';
import { ShieldAlert, Lock, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RevealIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  studentId: string;
}

export const RevealIdentityModal: React.FC<RevealIdentityModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  studentId,
}) => {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-800">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Privacy Compliance Notice
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                DPDP Act 2023 Audit Logging Active
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-3 mb-6 text-sm text-slate-600 dark:text-slate-300">
            <p>
              You are requesting to reveal the confidential real identity (Name & Roll Number) for student <strong className="font-mono text-slate-900 dark:text-white">{studentId}</strong>.
            </p>

            <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Audited Counselor Action</span>
              </div>
              <p>
                Revealing student identity is strictly intended for active intervention planning. This action will be timestamped and recorded in the school principal’s compliance log.
              </p>
            </div>

            <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={e => setIsChecked(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300">
                I confirm that I am a licensed counselor/staff member taking responsibility for student intervention.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              disabled={!isChecked}
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-blue hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-brand-blue rounded-xl shadow-xs transition flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Reveal Identity</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
