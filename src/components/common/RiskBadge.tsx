import React from 'react';
import type { RiskZone } from '../../types';
import { ShieldCheck, AlertTriangle, AlertCircle, ShieldAlert } from 'lucide-react';

interface RiskBadgeProps {
  zone: RiskZone;
  score?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  zone,
  score,
  showIcon = true,
  size = 'md',
}) => {
  const zoneConfig = {
    green: {
      label: 'Green Zone',
      range: '70 - 100',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      borderColor: 'border-emerald-300 dark:border-emerald-700',
      dotColor: 'bg-emerald-500',
      icon: ShieldCheck,
    },
    yellow: {
      label: 'Yellow Zone',
      range: '50 - 69',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      textColor: 'text-amber-700 dark:text-amber-400',
      borderColor: 'border-amber-300 dark:border-amber-700',
      dotColor: 'bg-amber-500',
      icon: AlertTriangle,
    },
    orange: {
      label: 'Orange Zone',
      range: '30 - 49',
      bgColor: 'bg-orange-50 dark:bg-orange-950/40',
      textColor: 'text-orange-700 dark:text-orange-400',
      borderColor: 'border-orange-300 dark:border-orange-700',
      dotColor: 'bg-orange-500',
      icon: AlertCircle,
    },
    red: {
      label: 'Red Zone',
      range: '0 - 29',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      textColor: 'text-rose-700 dark:text-rose-400',
      borderColor: 'border-rose-300 dark:border-rose-700',
      dotColor: 'bg-rose-500',
      icon: ShieldAlert,
    },
  };

  const config = zoneConfig[zone];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium gap-1',
    md: 'px-2.5 py-1 text-xs font-semibold gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm font-bold gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses[size]} transition-all`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
      <span>{config.label}</span>
      {score !== undefined && (
        <span className="font-mono opacity-80 border-l border-current pl-1.5 ml-0.5">
          {score}
        </span>
      )}
    </span>
  );
};
