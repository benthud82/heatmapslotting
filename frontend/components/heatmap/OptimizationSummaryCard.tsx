'use client';

import React, { useState } from 'react';

interface OptimizationSummaryCardProps {
  // Top N loaded items savings
  loadedSavingsFeet: number;
  loadedOpportunityCount: number;
  // Full optimization potential (all items)
  totalSavingsFeet: number;
  totalOpportunityCount: number;
  // Callbacks
  onStartTour: () => void;
  isActive?: boolean;
}

export default function OptimizationSummaryCard({
  loadedSavingsFeet,
  loadedOpportunityCount,
  totalSavingsFeet,
  totalOpportunityCount,
  onStartTour,
  isActive = false,
}: OptimizationSummaryCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Time conversions (264 ft/min = 3 mph walking speed)
  const totalMinutes = Math.round(totalSavingsFeet / 264);
  const loadedMinutes = Math.round(loadedSavingsFeet / 264);

  const formatTime = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${mins} min`;
  };

  // Calculate percentage of total that's immediately actionable
  const capturedPercent = totalSavingsFeet > 0
    ? Math.round((loadedSavingsFeet / totalSavingsFeet) * 100)
    : 0;

  // Collapsed view - compact summary
  if (isCollapsed) {
    return (
      <div
        className="px-4 py-3 rounded-xl border-2 border-amber-400 bg-slate-800 cursor-pointer hover:border-amber-300 hover:bg-slate-700 transition-all shadow-lg shadow-amber-500/20"
        onClick={() => setIsCollapsed(false)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-amber-400 uppercase tracking-wide block">Walk Optimization</span>
              <span className="font-mono text-xs text-emerald-400 block">
                {totalSavingsFeet.toLocaleString()} ft potential
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div
      data-tour="optimization-summary"
      className="rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-600/20 via-slate-800 to-slate-900 overflow-hidden shadow-xl shadow-amber-500/25 w-[280px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500/20 to-transparent border-b border-amber-500/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide">
              Walk Optimization
            </h3>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(true);
          }}
          className="w-7 h-7 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          title="Collapse"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-3">

        {/* FULL OPPORTUNITY - Hero Section */}
        <div className="p-4 bg-slate-900/80 rounded-xl border border-emerald-500/40 relative overflow-hidden">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-emerald-400/80 uppercase tracking-wider font-medium">
                Full Optimization Potential
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {totalOpportunityCount} items
              </div>
            </div>

            <div className="text-center py-2">
              <div className="font-mono text-4xl font-bold text-emerald-400 leading-none tracking-tight">
                {totalSavingsFeet.toLocaleString()}
                <span className="text-xl text-emerald-500/80 ml-1">ft</span>
              </div>
              <div className="font-mono text-base text-white/90 mt-1.5">
                ≈ {formatTime(totalMinutes)} saved daily
              </div>
            </div>
          </div>
        </div>

        {/* TOP N ACTIONABLE - Secondary Section */}
        <div className="p-3 bg-slate-800/60 rounded-lg border border-amber-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] text-amber-400 uppercase tracking-wider font-medium">
                Ready Now
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Top {loadedOpportunityCount}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="font-mono text-xl font-bold text-white">
                {loadedSavingsFeet.toLocaleString()}
              </span>
              <span className="text-sm text-slate-400 ml-1">ft</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              ≈ {formatTime(loadedMinutes)}
            </span>
          </div>

          {/* Progress bar showing captured vs total */}
          <div className="mt-3">
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${capturedPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-slate-500">
                {capturedPercent}% of total opportunity
              </span>
              <span className="text-[9px] text-slate-500">
                +{(totalOpportunityCount - loadedOpportunityCount).toLocaleString()} more available
              </span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onStartTour}
          disabled={isActive}
          data-tour="start-optimization"
          className={`w-full py-3 px-4 rounded-xl font-mono text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            isActive
              ? 'bg-amber-500/50 text-slate-900/70 cursor-default'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {isActive ? 'Optimization Active' : 'Start Optimization'}
        </button>
      </div>
    </div>
  );
}
