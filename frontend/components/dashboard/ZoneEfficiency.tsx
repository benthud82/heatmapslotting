'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ZoneBreakdown, VelocityTier } from '@/lib/dashboardUtils';

interface ZoneEfficiencyProps {
  zones: ZoneBreakdown[];
  loading?: boolean;
  onZoneClick?: (tier: VelocityTier) => void;
}

// Custom tooltip
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ZoneBreakdown }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-white font-bold capitalize text-sm">{data.tier} Zone</p>
        <p className="text-slate-300 text-xs font-mono">
          {data.totalPicks.toLocaleString()} picks
        </p>
        <p className="text-slate-400 text-[10px] font-mono">
          {data.count} locations • {data.percentage.toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

// Compact zone legend item
function ZoneLegendItem({ 
  tier, 
  count, 
  percentage, 
  color, 
  onClick 
}: { 
  tier: VelocityTier;
  count: number;
  percentage: number;
  color: string;
  onClick?: () => void;
}) {
  const labels: Record<VelocityTier, string> = {
    hot: 'Hot Zone',
    warm: 'Warm Zone',
    cold: 'Cold Zone',
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/50 transition-all w-full text-left"
    >
      <div className="flex items-center gap-2">
        <div 
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-slate-300 text-xs font-medium">{labels[tier]}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white font-mono font-bold text-xs">{percentage.toFixed(1)}%</span>
        <span className="text-slate-500 text-[10px] font-mono">{count} loc</span>
      </div>
    </button>
  );
}

export default function ZoneEfficiency({ zones, loading, onZoneClick }: ZoneEfficiencyProps) {
  // Prepare chart data
  const chartData = useMemo(() => {
    return zones.filter(z => z.totalPicks > 0);
  }, [zones]);

  const totalPicks = useMemo(() => {
    return zones.reduce((sum, z) => sum + z.totalPicks, 0);
  }, [zones]);

  const totalLocations = useMemo(() => {
    return zones.reduce((sum, z) => sum + z.count, 0);
  }, [zones]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 shadow-xl h-full">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-28 mb-3"></div>
          <div className="flex items-center justify-center h-32">
            <div className="w-24 h-24 bg-slate-700 rounded-full"></div>
          </div>
          <div className="space-y-2 mt-3">
            <div className="h-6 bg-slate-700 rounded"></div>
            <div className="h-6 bg-slate-700 rounded"></div>
            <div className="h-6 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 shadow-xl h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
          Zone Distribution
        </h3>
        <span className="text-[10px] font-mono text-slate-500">
          {totalPicks.toLocaleString()} picks
        </span>
      </div>

      {/* Compact Donut Chart */}
      <div className="h-32 relative flex-shrink-0">
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={50}
                  paddingAngle={3}
                  dataKey="totalPicks"
                  stroke="transparent"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onZoneClick?.(entry.tier)}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-lg font-bold text-white font-mono">{totalLocations}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Locations</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-8 h-8 text-slate-700 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              </svg>
              <p className="text-slate-500 text-xs">No data</p>
            </div>
          </div>
        )}
      </div>

      {/* Compact Legend */}
      <div className="space-y-0.5 mt-2 flex-1">
        {zones.map((zone) => (
          <ZoneLegendItem
            key={zone.tier}
            tier={zone.tier}
            count={zone.count}
            percentage={zone.percentage}
            color={zone.color}
            onClick={() => onZoneClick?.(zone.tier)}
          />
        ))}
      </div>

      {/* Single Action Button */}
      <div className="mt-3 pt-3 border-t border-slate-800">
        <Link 
          href="/heatmap"
          className="w-full px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          View Heatmap
        </Link>
      </div>
    </div>
  );
}
