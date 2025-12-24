'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { ParetoDataPoint } from '@/lib/dashboardUtils';

interface ParetoChartProps {
  data: ParetoDataPoint[];
  loading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: ParetoDataPoint }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white">{data.externalItemId}</p>
      <p className="text-xs text-slate-500">in {data.elementName}</p>
      <div className="mt-1 space-y-0.5">
        <p className="text-xs text-slate-400">
          Top <span className="text-cyan-400 font-mono">{data.skuPercentile}%</span> of items
        </p>
        <p className="text-xs text-slate-400">
          = <span className="text-emerald-400 font-mono">{data.cumulativePicks}%</span> of picks
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {data.picks.toLocaleString()} picks
        </p>
      </div>
    </div>
  );
}

export default function ParetoChart({ data, loading }: ParetoChartProps) {
  // Calculate 80/20 point
  const paretoPoint = useMemo(() => {
    if (data.length === 0) return null;

    // Find the point closest to 80% of picks
    let point80 = data.find(d => d.cumulativePicks >= 80);
    if (!point80) point80 = data[data.length - 1];

    // Find the point closest to 20% of SKUs
    let point20 = data.find(d => d.skuPercentile >= 20);
    if (!point20) point20 = data[0];

    return {
      picksAt20: point20?.cumulativePicks || 0,
      skusAt80: point80?.skuPercentile || 0,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl shadow-xl h-full">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-48 mb-4"></div>
          <div className="h-64 bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl shadow-xl h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Pareto Distribution</h3>
            <p className="text-sm text-slate-500">ABC Analysis</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-48">
          <p className="text-slate-500 text-sm">No data available</p>
        </div>
      </div>
    );
  }

  // Add origin point for smooth curve
  const chartData = [{ skuPercentile: 0, cumulativePicks: 0, elementName: '', picks: 0 }, ...data];

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl shadow-xl h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Pareto Distribution</h3>
            <p className="text-sm text-slate-500">ABC Analysis (80/20 Rule)</p>
          </div>
        </div>

        {/* Pareto insight */}
        {paretoPoint && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Top 20% items =</p>
            <p className="text-lg font-bold font-mono text-emerald-400">{paretoPoint.picksAt20}% picks</p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />

            <XAxis
              dataKey="skuPercentile"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(value) => `${value}%`}
              ticks={[0, 20, 40, 60, 80, 100]}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(value) => `${value}%`}
              ticks={[0, 20, 40, 60, 80, 100]}
              domain={[0, 100]}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* 80/20 Reference Lines */}
            <ReferenceLine
              x={20}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={80}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />

            {/* Perfect equality line */}
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
              stroke="#475569"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />

            <Area
              type="monotone"
              dataKey="cumulativePicks"
              stroke="#8b5cf6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPicks)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-violet-500 rounded"></div>
          <span>Cumulative Picks</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-amber-500 rounded opacity-50" style={{ borderStyle: 'dashed' }}></div>
          <span>80/20 Lines</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-slate-600 rounded opacity-50" style={{ borderStyle: 'dashed' }}></div>
          <span>Perfect Equality</span>
        </div>
      </div>
    </div>
  );
}
