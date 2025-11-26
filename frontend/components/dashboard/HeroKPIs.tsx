'use client';

import { useEffect, useState } from 'react';
import { KPIData } from '@/lib/dashboardUtils';

interface HeroKPIsProps {
  data: KPIData;
  loading?: boolean;
}

// Animated counter hook
function useAnimatedNumber(target: number, duration: number = 1000): number {
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
      
      // Easing function for smooth animation
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

// Trend indicator component
function TrendBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  
  const isPositive = value > 0;
  
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full ${
      isPositive 
        ? 'bg-emerald-500/20 text-emerald-400' 
        : 'bg-red-500/20 text-red-400'
    }`}>
      <svg 
        className={`w-3 h-3 ${isPositive ? '' : 'rotate-180'}`} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
      {isPositive ? '+' : ''}{value.toFixed(1)}{suffix}
    </span>
  );
}

// Individual KPI Card
function KPICard({ 
  title, 
  value, 
  trend, 
  subtitle, 
  icon, 
  accentColor,
  loading,
  tooltip
}: { 
  title: string;
  value: number;
  trend?: number;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor: string;
  loading?: boolean;
  tooltip?: string;
}) {
  const animatedValue = useAnimatedNumber(value, 800);

  if (loading) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-24 mb-4"></div>
          <div className="h-8 bg-slate-700 rounded w-32 mb-2"></div>
          <div className="h-3 bg-slate-700 rounded w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
      {/* Accent gradient */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 opacity-80"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />
      
      {/* Background glow effect */}
      <div 
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ background: accentColor }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">
              {title}
            </span>
            {tooltip && (
              <div className="relative group/tooltip">
                <svg className="w-4 h-4 text-slate-500 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 w-64 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 shadow-xl">
                  {tooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
              </div>
            )}
          </div>
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${accentColor}20` }}
          >
            <span style={{ color: accentColor }}>{icon}</span>
          </div>
        </div>

        {/* Value */}
        <div className="flex items-end gap-3 mb-2">
          <span className="text-4xl font-bold text-white font-mono tabular-nums">
            {animatedValue.toLocaleString()}
          </span>
          {trend !== undefined && <TrendBadge value={trend} />}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-sm text-slate-500 font-mono">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export default function HeroKPIs({ data, loading }: HeroKPIsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Picks */}
      <KPICard
        title="Total Picks"
        value={data.totalPicks}
        trend={data.totalPicksTrend}
        subtitle="vs previous period"
        accentColor="#06b6d4"
        loading={loading}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
      />

      {/* Active Locations */}
      <KPICard
        title="Active Locations"
        value={data.activeLocations}
        subtitle={`${data.utilizationPercent}% utilization (${data.totalLocations} total)`}
        accentColor="#8b5cf6"
        loading={loading}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
      />

      {/* Avg Picks/Location */}
      <KPICard
        title="Avg Picks/Location"
        value={data.avgPicksPerLocation}
        trend={data.avgPicksTrend}
        subtitle="pick density"
        accentColor="#10b981"
        loading={loading}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
      />
    </div>
  );
}

