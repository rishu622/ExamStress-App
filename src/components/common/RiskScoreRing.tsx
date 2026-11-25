import React from 'react';
import type { RiskZone } from '../../types';

interface RiskScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  zone?: RiskZone;
  subtext?: string;
  animate?: boolean;
}

export const RiskScoreRing: React.FC<RiskScoreRingProps> = ({
  score,
  size = 140,
  strokeWidth = 12,
  zone,
  subtext = 'Wellbeing Score',
  animate = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Determine color based on score or explicit zone
  const computedZone: RiskZone = zone || (
    score >= 70 ? 'green' : score >= 50 ? 'yellow' : score >= 30 ? 'orange' : 'red'
  );

  const strokeColors: Record<RiskZone, string> = {
    green: '#2E7D32',
    yellow: '#F57F17',
    orange: '#E65100',
    red: '#C62828',
  };

  const ringColor = strokeColors[computedZone];

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-slate-800"
          fill="transparent"
        />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            transition: animate ? 'stroke-dashoffset 1.5s ease-in-out, stroke 0.5s ease' : 'none',
          }}
        />
      </svg>
      {/* Inner Score Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-3xl font-extrabold tracking-tight" style={{ color: ringColor }}>
          {score}
        </span>
        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
          {subtext}
        </span>
      </div>
    </div>
  );
};
