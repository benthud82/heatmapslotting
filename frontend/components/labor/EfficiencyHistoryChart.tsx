'use client';

import { useState } from 'react';
import { PerformanceRecord, performanceApi } from '@/lib/laborApi';

interface EfficiencyHistoryChartProps {
  records: PerformanceRecord[];
  targetEfficiency: number;
  layoutId: string;
  onDelete: (date: string) => void;
  loading?: boolean;
}

export default function EfficiencyHistoryChart({
  records,
  targetEfficiency,
  layoutId,
  onDelete,
  loading = false,
}: EfficiencyHistoryChartProps) {
  const [deletingDate, setDeletingDate] = useState<string | null>(null);

  // Ensure records is always an array
  const safeRecords = Array.isArray(records) ? records : [];

  // Sort records by date
  const sortedRecords = [...safeRecords].sort(
    (a, b) => new Date(a.performance_date).getTime() - new Date(b.performance_date).getTime()
  );

  // Calculate chart dimensions
  const maxEfficiency = Math.max(100, ...sortedRecords.map((r) => Number(r.efficiency_percent) || 0));

  const handleDelete = async (date: string) => {
    try {
      setDeletingDate(date);
      await performanceApi.delete(layoutId, date);
      onDelete(date);
    } catch (err) {
      console.error('Failed to delete record:', err);
    } finally {
      setDeletingDate(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-slate-800 rounded mb-4" />
          <div className="h-48 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (safeRecords.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">Efficiency History</h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="w-12 h-12 text-slate-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-slate-500 text-sm">No performance data recorded yet</p>
          <p className="text-slate-600 text-xs mt-1">
            Use the form above to record daily actuals
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Efficiency History</h3>
          <p className="text-sm text-slate-400">{safeRecords.length} recorded days</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-400">Above Target</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-slate-400">Near Target</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-400">Below Target</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-48 mb-4">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs font-mono text-slate-500">
          <span>{maxEfficiency.toFixed(0)}%</span>
          <span>{(maxEfficiency / 2).toFixed(0)}%</span>
          <span>0%</span>
        </div>

        {/* Chart area */}
        <div className="ml-14 h-full relative bg-slate-800/30 rounded-lg border border-slate-700/30 overflow-hidden">
          {/* Target line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-emerald-500/50"
            style={{ bottom: `${(targetEfficiency / maxEfficiency) * 100}%` }}
          >
            <span className="absolute right-2 -top-4 text-xs text-emerald-500">
              Target {targetEfficiency}%
            </span>
          </div>

          {/* Bars */}
          <div className="absolute inset-0 flex items-end justify-around px-2 pb-1">
            {sortedRecords.map((record) => {
              const eff = Number(record.efficiency_percent) || 0;
              const height = (eff / maxEfficiency) * 100;
              const color =
                eff >= targetEfficiency
                  ? 'bg-emerald-500'
                  : eff >= targetEfficiency * 0.9
                  ? 'bg-yellow-500'
                  : 'bg-red-500';

              return (
                <div
                  key={record.id}
                  className="flex flex-col items-center group relative"
                  style={{ width: `${100 / Math.max(sortedRecords.length, 7)}%` }}
                >
                  {/* Bar */}
                  <div
                    className={`w-full max-w-8 ${color} rounded-t transition-all duration-300 cursor-pointer hover:opacity-80`}
                    style={{ height: `${height}%`, minHeight: '4px' }}
                    title={`${record.performance_date}: ${eff.toFixed(1)}%`}
                  />

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl text-xs whitespace-nowrap">
                      <p className="font-bold text-white mb-1">
                        {new Date(record.performance_date).toLocaleDateString()}
                      </p>
                      <p className="text-slate-400">
                        Efficiency: <span className="text-white">{eff.toFixed(1)}%</span>
                      </p>
                      <p className="text-slate-400">
                        Picks: <span className="text-white">{record.actual_picks}</span>
                      </p>
                      <p className="text-slate-400">
                        Hours: <span className="text-white">{record.actual_hours}</span>
                      </p>
                      <button
                        onClick={() => handleDelete(record.performance_date)}
                        disabled={deletingDate === record.performance_date}
                        className="mt-2 w-full px-2 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-xs transition-colors"
                      >
                        {deletingDate === record.performance_date ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
        <div className="text-center">
          <p className="text-xs font-mono text-slate-500 uppercase">Average</p>
          <p className="text-lg font-bold text-white">
            {(
              sortedRecords.reduce((sum, r) => sum + (Number(r.efficiency_percent) || 0), 0) /
              sortedRecords.length
            ).toFixed(1)}
            %
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-mono text-slate-500 uppercase">Best</p>
          <p className="text-lg font-bold text-emerald-400">
            {Math.max(...sortedRecords.map((r) => Number(r.efficiency_percent) || 0)).toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-mono text-slate-500 uppercase">Total Picks</p>
          <p className="text-lg font-bold text-white">
            {sortedRecords.reduce((sum, r) => sum + (Number(r.actual_picks) || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
