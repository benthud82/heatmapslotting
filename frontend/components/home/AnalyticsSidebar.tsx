'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { VelocityTier, getVelocityTier, getVelocityColor, ZoneBreakdown } from '@/lib/dashboardUtils';
import { AggregatedPickData } from '@/lib/types';

interface AnalyticsSidebarProps {
  totalPicks: number;
  totalLocations: number;
  layoutCount: number;
  aggregatedData?: AggregatedPickData[];
  loading?: boolean;
}

// Animated counter hook
function useAnimatedNumber(target: number, duration: number = 800): number {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }

    const startTime = Date.now();
    const startValue = current;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const value = startValue + (target - startValue) * easeOutQuart;
      setCurrent(Math.round(value));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  return current;
}

// Mini KPI card
function MiniKPI({
  label,
  value,
  icon,
  color,
  loading
}: {
  label: string;
  value: number;
  icon: JSX.Element;
  color: string;
  loading?: boolean;
}) {
  const animatedValue = useAnimatedNumber(value);

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl animate-pulse">
        <div className="w-9 h-9 bg-slate-700 rounded-lg" />
        <div className="flex-1">
          <div className="h-3 bg-slate-700 rounded w-12 mb-1" />
          <div className="h-5 bg-slate-700 rounded w-16" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800/70 transition-colors">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-white font-mono tabular-nums">
          {animatedValue.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// Calculate zone breakdown from aggregated data
function calculateZoneBreakdown(data: AggregatedPickData[]): ZoneBreakdown[] {
  if (!data.length) {
    return [
      { tier: 'hot', count: 0, totalPicks: 0, percentage: 0, color: getVelocityColor('hot') },
      { tier: 'warm', count: 0, totalPicks: 0, percentage: 0, color: getVelocityColor('warm') },
      { tier: 'cold', count: 0, totalPicks: 0, percentage: 0, color: getVelocityColor('cold') },
    ];
  }

  // Sort by picks and calculate percentiles
  const sorted = [...data].sort((a, b) => b.total_picks - a.total_picks);
  const zones: Record<VelocityTier, { count: number; totalPicks: number }> = {
    hot: { count: 0, totalPicks: 0 },
    warm: { count: 0, totalPicks: 0 },
    cold: { count: 0, totalPicks: 0 },
  };

  sorted.forEach((item, index) => {
    const percentile = ((sorted.length - index) / sorted.length) * 100;
    const tier = getVelocityTier(percentile);
    zones[tier].count++;
    zones[tier].totalPicks += item.total_picks;
  });

  const totalPicks = data.reduce((sum, d) => sum + d.total_picks, 0);

  return (['hot', 'warm', 'cold'] as VelocityTier[]).map(tier => ({
    tier,
    count: zones[tier].count,
    totalPicks: zones[tier].totalPicks,
    percentage: totalPicks > 0 ? (zones[tier].totalPicks / totalPicks) * 100 : 0,
    color: getVelocityColor(tier),
  }));
}

// Get top movers (highest velocity locations)
function getTopMovers(data: AggregatedPickData[], limit: number = 3) {
  return [...data]
    .sort((a, b) => b.total_picks - a.total_picks)
    .slice(0, limit)
    .map((item, index) => ({
      name: item.element_name,
      picks: item.total_picks,
      rank: index + 1,
    }));
}

// Mini donut tooltip
const MiniTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ZoneBreakdown }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded px-2 py-1 shadow-xl text-xs">
        <span className="capitalize text-white">{data.tier}</span>
        <span className="text-slate-400 ml-1">{data.percentage.toFixed(0)}%</span>
      </div>
    );
  }
  return null;
};

export function AnalyticsSidebar({
  totalPicks,
  totalLocations,
  layoutCount,
  aggregatedData = [],
  loading
}: AnalyticsSidebarProps) {
  const zoneBreakdown = useMemo(() => calculateZoneBreakdown(aggregatedData), [aggregatedData]);
  const topMovers = useMemo(() => getTopMovers(aggregatedData), [aggregatedData]);
  const chartData = useMemo(() => zoneBreakdown.filter(z => z.totalPicks > 0), [zoneBreakdown]);

  const hasData = totalPicks > 0;

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Analytics</h2>
          <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Overview</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-3 mb-6">
        <MiniKPI
          label="Total Picks"
          value={totalPicks}
          color="#06b6d4"
          loading={loading}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <MiniKPI
          label="Locations"
          value={totalLocations}
          color="#8b5cf6"
          loading={loading}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          }
        />
        <MiniKPI
          label="Layouts"
          value={layoutCount}
          color="#10b981"
          loading={loading}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
            </svg>
          }
        />
      </div>

      {/* Zone Chart + Top Movers */}
      {hasData ? (
        <>
          {/* Mini Zone Chart */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Zone Distribution</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 relative flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={22}
                      outerRadius={36}
                      paddingAngle={2}
                      dataKey="totalPicks"
                      stroke="transparent"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<MiniTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {zoneBreakdown.map(zone => (
                  <div key={zone.tier} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: zone.color }}
                    />
                    <span className="text-slate-400 capitalize flex-1">{zone.tier}</span>
                    <span className="text-slate-300 font-mono">{zone.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Movers */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Top Movers</span>
            </div>
            <div className="space-y-2">
              {topMovers.map(item => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 p-2 bg-slate-800/30 rounded-lg"
                >
                  <span className="w-5 h-5 bg-amber-500/20 text-amber-400 rounded text-xs font-mono flex items-center justify-center">
                    {item.rank}
                  </span>
                  <span className="flex-1 text-sm text-slate-300 truncate">{item.name}</span>
                  <span className="text-xs font-mono text-slate-400">{item.picks.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* No Data State */
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm text-slate-400 mb-1">Awaiting data...</p>
          <p className="text-xs text-slate-500">Upload picks to see analytics</p>
        </div>
      )}

      {/* Dashboard Link */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <Link
          href="/dashboard"
          className="w-full px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-sm font-mono rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          View Full Dashboard
        </Link>
      </div>
    </div>
  );
}
