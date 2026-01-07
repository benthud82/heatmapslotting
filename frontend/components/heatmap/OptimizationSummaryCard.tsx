'use client';

import React, { useState } from 'react';

interface OptimizationSummaryCardProps {
  totalDailySavingsFeet: number;
  opportunityCount: number;
  timeSavingsMinutes: number;
  onStartTour: () => void;
  isActive?: boolean;
}

export default function OptimizationSummaryCard({
  totalDailySavingsFeet,
  opportunityCount,
  timeSavingsMinutes,
  onStartTour,
  isActive = false,
}: OptimizationSummaryCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Convert minutes to hours for display
  const hours = Math.floor(timeSavingsMinutes / 60);
  const minutes = timeSavingsMinutes % 60;
  const timeDisplay = hours > 0
    ? `${hours}h ${minutes}m`
    : `${timeSavingsMinutes} min`;

  // Collapsed view
  if (isCollapsed) {
    return (
      <div
        className="mb-6 px-4 py-3 rounded-xl border-2 border-amber-400 bg-slate-800 cursor-pointer hover:border-amber-300 hover:bg-slate-700 transition-all shadow-lg shadow-amber-500/20"
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
                {totalDailySavingsFeet.toLocaleString()} ft/day savings
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
    <div data-tour="optimization-summary" className="mb-6 rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-600/20 via-slate-800 to-slate-900 overflow-hidden shadow-xl shadow-amber-500/25">
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
            <p className="text-[10px] text-slate-400 font-mono">
              {opportunityCount} reslotting opportunities
            </p>
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
      <div className="p-4">
        {/* Total Savings - Prominent Display */}
        <div className="mb-4 p-4 bg-slate-900/80 rounded-xl border border-emerald-500/30">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 text-center">
            Total Daily Savings
          </div>
          <div className="text-center">
            <div className="font-mono text-3xl font-bold text-emerald-400 leading-none">
              {totalDailySavingsFeet.toLocaleString()}
              <span className="text-lg text-emerald-500 ml-1">ft</span>
            </div>
            <div className="font-mono text-lg text-white mt-1">
              ≈ {timeDisplay} saved
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
