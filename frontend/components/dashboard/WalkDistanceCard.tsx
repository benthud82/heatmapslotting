'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { WalkDistanceData } from '@/lib/types';

interface WalkDistanceCardProps {
  data: WalkDistanceData | null;
  loading?: boolean;
  previousPeriodData?: WalkDistanceData | null;
}

// Format large numbers with K/M suffix
function formatDistance(feet: number): string {
  if (feet >= 5280) {
    const miles = feet / 5280;
    return `${miles.toFixed(2)} mi`;
  }
  if (feet >= 1000) {
    return `${(feet / 1000).toFixed(1)}K ft`;
  }
  return `${feet.toLocaleString()} ft`;
}

// Format time
function formatTime(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  return `${minutes}m`;
}

export default function WalkDistanceCard({ data, loading, previousPeriodData }: WalkDistanceCardProps) {
  // Calculate trend vs previous period
  const trend = useMemo(() => {
    if (!data || !previousPeriodData || previousPeriodData.totalDistanceFeet === 0) {
      return null;
    }
    const diff = data.totalDistanceFeet - previousPeriodData.totalDistanceFeet;
    const percent = (diff / previousPeriodData.totalDistanceFeet) * 100;
    return { diff, percent, isReduction: diff < 0 };
  }, [data, previousPeriodData]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="animate-pulse">
          <div className="h-5 bg-slate-700 rounded w-36 mb-6"></div>
          <div className="h-12 bg-slate-700 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-slate-700 rounded"></div>
            <div className="h-16 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show setup prompt if no markers configured
  if (!data || data.missingMarkers) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <h3 className="text-white font-bold">Walk Distance</h3>
        </div>

        <div className="text-center py-6">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h4 className="text-white font-medium mb-2">Setup Required</h4>
          <p className="text-slate-400 text-sm mb-4 max-w-xs mx-auto">
            Add route markers in the Designer to calculate walk distance for your picks.
          </p>

          {/* Missing markers checklist */}
          {data?.missingMarkers && (
            <div className="flex flex-col items-center gap-2 mb-4 text-xs">
              <div className={`flex items-center gap-2 ${data.missingMarkers.startPoint ? 'text-slate-500' : 'text-emerald-400'}`}>
                {data.missingMarkers.startPoint ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span>Start Point</span>
              </div>
              <div className={`flex items-center gap-2 ${data.missingMarkers.stopPoint ? 'text-slate-500' : 'text-emerald-400'}`}>
                {data.missingMarkers.stopPoint ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span>Stop Point</span>
              </div>
              <div className={`flex items-center gap-2 ${data.missingMarkers.cartParking ? 'text-slate-500' : 'text-emerald-400'}`}>
                {data.missingMarkers.cartParking ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span>Cart Parking</span>
              </div>
            </div>
          )}

          <Link
            href="/designer"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-sm font-mono rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Route Markers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold flex items-center gap-2 text-lg">
          <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Walk Distance Analysis
        </h3>
        {trend && (
          <span className={`text-sm font-mono px-3 py-1 rounded-full ${trend.isReduction
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
            {trend.isReduction ? '↓' : '↑'} {Math.abs(trend.percent).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider">Total Walk Distance</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-white font-mono tracking-tight">
              {formatDistance(data.totalDistanceFeet ?? 0)}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-2">
            Estimated time: <span className="text-slate-300 font-medium">{formatTime(data.estimatedMinutes ?? 0)}</span> at 3mph
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400 text-sm">Cart Travel</span>
              <span className="text-white font-mono font-medium">{formatDistance(data.cartTravelDistFeet ?? 0)}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${Math.min(100, ((data.cartTravelDistFeet ?? 0) / (data.totalDistanceFeet || 1)) * 100)}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400 text-sm">Pedestrian Walking</span>
              <span className="text-white font-mono font-medium">{formatDistance(data.pedestrianTravelDistFeet ?? 0)}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(100, ((data.pedestrianTravelDistFeet ?? 0) / (data.totalDistanceFeet || 1)) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Visits</p>
          <p className="text-2xl text-white font-mono font-bold">
            {(data.visitCount ?? 0).toLocaleString()}
          </p>
          <p className="text-slate-500 text-xs mt-1">Unique stops</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Picks</p>
          <p className="text-2xl text-white font-mono font-bold">
            {(data.totalPicks ?? 0).toLocaleString()}
          </p>
          <p className="text-slate-500 text-xs mt-1">Units picked</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Avg / Visit</p>
          <p className="text-2xl text-white font-mono font-bold">
            {(data.avgDistancePerPickFeet ?? 0).toFixed(0)} <span className="text-sm font-sans text-slate-400">ft</span>
          </p>
          <p className="text-slate-500 text-xs mt-1">Per stop</p>
        </div>
      </div>

      {/* Daily Breakdown Hint */}
      {data.dailyBreakdown && data.dailyBreakdown.length > 0 && (
        <div className="mt-auto pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 text-center">
            Analysis based on {data.dailyBreakdown.length} days of activity efficiently routed.
          </p>
        </div>
      )}
    </div>
  );
}



