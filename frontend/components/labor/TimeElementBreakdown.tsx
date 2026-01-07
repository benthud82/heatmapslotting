'use client';

import { useState, useEffect } from 'react';

interface TimeElement {
  hours: number;
  percent: number;
  label: string;
}

interface TimeBreakdownData {
  hasData: boolean;
  message?: string;
  totalPicks: number;
  totalWalkDistanceFeet: number;
  totalEstimatedHours: number;
  estimatedLaborCost: number;
  elements: {
    walk: TimeElement;
    pick: TimeElement;
    tote: TimeElement;
    scan: TimeElement;
    allowance: TimeElement;
  } | null;
  standards: {
    pickItemSeconds: number;
    toteTimeSeconds: number;
    scanTimeSeconds: number;
    walkSpeedFpm: number;
    pfdAllowancePercent: number;
  } | null;
}

interface TimeElementBreakdownProps {
  data: TimeBreakdownData | null;
  loading?: boolean;
  onConfigure?: () => void;
}

// Color mapping for each element
const ELEMENT_COLORS = {
  walk: { bg: 'bg-amber-500', text: 'text-amber-400', label: 'Walk to Location' },
  pick: { bg: 'bg-cyan-500', text: 'text-cyan-400', label: 'Pick Item' },
  tote: { bg: 'bg-purple-500', text: 'text-purple-400', label: 'Place in Tote' },
  scan: { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'Scan/Confirm' },
  allowance: { bg: 'bg-slate-500', text: 'text-slate-400', label: 'PFD Allowance' },
};

export default function TimeElementBreakdown({
  data,
  loading = false,
  onConfigure,
}: TimeElementBreakdownProps) {
  const [animatedPercents, setAnimatedPercents] = useState<Record<string, number>>({});

  // Animate the bars on mount
  useEffect(() => {
    if (data?.elements) {
      const elements = data.elements;
      const timer = setTimeout(() => {
        setAnimatedPercents({
          walk: elements.walk.percent,
          pick: elements.pick.percent,
          tote: elements.tote.percent,
          scan: elements.scan.percent,
          allowance: elements.allowance.percent,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!data?.hasData || !data.elements) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Time Element Breakdown</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm max-w-md">
            {data?.message || 'No pick data available. Upload pick data to see how picking time breaks down into walk, pick, tote, and scan components.'}
          </p>
        </div>
      </div>
    );
  }

  const { elements, totalPicks, totalEstimatedHours, estimatedLaborCost, standards } = data;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Time Element Breakdown</h2>
          <p className="text-sm text-slate-400">How picking time is distributed across activities</p>
        </div>
        {onConfigure && (
          <button
            onClick={onConfigure}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configure
          </button>
        )}
      </div>

      {/* Hero Summary */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 rounded-xl p-6 mb-6 border border-slate-700/50">
        <div className="text-center">
          <p className="text-sm text-slate-400 mb-2">
            For <span className="text-cyan-400 font-mono font-bold">{totalPicks.toLocaleString()}</span> picks
          </p>
          <p className="text-3xl font-bold text-white">
            Estimated Completion: <span className="text-amber-400">{totalEstimatedHours.toFixed(1)} hrs</span>
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Estimated Labor Cost: <span className="text-emerald-400 font-mono">${estimatedLaborCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </p>
        </div>
      </div>

      {/* Visual Bar Chart */}
      <div className="mb-6">
        <div className="flex h-12 rounded-lg overflow-hidden bg-slate-800/50">
          {(['walk', 'pick', 'tote', 'scan', 'allowance'] as const).map((key) => {
            const element = elements[key];
            const color = ELEMENT_COLORS[key];
            const width = animatedPercents[key] || 0;

            return (
              <div
                key={key}
                className={`${color.bg} transition-all duration-700 ease-out flex items-center justify-center relative group`}
                style={{ width: `${width}%` }}
              >
                {width > 10 && (
                  <span className="text-xs font-bold text-white/90">
                    {element.percent.toFixed(0)}%
                  </span>
                )}
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-slate-700">
                  <p className="font-bold text-white">{color.label}</p>
                  <p className="text-slate-400">{element.hours.toFixed(2)} hrs ({element.percent.toFixed(1)}%)</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Breakdown Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(['walk', 'pick', 'tote', 'scan', 'allowance'] as const).map((key) => {
          const element = elements[key];
          const color = ELEMENT_COLORS[key];

          return (
            <ElementCard
              key={key}
              label={color.label}
              hours={element.hours}
              percent={element.percent}
              color={color.bg}
              textColor={color.text}
              isHighlighted={key === 'walk' && element.percent > 35}
            />
          );
        })}
      </div>

      {/* Walk Warning */}
      {elements.walk.percent > 35 && (
        <div className="mt-4 p-4 bg-amber-900/20 border border-amber-700/30 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-400">High Walk Time Detected</p>
            <p className="text-xs text-amber-400/70">
              Walk time is {elements.walk.percent.toFixed(0)}% of total picking time (target: &lt;35%).
              Consider reviewing slotting opportunities to reduce picker travel distance.
            </p>
          </div>
        </div>
      )}

      {/* Current Standards Summary */}
      {standards && (
        <div className="mt-6 pt-4 border-t border-slate-800">
          <p className="text-xs font-mono text-slate-500 mb-2">Current Time Standards</p>
          <div className="flex flex-wrap gap-3 text-xs text-slate-400">
            <span>Pick: <span className="text-white font-mono">{standards.pickItemSeconds}s</span></span>
            <span>Tote: <span className="text-white font-mono">{standards.toteTimeSeconds}s</span></span>
            <span>Scan: <span className="text-white font-mono">{standards.scanTimeSeconds}s</span></span>
            <span>Walk: <span className="text-white font-mono">{standards.walkSpeedFpm} fpm</span></span>
            <span>PFD: <span className="text-white font-mono">{standards.pfdAllowancePercent.toFixed(0)}%</span></span>
          </div>
        </div>
      )}
    </div>
  );
}

// Element Card Component
interface ElementCardProps {
  label: string;
  hours: number;
  percent: number;
  color: string;
  textColor: string;
  isHighlighted?: boolean;
}

function ElementCard({ label, hours, percent, color, textColor, isHighlighted }: ElementCardProps) {
  return (
    <div
      className={`bg-slate-800/50 rounded-xl p-4 border ${
        isHighlighted ? 'border-amber-500/50' : 'border-slate-700/50'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <p className="text-xs text-slate-400 truncate">{label}</p>
      </div>
      <p className={`text-xl font-bold ${textColor}`}>{hours.toFixed(2)}</p>
      <p className="text-xs text-slate-500">hours ({percent.toFixed(1)}%)</p>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-6 w-48 bg-slate-700 rounded mb-2" />
          <div className="h-4 w-64 bg-slate-700 rounded" />
        </div>
      </div>

      {/* Hero */}
      <div className="bg-slate-800/50 rounded-xl p-6 mb-6">
        <div className="text-center">
          <div className="h-4 w-32 bg-slate-700 rounded mx-auto mb-3" />
          <div className="h-8 w-56 bg-slate-700 rounded mx-auto" />
        </div>
      </div>

      {/* Bar */}
      <div className="h-12 rounded-lg bg-slate-800/50 mb-6" />

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="h-3 w-16 bg-slate-700 rounded mb-3" />
            <div className="h-6 w-12 bg-slate-700 rounded mb-1" />
            <div className="h-3 w-20 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
