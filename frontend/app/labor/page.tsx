'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import Header from '@/components/Header';
import LayoutManager from '@/components/designer/LayoutManager';
import { layoutApi, picksApi } from '@/lib/api';
import { Layout, AggregatedPickData } from '@/lib/types';
import {
  laborStandardsApi,
  performanceApi,
  timeBreakdownApi,
  walkBurdenApi,
  trendsApi,
  LaborStandards,
  TimeBreakdownData,
  WalkBurdenData,
  TrendData,
  PerformanceRecord,
  ROIRecommendation,
} from '@/lib/laborApi';
import LaborConfigModal from '@/components/labor/LaborConfigModal';
import TimeElementBreakdown from '@/components/labor/TimeElementBreakdown';
import WalkBurdenCard from '@/components/labor/WalkBurdenCard';
import TrendAnalysisCard from '@/components/labor/TrendAnalysisCard';
import ActualVsEstimatedCard from '@/components/labor/ActualVsEstimatedCard';
import StaffingCalculatorCard from '@/components/labor/StaffingCalculatorCard';
import ROISimulatorCard from '@/components/labor/ROISimulatorCard';
import ROIDetailModal from '@/components/labor/ROIDetailModal';

export default function LaborPage() {
  // Auth guard - redirects to /landing if not authenticated
  const { loading: authLoading } = useAuthGuard();

  const router = useRouter();

  // Layout state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const layout = layouts.find(l => l.id === currentLayoutId) || null;

  // Data state
  const [aggregatedData, setAggregatedData] = useState<AggregatedPickData[]>([]);
  const [laborStandards, setLaborStandards] = useState<LaborStandards | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // New productivity data
  const [timeBreakdown, setTimeBreakdown] = useState<TimeBreakdownData | null>(null);
  const [walkBurden, setWalkBurden] = useState<WalkBurdenData | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);

  // Modal state
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Performance tracking state
  const [performanceRecords, setPerformanceRecords] = useState<PerformanceRecord[]>([]);

  // ROI modal state
  const [showROIModal, setShowROIModal] = useState(false);
  const [roiRecommendations, setRoiRecommendations] = useState<ROIRecommendation[]>([]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Reload when layout changes
  useEffect(() => {
    if (currentLayoutId) {
      loadLayoutData(currentLayoutId);
    }
  }, [currentLayoutId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const layoutsData = await layoutApi.getLayouts();
      setLayouts(layoutsData);

      let activeId = currentLayoutId;
      if (!activeId && layoutsData.length > 0) {
        activeId = layoutsData[0].id;
        setCurrentLayoutId(activeId);
      }

      if (activeId) {
        await loadLayoutData(activeId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Labor page load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLayoutData = async (layoutId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data in parallel
      const [dates, picks, standards, performance] = await Promise.all([
        picksApi.getDates(layoutId),
        picksApi.getAggregated(layoutId),
        laborStandardsApi.get(layoutId).catch(() => null),
        performanceApi.getHistory(layoutId).catch(() => []),
      ]);

      setAvailableDates(Array.isArray(dates) ? dates : []);
      setAggregatedData(Array.isArray(picks) ? picks : []);
      setLaborStandards(standards);
      setPerformanceRecords(Array.isArray(performance) ? performance : []);

      // Fetch new productivity data
      const [breakdown, burden, trends] = await Promise.all([
        timeBreakdownApi.get(layoutId).catch(() => null),
        walkBurdenApi.get(layoutId).catch(() => null),
        trendsApi.get(layoutId).catch(() => null),
      ]);

      setTimeBreakdown(breakdown);
      setWalkBurden(burden);
      setTrendData(trends);
    } catch (err) {
      console.error('Failed to load layout data:', err);
      setError('Failed to load labor data for this layout');
    } finally {
      setLoading(false);
    }
  };

  const handleLayoutChange = useCallback((layoutId: string) => {
    setCurrentLayoutId(layoutId);
  }, []);

  const handleStandardsSaved = useCallback((newStandards: LaborStandards) => {
    setLaborStandards(newStandards);
    // Reload productivity data with new standards
    if (currentLayoutId) {
      Promise.all([
        timeBreakdownApi.get(currentLayoutId).catch(() => null),
        walkBurdenApi.get(currentLayoutId).catch(() => null),
      ]).then(([breakdown, burden]) => {
        setTimeBreakdown(breakdown);
        setWalkBurden(burden);
      });
    }
  }, [currentLayoutId]);

  const handleRecordPerformance = useCallback(async (data: { date: string; actualPicks: number; actualHours: number }) => {
    if (!currentLayoutId) return;

    try {
      const record = await performanceApi.create(currentLayoutId, {
        performance_date: data.date,
        actual_picks: data.actualPicks,
        actual_hours: data.actualHours,
      });

      setPerformanceRecords((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const existing = safePrev.findIndex((r) => r.performance_date === record.performance_date);
        if (existing >= 0) {
          const updated = [...safePrev];
          updated[existing] = record;
          return updated;
        }
        return [...safePrev, record];
      });

      // Refresh trend data
      const trends = await trendsApi.get(currentLayoutId).catch(() => null);
      setTrendData(trends);
    } catch (err) {
      throw err;
    }
  }, [currentLayoutId]);

  const handleViewROIDetails = useCallback((recommendations: ROIRecommendation[]) => {
    setRoiRecommendations(recommendations);
    setShowROIModal(true);
  }, []);

  const handleViewReslotting = useCallback(() => {
    if (currentLayoutId) {
      router.push(`/heatmap?layout=${currentLayoutId}&tab=reslot`);
    }
  }, [currentLayoutId, router]);

  const hasData = aggregatedData.length > 0;

  // Loading state
  if (authLoading || (loading && !layouts.length)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-900/50 animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
          <p className="text-lg font-mono font-bold text-slate-400 tracking-wider">LOADING PRODUCTIVITY DATA</p>
          <p className="text-sm text-slate-600 mt-2">Preparing your picking productivity dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <Header
        title="Picking Productivity"
        subtitle="Time Elements & Efficiency"
      >
        <LayoutManager
          layouts={layouts}
          currentLayoutId={currentLayoutId}
          onLayoutSelect={handleLayoutChange}
          readOnly={true}
        />
      </Header>

      {/* Main Content */}
      <main className="flex-1 p-6 w-full max-w-[1800px] mx-auto">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-300">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* No Layout Selected */}
        {!currentLayoutId ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-slate-800">
              <svg className="w-12 h-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Layout Selected</h2>
            <p className="text-slate-400 text-center max-w-md mb-8">
              Create a warehouse layout first to access picking productivity features.
            </p>
            <Link
              href="/designer"
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-cyan-900/30"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Layout
            </Link>
          </div>
        ) : !hasData ? (
          /* Empty State - No Pick Data */
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-slate-800">
              <svg className="w-12 h-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Pick Data Yet</h2>
            <p className="text-slate-400 text-center max-w-md mb-8">
              Upload pick data to unlock productivity features including time element analysis,
              walk burden tracking, and efficiency trends.
            </p>
            <div className="flex gap-4">
              <Link
                href="/upload"
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-cyan-900/30"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Pick Data
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-mono rounded-xl transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                View Dashboard
              </Link>
            </div>
          </div>
        ) : (
          /* ===== REDESIGNED PRODUCTIVITY DASHBOARD ===== */
          <div className="space-y-6">

            {/* Row 1: Time Element Breakdown (Hero Section) */}
            <TimeElementBreakdown
              data={timeBreakdown}
              loading={loading}
              onConfigure={() => setShowConfigModal(true)}
            />

            {/* Row 2: Actual vs Estimated + Efficiency Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActualVsEstimatedCard
                estimatedHours={timeBreakdown?.totalEstimatedHours ?? null}
                totalPicks={timeBreakdown?.totalPicks ?? null}
                targetEfficiency={laborStandards?.target_efficiency_percent || 85}
                loading={loading}
                onRecordPerformance={handleRecordPerformance}
              />
              <TrendAnalysisCard
                data={trendData}
                targetEfficiency={laborStandards?.target_efficiency_percent || 85}
                loading={loading}
              />
            </div>

            {/* Row 3: Walk Burden Analysis (Full Width) */}
            <WalkBurdenCard
              data={walkBurden}
              loading={loading}
              onViewReslotting={handleViewReslotting}
            />

            {/* Row 4: Staffing Calculator + ROI Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {currentLayoutId && (
                <StaffingCalculatorCard
                  layoutId={currentLayoutId}
                  avgDailyPicks={
                    aggregatedData.length > 0
                      ? Math.round(
                          aggregatedData.reduce((sum, d) => sum + d.total_picks, 0) /
                            Math.max(availableDates.length, 1)
                        )
                      : 1000
                  }
                  loading={loading}
                />
              )}

              {currentLayoutId && (
                <ROISimulatorCard
                  layoutId={currentLayoutId}
                  loading={loading}
                  onViewDetails={handleViewROIDetails}
                />
              )}
            </div>

            {/* Standards Config Footer */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Current Standards Summary */}
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <span className="text-slate-500 font-mono">Current Standards:</span>
                  <div className="flex flex-wrap gap-4 text-slate-400">
                    <span>
                      Pick: <span className="text-white font-mono">{laborStandards?.pick_item_seconds ?? 12}s</span>
                    </span>
                    <span>
                      Tote: <span className="text-white font-mono">{laborStandards?.tote_time_seconds ?? 8}s</span>
                    </span>
                    <span>
                      Scan: <span className="text-white font-mono">{laborStandards?.scan_time_seconds ?? 5}s</span>
                    </span>
                    <span>
                      Walk: <span className="text-white font-mono">{laborStandards?.walk_speed_fpm ?? 264} fpm</span>
                    </span>
                    <span>
                      PFD: <span className="text-white font-mono">
                        {((laborStandards?.fatigue_allowance_percent ?? 10) + (laborStandards?.delay_allowance_percent ?? 5)).toFixed(0)}%
                      </span>
                    </span>
                    <span>
                      Rate: <span className="text-emerald-400 font-mono">${laborStandards?.hourly_labor_rate ?? 18}/hr</span>
                    </span>
                  </div>
                </div>

                {/* Configure Button */}
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configure Standards
                </button>
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="font-mono">
                  Layout: <span className="text-slate-300">{layout?.name || 'None'}</span>
                </span>
                <span className="font-mono">
                  Data range: <span className="text-slate-300">{availableDates.length} days</span>
                </span>
              </div>
              <div className="flex gap-3">
                <Link
                  href={currentLayoutId ? `/heatmap?layout=${currentLayoutId}` : '/heatmap'}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  View Heatmap
                </Link>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analytics
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Labor Config Modal */}
      {currentLayoutId && (
        <LaborConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          layoutId={currentLayoutId}
          currentStandards={laborStandards}
          onSave={handleStandardsSaved}
        />
      )}

      {/* ROI Detail Modal */}
      <ROIDetailModal
        isOpen={showROIModal}
        onClose={() => setShowROIModal(false)}
        recommendations={roiRecommendations}
      />
    </div>
  );
}
