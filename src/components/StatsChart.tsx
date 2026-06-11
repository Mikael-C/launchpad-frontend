import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ChartDataPoint {
  date: string;
  tvl: number;
  investors: number;
}

interface StatsChartProps {
  data: ChartDataPoint[];
  type: 'tvl' | 'investors';
}

export const StatsChart: React.FC<StatsChartProps> = ({ data, type }) => {
  const formatYAxis = (val: number) => {
    if (type === 'tvl') {
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
      return `$${val}`;
    }
    return val.toString();
  };

  const gradientColor = type === 'tvl' ? '#00d4ff' : '#6c63ff';
  const strokeColor = type === 'tvl' ? 'var(--accent-secondary)' : 'var(--accent-primary)';

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`color-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradientColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={gradientColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" />
          <XAxis 
            dataKey="date" 
            stroke="var(--text-muted)" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="var(--text-muted)" 
            fontSize={11}
            tickFormatter={formatYAxis}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '12px'
            }}
            formatter={(value: any) => [
              type === 'tvl' ? `$${Number(value).toLocaleString()}` : `${value} Investors`,
              type === 'tvl' ? 'Total Value Locked' : 'Unique Investors'
            ]}
          />
          <Area
            type="monotone"
            dataKey={type}
            stroke={strokeColor}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#color-${type})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
