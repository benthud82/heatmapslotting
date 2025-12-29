'use client';

import { useState, useEffect, useCallback } from 'react';
import { StaffingCalculation, staffingApi } from '@/lib/laborApi';

interface StaffingCalculatorCardProps {
  layoutId: string;
  avgDailyPicks?: number; // Historical average for "Average" button
  loading?: boolean;
}

export default function StaffingCalculatorCard({
  layoutId,
  avgDailyPicks = 0,
  loading: initialLoading = false,
}: StaffingCalculatorCardProps) {
  const [forecastedPicks, setForecastedPicks] = useState<number>(0);
  const [periodDays, setPeriodDays] = useState<number>(1);
  const [calculation, setCalculation] = useState<StaffingCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced calculation
  const calculateStaffing = useCallback(async (picks: number, days: number) => {
    if (picks <= 0 || days <= 0) {
      setCalculation(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await staffingApi.calculate(layoutId, picks, days);
      setCalculation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
      setCalculation(null);
    } finally {
      setLoading(false);
    }
  }, [layoutId]);

  // Trigger calculation when inputs change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateStaffing(forecastedPicks, periodDays);
    }, 500);

    return () => clearTimeout(timer);
  }, [forecastedPicks, periodDays, calculateStaffing]);

  // Quick scenario handlers
  const handleLightDay = () => {
    setForecastedPicks(Math.round(avgDailyPicks * 0.7) || 500);
    setPeriodDays(1);
  };

  const handleAverageDay = () => {
    setForecastedPicks(avgDailyPicks || 1000);
    setPeriodDays(1);
  };

  const handleHeavyDay = () => {
    setForecastedPicks(Math.round(avgDailyPicks * 1.5) || 2500);
    setPeriodDays(1);
  };

  if (initialLoading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-slate-800 rounded mb-4" />
          <div className="h-32 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-2">Staffing Calculator</h2>
      <p className="text-sm text-slate-400 mb-6">
        Calculate required headcount from pick forecasts
      </p>

      {/* Input Section */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-mono text-slate-300 mb-1">
            Forecasted Picks
          </label>
          <input
            type="number"
            value={forecastedPicks || ''}
            onChange={(e) => setForecastedPicks(parseInt(e.target.value) || 0)}
            placeholder="Enter picks..."
            min="1"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-mono text-slate-300 mb-1">
            Period (Days)
          </label>
          <input
            type="number"
            value={periodDays || ''}
            onChange={(e) => setPeriodDays(parseInt(e.target.value) || 1)}
            min="1"
            max="30"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Quick Scenario Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={handleLightDay}
          className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg transition-colors"
        >
          Light Day
        </button>
        <button
          onClick={handleAverageDay}
          className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg transition-colors"
        >
          Average
        </button>
        <button
          onClick={handleHeavyDay}
          className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg transition-colors"
        >
          Heavy Day
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <svg className="w-8 h-8 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : calculation ? (
        <div className="space-y-4">
          {/* Headcount Hero */}
          <div className="flex items-center justify-center py-6 bg-slate-800/30 rounded-xl border border-slate-700/30">
            <div className="text-center">
              <p className="text-5xl font-bold text-emerald-400 mb-1">
                {calculation.requiredHeadcount}
              </p>
              <p className="text-sm text-slate-400 font-mono">
                {calculation.requiredHeadcount === 1 ? 'picker needed' : 'pickers needed'}
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <p className="text-xs font-mono text-slate-500 uppercase">Labor Hours</p>
              <p className="text-lg font-bold text-white">
                {calculation.totalLaborHours.toFixed(1)}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <p className="text-xs font-mono text-slate-500 uppercase">Est. Cost</p>
              <p className="text-lg font-bold text-emerald-400">
                ${calculation.estimatedLaborCost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <p className="text-xs font-mono text-slate-500 uppercase">Picks/Person</p>
              <p className="text-lg font-bold text-white">
                {calculation.picksPerPerson.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <p className="text-xs font-mono text-slate-500 uppercase">Utilization</p>
              <p className="text-lg font-bold text-white">
                {calculation.utilizationPercent.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg className="w-12 h-12 text-slate-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-slate-500 text-sm">Enter a forecast to calculate staffing</p>
        </div>
      )}
    </div>
  );
}
