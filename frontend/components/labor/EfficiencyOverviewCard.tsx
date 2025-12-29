'use client';

import { EfficiencyMetrics, LaborStandards } from '@/lib/laborApi';
import EfficiencyGauge from './EfficiencyGauge';

interface EfficiencyOverviewCardProps {
  efficiency: EfficiencyMetrics | null;
  standards: LaborStandards | null;
  loading?: boolean;
  onConfigure: () => void;
}

export default function EfficiencyOverviewCard({
  efficiency,
  standards,
  loading = false,
  onConfigure,
}: EfficiencyOverviewCardProps) {
  const targetEfficiency = standards?.target_efficiency_percent ?? 85;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Efficiency Overview</h2>
          <p className="text-sm text-slate-400">Labor standards and performance metrics</p>
        </div>
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
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: KPIs */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Total Picks"
              value={efficiency?.totalPicks?.toLocaleString()}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
            />
            <KPICard
              label="Standard Hours"
              value={efficiency?.standardHours?.toFixed(1)}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <KPICard
              label="Walk Distance"
              value={
                efficiency?.totalWalkDistanceFeet
                  ? `${(efficiency.totalWalkDistanceFeet / 1000).toFixed(1)}k ft`
                  : undefined
              }
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
            <KPICard
              label="Est. Labor Cost"
              value={
                efficiency?.estimatedLaborCost
                  ? `$${efficiency.estimatedLaborCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : undefined
              }
              color="emerald"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Right: Efficiency Gauge */}
          <div className="flex items-center justify-center bg-slate-800/30 rounded-xl border border-slate-700/30 py-6">
            <EfficiencyGauge
              efficiency={efficiency?.efficiencyPercent || null}
              target={targetEfficiency}
              size="lg"
            />
          </div>
        </div>
      )}

      {/* Time Breakdown */}
      {efficiency?.breakdown && !loading && (
        <div className="mt-6 pt-6 border-t border-slate-800">
          <h3 className="text-sm font-mono text-slate-400 mb-3">Time Breakdown (Hours)</h3>
          <div className="grid grid-cols-4 gap-4">
            <BreakdownItem
              label="Pick Time"
              value={efficiency.breakdown.pickTimeHours}
              color="bg-cyan-500"
            />
            <BreakdownItem
              label="Walk Time"
              value={efficiency.breakdown.walkTimeHours}
              color="bg-amber-500"
            />
            <BreakdownItem
              label="Pack Time"
              value={efficiency.breakdown.packTimeHours}
              color="bg-purple-500"
            />
            <BreakdownItem
              label="Allowances"
              value={efficiency.breakdown.allowanceHours}
              color="bg-slate-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  label: string;
  value?: string;
  color?: 'default' | 'emerald';
  icon?: React.ReactNode;
}

function KPICard({ label, value, color = 'default', icon }: KPICardProps) {
  const valueColor = color === 'emerald' ? 'text-emerald-400' : 'text-white';

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-slate-500">{icon}</span>
        <p className="text-xs font-mono text-slate-500 uppercase">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value || '—'}</p>
    </div>
  );
}

// Breakdown Item Component
interface BreakdownItemProps {
  label: string;
  value: number;
  color: string;
}

function BreakdownItem({ label, value, color }: BreakdownItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-mono text-white">{value.toFixed(2)}</p>
      </div>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
      <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="h-3 w-16 bg-slate-700 rounded mb-3" />
            <div className="h-8 w-20 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center bg-slate-800/30 rounded-xl py-6">
        <div className="w-32 h-32 rounded-full border-8 border-slate-700" />
      </div>
    </div>
  );
}
