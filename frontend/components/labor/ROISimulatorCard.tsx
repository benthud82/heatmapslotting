'use client';

import { useState, useEffect, useCallback } from 'react';
import { ROICalculation, roiApi } from '@/lib/laborApi';

interface ROISimulatorCardProps {
  layoutId: string;
  loading?: boolean;
  onViewDetails?: (recommendations: ROICalculation['recommendations']) => void;
}

export default function ROISimulatorCard({
  layoutId,
  loading: initialLoading = false,
  onViewDetails,
}: ROISimulatorCardProps) {
  const [roiData, setRoiData] = useState<ROICalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadROIData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await roiApi.calculate(layoutId);
      setRoiData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate ROI');
    } finally {
      setLoading(false);
    }
  }, [layoutId]);

  useEffect(() => {
    loadROIData();
  }, [loadROIData]);

  const handleExport = async () => {
    try {
      setExporting(true);
      await roiApi.exportCSV(layoutId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (initialLoading || loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-slate-800 rounded mb-4" />
          <div className="h-48 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-2">ROI Simulator</h2>
        <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
        <button
          onClick={loadROIData}
          className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-sm rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!roiData || roiData.implementation.itemsToReslot === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-2">ROI Simulator</h2>
        <p className="text-sm text-slate-400 mb-6">
          Project savings from reslotting recommendations
        </p>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg className="w-12 h-12 text-slate-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-500 text-sm">No reslotting recommendations</p>
          <p className="text-slate-600 text-xs mt-1">
            Your layout appears to be optimally slotted
          </p>
        </div>
      </div>
    );
  }

  const { currentState, projectedState, savings, implementation } = roiData;

  // Calculate reduction percentages
  const walkReduction = currentState.dailyWalkFeet > 0
    ? ((currentState.dailyWalkFeet - projectedState.dailyWalkFeet) / currentState.dailyWalkFeet) * 100
    : 0;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">ROI Simulator</h2>
          <p className="text-sm text-slate-400">Project savings from reslotting</p>
        </div>
        <div className="flex gap-2">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(roiData.recommendations)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg transition-colors"
            >
              View Details
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg transition-colors flex items-center gap-1"
          >
            {exporting ? (
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            Export
          </button>
        </div>
      </div>

      {/* Before/After Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs font-mono text-slate-500 uppercase mb-2">Current State</p>
          <p className="text-lg font-bold text-white">
            {currentState.dailyWalkFeet.toLocaleString(undefined, { maximumFractionDigits: 0 })} ft/day
          </p>
          <p className="text-sm text-slate-400">
            {currentState.dailyWalkMinutes.toFixed(1)} min/day walk
          </p>
        </div>
        <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-500/30">
          <p className="text-xs font-mono text-emerald-400 uppercase mb-2">After Reslotting</p>
          <p className="text-lg font-bold text-emerald-400">
            {projectedState.dailyWalkFeet.toLocaleString(undefined, { maximumFractionDigits: 0 })} ft/day
          </p>
          <p className="text-sm text-emerald-300/70">
            {walkReduction.toFixed(0)}% reduction
          </p>
        </div>
      </div>

      {/* Savings Grid */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <div className="text-center p-3 bg-slate-800/30 rounded-lg">
          <p className="text-xs font-mono text-slate-500">Daily</p>
          <p className="text-lg font-bold text-emerald-400">
            ${savings.dailyDollars.toFixed(2)}
          </p>
        </div>
        <div className="text-center p-3 bg-slate-800/30 rounded-lg">
          <p className="text-xs font-mono text-slate-500">Weekly</p>
          <p className="text-lg font-bold text-emerald-400">
            ${savings.weeklyDollars.toFixed(2)}
          </p>
        </div>
        <div className="text-center p-3 bg-slate-800/30 rounded-lg">
          <p className="text-xs font-mono text-slate-500">Monthly</p>
          <p className="text-lg font-bold text-emerald-400">
            ${savings.monthlyDollars.toFixed(2)}
          </p>
        </div>
        <div className="text-center p-3 bg-slate-800/30 rounded-lg">
          <p className="text-xs font-mono text-slate-500">Annual</p>
          <p className="text-lg font-bold text-emerald-400">
            ${savings.annualDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Implementation Section */}
      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-mono text-slate-400">Implementation</p>
          <p className="text-xs text-slate-500">
            {implementation.itemsToReslot} items to relocate
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-slate-500">Est. Time</p>
            <p className="text-sm font-bold text-white">
              {implementation.estimatedHours.toFixed(1)} hrs
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Est. Cost</p>
            <p className="text-sm font-bold text-white">
              ${implementation.estimatedCost.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Payback</p>
            <p className="text-sm font-bold text-emerald-400">
              {implementation.paybackDays} days
            </p>
          </div>
        </div>

        {/* Payback Progress Bar */}
        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((30 / implementation.paybackDays) * 100, 100)}%`,
            }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1 text-center">
          {implementation.paybackDays <= 30
            ? 'Quick payback - ROI positive within 30 days'
            : `${implementation.paybackDays} days to recover implementation cost`}
        </p>
      </div>
    </div>
  );
}
