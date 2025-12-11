'use client';

import { useState } from 'react';
import { PeriodComparison, formatDateDisplay } from '@/lib/dashboardUtils';

interface TimeComparisonProps {
  comparison: PeriodComparison;
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  currentPeriodDates?: { start: string; end: string };
  previousPeriodDates?: { start: string; end: string };
  onPeriodChange?: (period: 'week' | 'month' | 'quarter' | 'custom') => void;
  selectedPeriod?: 'week' | 'month' | 'quarter' | 'custom';
  loading?: boolean;
}

// Delta indicator component
function DeltaIndicator({ value, percent, inverse = false }: { value: number; percent: number; inverse?: boolean }) {
  const isPositive = inverse ? value < 0 : value > 0;
  const isNeutral = value === 0;
  
  if (isNeutral) {
    return (
      <span className="text-slate-500 text-sm font-mono">—</span>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
      <svg 
        className={`w-4 h-4 ${value > 0 ? '' : 'rotate-180'}`}
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
      <span className="text-sm font-mono tabular-nums">
        {value > 0 ? '+' : ''}{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}
      </span>
      <span className="text-xs text-slate-500">({percent > 0 ? '+' : ''}{percent.toFixed(1)}%)</span>
    </div>
  );
}

// Comparison metric row
function ComparisonRow({ 
  label, 
  currentValue, 
  previousValue, 
  delta, 
  deltaPercent,
  format = 'number',
  inverse = false
}: { 
  label: string;
  currentValue: number | string;
  previousValue: number | string;
  delta: number;
  deltaPercent: number;
  format?: 'number' | 'decimal' | 'string';
  inverse?: boolean;
}) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    if (format === 'decimal') return val.toFixed(1);
    return val.toLocaleString();
  };

  return (
    <div className="grid grid-cols-4 gap-4 py-3 border-b border-slate-800 last:border-0 items-center">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="text-right">
        <span className="text-sm font-mono font-bold text-white tabular-nums">
          {formatValue(currentValue)}
        </span>
      </div>
      <div className="text-right">
        <span className="text-sm font-mono text-slate-500 tabular-nums">
          {formatValue(previousValue)}
        </span>
      </div>
      <div className="text-right">
        {typeof delta === 'number' && (
          <DeltaIndicator value={delta} percent={deltaPercent} inverse={inverse} />
        )}
      </div>
    </div>
  );
}

// Period selector button
function PeriodButton({ 
  label, 
  value, 
  selected, 
  onClick 
}: { 
  label: string;
  value: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-mono rounded-lg transition-colors ${
        selected
          ? 'bg-cyan-600 text-white'
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

export default function TimeComparison({ 
  comparison, 
  currentPeriodLabel, 
  previousPeriodLabel,
  currentPeriodDates,
  previousPeriodDates,
  onPeriodChange,
  selectedPeriod = 'week',
  loading 
}: TimeComparisonProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (loading) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="animate-pulse">
          <div className="h-5 bg-slate-700 rounded w-48 mb-6"></div>
          <div className="flex gap-2 mb-6">
            <div className="h-10 bg-slate-700 rounded w-24"></div>
            <div className="h-10 bg-slate-700 rounded w-24"></div>
            <div className="h-10 bg-slate-700 rounded w-24"></div>
          </div>
          <div className="space-y-4">
            <div className="h-12 bg-slate-700 rounded"></div>
            <div className="h-12 bg-slate-700 rounded"></div>
            <div className="h-12 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Period Comparison
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg 
              className={`w-5 h-5 transition-transform ${isExpanded ? '' : 'rotate-180'}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>

        {/* Period Selector */}
        {onPeriodChange && (
          <div className="flex flex-wrap gap-2">
            <PeriodButton 
              label="This Week" 
              value="week" 
              selected={selectedPeriod === 'week'} 
              onClick={() => onPeriodChange('week')} 
            />
            <PeriodButton 
              label="This Month" 
              value="month" 
              selected={selectedPeriod === 'month'} 
              onClick={() => onPeriodChange('month')} 
            />
            <PeriodButton 
              label="This Quarter" 
              value="quarter" 
              selected={selectedPeriod === 'quarter'} 
              onClick={() => onPeriodChange('quarter')} 
            />
          </div>
        )}
      </div>

      {/* Comparison Content */}
      {isExpanded && (
        <div className="p-6">
          {/* Period Labels */}
          <div className="grid grid-cols-4 gap-4 mb-4 text-xs font-mono uppercase tracking-wider text-slate-500">
            <div>Metric</div>
            <div className="text-right">
              <div className="text-cyan-400">{currentPeriodLabel}</div>
              {currentPeriodDates && (
                <div className="text-[10px] text-slate-600 mt-0.5">
                  {formatDateDisplay(currentPeriodDates.start)} - {formatDateDisplay(currentPeriodDates.end)}
                </div>
              )}
            </div>
            <div className="text-right">
              <div>{previousPeriodLabel}</div>
              {previousPeriodDates && (
                <div className="text-[10px] text-slate-600 mt-0.5">
                  {formatDateDisplay(previousPeriodDates.start)} - {formatDateDisplay(previousPeriodDates.end)}
                </div>
              )}
            </div>
            <div className="text-right">Change</div>
          </div>

          {/* Comparison Rows */}
          <div>
            <ComparisonRow
              label="Total Picks"
              currentValue={comparison.current.totalPicks}
              previousValue={comparison.previous.totalPicks}
              delta={comparison.deltas.totalPicks}
              deltaPercent={comparison.deltas.totalPicksPercent}
            />
            <ComparisonRow
              label="Active Locations"
              currentValue={comparison.current.activeLocations}
              previousValue={comparison.previous.activeLocations}
              delta={comparison.deltas.activeLocations}
              deltaPercent={comparison.deltas.activeLocationsPercent}
            />
            <ComparisonRow
              label="Avg Picks/Location"
              currentValue={comparison.current.avgPicksPerLocation}
              previousValue={comparison.previous.avgPicksPerLocation}
              delta={comparison.deltas.avgPicksPerLocation}
              deltaPercent={comparison.deltas.avgPicksPerLocationPercent}
              format="decimal"
            />
            <ComparisonRow
              label="Top Performer"
              currentValue={comparison.current.topPerformer}
              previousValue={comparison.previous.topPerformer}
              delta={0}
              deltaPercent={0}
              format="string"
            />
          </div>

          {/* Summary Insight */}
          <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                comparison.deltas.totalPicksPercent > 0 
                  ? 'bg-emerald-500/20' 
                  : comparison.deltas.totalPicksPercent < 0
                    ? 'bg-red-500/20'
                    : 'bg-slate-700'
              }`}>
                {comparison.deltas.totalPicksPercent > 0 ? (
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ) : comparison.deltas.totalPicksPercent < 0 ? (
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-300">
                  {comparison.deltas.totalPicksPercent > 10 ? (
                    <>
                      <span className="text-emerald-400 font-bold">Strong growth!</span> Pick volume increased by{' '}
                      <span className="font-mono text-white">{comparison.deltas.totalPicksPercent.toFixed(1)}%</span>{' '}
                      compared to the previous period.
                    </>
                  ) : comparison.deltas.totalPicksPercent > 0 ? (
                    <>
                      <span className="text-cyan-400 font-bold">Steady growth.</span> Pick volume is up{' '}
                      <span className="font-mono text-white">{comparison.deltas.totalPicksPercent.toFixed(1)}%</span>{' '}
                      from the previous period.
                    </>
                  ) : comparison.deltas.totalPicksPercent < -10 ? (
                    <>
                      <span className="text-red-400 font-bold">Significant decline.</span> Pick volume decreased by{' '}
                      <span className="font-mono text-white">{Math.abs(comparison.deltas.totalPicksPercent).toFixed(1)}%</span>.
                      Review for seasonal patterns or issues.
                    </>
                  ) : comparison.deltas.totalPicksPercent < 0 ? (
                    <>
                      <span className="text-amber-400 font-bold">Slight decline.</span> Pick volume is down{' '}
                      <span className="font-mono text-white">{Math.abs(comparison.deltas.totalPicksPercent).toFixed(1)}%</span>{' '}
                      from the previous period.
                    </>
                  ) : (
                    <>
                      <span className="text-slate-400 font-bold">No change.</span> Pick volume remains consistent with the previous period.
                    </>
                  )}
                </p>
                {comparison.current.topPerformer !== comparison.previous.topPerformer && 
                 comparison.current.topPerformer !== '-' && 
                 comparison.previous.topPerformer !== '-' && (
                  <p className="text-xs text-slate-500 mt-2">
                    Top performer changed from <span className="text-slate-400">{comparison.previous.topPerformer}</span> to{' '}
                    <span className="text-cyan-400">{comparison.current.topPerformer}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






