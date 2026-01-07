'use client';

interface WalkBurdenData {
  hasData: boolean;
  message?: string;
  totalPicks?: number;
  current: {
    distanceFeet: number;
    distanceMiles: number;
    timeMinutes: number;
    timeHours: number;
    percentOfShift: number;
    avgDistPerPick: number;
    dailyCost: number;
  } | null;
  optimal: {
    distanceFeet: number;
    distanceMiles: number;
    avgDistPerPick: number;
  } | null;
  potentialSavings: {
    distanceFeet: number;
    distanceMiles: number;
    timeMinutes: number;
    dailyDollars: number;
    annualDollars: number;
  } | null;
  targetWalkPercent: number;
}

interface WalkBurdenCardProps {
  data: WalkBurdenData | null;
  loading?: boolean;
  onViewReslotting?: () => void;
}

export default function WalkBurdenCard({
  data,
  loading = false,
  onViewReslotting,
}: WalkBurdenCardProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!data?.hasData || !data.current) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Walk Burden Analysis</h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 mb-3 rounded-full bg-slate-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">{data?.message || 'No walk data available.'}</p>
        </div>
      </div>
    );
  }

  const { current, optimal, potentialSavings, targetWalkPercent, totalPicks } = data;
  const isOverTarget = current.percentOfShift > targetWalkPercent;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Walk Burden Analysis</h2>
          <p className="text-sm text-slate-400">Deep dive into picker travel distance</p>
        </div>
        {potentialSavings && potentialSavings.dailyDollars > 0 && (
          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
            <span className="text-xs font-mono text-emerald-400">
              ${potentialSavings.annualDollars.toLocaleString()}/year potential
            </span>
          </div>
        )}
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Daily Walk Distance */}
        <MetricCard
          label="Daily Walk Distance"
          value={`${current.distanceMiles.toFixed(2)}`}
          unit="miles"
          subValue={`${current.distanceFeet.toLocaleString()} ft`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />

        {/* Walk Time % of Shift */}
        <MetricCard
          label="Walk Time % of Shift"
          value={current.percentOfShift.toFixed(0)}
          unit="%"
          subValue={`Target: <${targetWalkPercent}%`}
          isWarning={isOverTarget}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* Avg Distance Per Pick */}
        <MetricCard
          label="Avg Distance Per Pick"
          value={current.avgDistPerPick.toFixed(1)}
          unit="ft (RT)"
          subValue={optimal ? `Optimal: ${optimal.avgDistPerPick.toFixed(1)} ft` : 'No optimal data'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          }
        />

        {/* Daily Walk Cost */}
        <MetricCard
          label="Daily Walk Cost"
          value={`$${current.dailyCost.toFixed(2)}`}
          unit=""
          subValue={`${current.timeMinutes.toFixed(0)} min / ${current.timeHours.toFixed(1)} hrs`}
          color="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Walk Time Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-mono text-slate-500 uppercase">Walk Time as % of Shift</p>
          <p className={`text-xs font-mono ${isOverTarget ? 'text-amber-400' : 'text-emerald-400'}`}>
            {current.percentOfShift.toFixed(1)}% / {targetWalkPercent}% target
          </p>
        </div>
        <div className="h-4 bg-slate-800 rounded-full overflow-hidden relative">
          {/* Target marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10"
            style={{ left: `${Math.min(targetWalkPercent, 100)}%` }}
          />
          {/* Current value bar */}
          <div
            className={`h-full transition-all duration-700 ease-out ${
              isOverTarget ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
            }`}
            style={{ width: `${Math.min(current.percentOfShift, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-600">0%</span>
          <span className="text-xs text-slate-600">100%</span>
        </div>
      </div>

      {/* Potential Savings Section */}
      {potentialSavings && potentialSavings.dailyDollars > 0 && (
        <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-emerald-400 mb-3">Potential Savings (if reslotted)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-emerald-400/60">Distance Saved</p>
                  <p className="font-mono text-emerald-300">{potentialSavings.distanceMiles.toFixed(2)} mi/day</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-400/60">Time Saved</p>
                  <p className="font-mono text-emerald-300">{potentialSavings.timeMinutes.toFixed(0)} min/day</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-400/60">Daily Savings</p>
                  <p className="font-mono text-emerald-300">${potentialSavings.dailyDollars.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-400/60">Annual Savings</p>
                  <p className="font-mono text-emerald-300 font-bold">${potentialSavings.annualDollars.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Reslotting Link */}
      {onViewReslotting && (
        <button
          onClick={onViewReslotting}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          View Reslotting Opportunities
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      )}

      {/* Total Picks Footer */}
      {totalPicks && (
        <p className="text-xs text-slate-600 text-center mt-4">
          Based on {totalPicks.toLocaleString()} picks
        </p>
      )}
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  subValue?: string;
  color?: 'default' | 'emerald';
  isWarning?: boolean;
  icon?: React.ReactNode;
}

function MetricCard({ label, value, unit, subValue, color = 'default', isWarning = false, icon }: MetricCardProps) {
  const valueColor = isWarning
    ? 'text-amber-400'
    : color === 'emerald'
    ? 'text-emerald-400'
    : 'text-white';

  return (
    <div className={`bg-slate-800/50 rounded-xl p-4 border ${isWarning ? 'border-amber-500/30' : 'border-slate-700/50'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-slate-500">{icon}</span>
        <p className="text-xs text-slate-500 truncate">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>
        {value}
        {unit && <span className="text-sm font-normal text-slate-500 ml-1">{unit}</span>}
      </p>
      {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-6 w-40 bg-slate-700 rounded mb-2" />
          <div className="h-4 w-56 bg-slate-700 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="h-3 w-20 bg-slate-700 rounded mb-3" />
            <div className="h-7 w-16 bg-slate-700 rounded mb-1" />
            <div className="h-3 w-24 bg-slate-700 rounded" />
          </div>
        ))}
      </div>

      <div className="mb-6">
        <div className="h-3 w-32 bg-slate-700 rounded mb-2" />
        <div className="h-4 bg-slate-800 rounded-full" />
      </div>
    </div>
  );
}
