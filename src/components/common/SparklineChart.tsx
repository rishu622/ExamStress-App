import React from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';
import { BiomarkerTrendPoint, RiskZone } from '../../types';

interface SparklineChartProps {
  data: BiomarkerTrendPoint[];
  metric?: keyof BiomarkerTrendPoint;
  zone?: RiskZone;
  height?: number;
  width?: number;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  metric = 'energyLevel',
  zone = 'green',
  height = 36,
  width = 110,
}) => {
  // Extract last 14 days
  const sliceData = data.slice(-14);

  const colors: Record<RiskZone, string> = {
    green: '#4CAF50',
    yellow: '#FFC107',
    orange: '#FF9800',
    red: '#F44336',
  };

  const color = colors[zone];

  return (
    <div style={{ width, height }} className="inline-block overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sliceData}>
          <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
          <Line
            type="monotone"
            dataKey={metric as string}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
