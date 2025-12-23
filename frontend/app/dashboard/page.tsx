'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import LayoutManager from '@/components/designer/LayoutManager';
import { layoutApi, picksApi, routeMarkersApi } from '@/lib/api';
import { Layout, AggregatedPickData, PickTransaction, WarehouseElement, WalkDistanceData, RouteMarker } from '@/lib/types';
import {
    analyzeVelocity,
    getZoneBreakdown,
    calculateKPIs,
    comparePeriods,
    getDateRangeForPeriod,
    calculateEfficiencyMetrics,
    getTopMoveRecommendations,
    getParetoDistribution,
    identifyCongestionZones,
    VelocityAnalysis,
    KPIData,
    ZoneBreakdown,
    PeriodComparison,
    EfficiencyMetrics,
    ParetoDataPoint,
    CongestionZone,
} from '@/lib/dashboardUtils';

// Import dashboard components
import HeroKPIs from '@/components/dashboard/HeroKPIs';
import ZoneEfficiency from '@/components/dashboard/ZoneEfficiency';
import VelocityTable from '@/components/dashboard/VelocityTable';
import TimeComparison from '@/components/dashboard/TimeComparison';
import WalkDistanceCard from '@/components/dashboard/WalkDistanceCard';
import ActionBoard from '@/components/dashboard/ActionBoard';
import ParetoChart from '@/components/dashboard/ParetoChart';
import CongestionMap from '@/components/dashboard/CongestionMap';
import TrendWatch from '@/components/dashboard/TrendWatch';
import ElementDetailModal from '@/components/dashboard/ElementDetailModal';

type ComparisonPeriod = 'week' | 'month' | 'quarter' | 'custom';

export default function Dashboard() {
    // Layout State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [layouts, setLayouts] = useState<Layout[]>([]);
    const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
    const layout = layouts.find(l => l.id === currentLayoutId) || null;

    // Raw Data State
    const [aggregatedData, setAggregatedData] = useState<AggregatedPickData[]>([]);
    const [previousPeriodData, setPreviousPeriodData] = useState<AggregatedPickData[]>([]);
    const [transactions, setTransactions] = useState<PickTransaction[]>([]);
    const [elements, setElements] = useState<WarehouseElement[]>([]);
    const [availableDates, setAvailableDates] = useState<string[]>([]);

    // Period Selection
    const [selectedPeriod, setSelectedPeriod] = useState<ComparisonPeriod>('week');
    const [currentPeriodDates, setCurrentPeriodDates] = useState<{ start: string; end: string } | null>(null);
    const [previousPeriodDates, setPreviousPeriodDates] = useState<{ start: string; end: string } | null>(null);

    // Walk Distance State
    const [walkDistanceData, setWalkDistanceData] = useState<WalkDistanceData | null>(null);
    const [previousWalkDistanceData, setPreviousWalkDistanceData] = useState<WalkDistanceData | null>(null);

    // Route Markers State (for distance calculations)
    const [routeMarkers, setRouteMarkers] = useState<RouteMarker[]>([]);

    // Modal State
    const [selectedElement, setSelectedElement] = useState<VelocityAnalysis | null>(null);

    // Derived: Cart Parking Spots for distance calculations
    const cartParkingSpots = useMemo(() => {
        return routeMarkers
            .filter(m => m.marker_type === 'cart_parking')
            .map(m => ({ x: Number(m.x_coordinate), y: Number(m.y_coordinate) }));
    }, [routeMarkers]);

    // Derived: Element positions for distance calculations
    const elementPositions = useMemo(() => {
        return elements.map(el => ({
            id: el.id,
            x: Number(el.x_coordinate),
            y: Number(el.y_coordinate)
        }));
    }, [elements]);

    // Derived analytics data
    const velocityAnalysis = useMemo<VelocityAnalysis[]>(() => {
        return analyzeVelocity(aggregatedData, previousPeriodData, elementPositions, cartParkingSpots);
    }, [aggregatedData, previousPeriodData, elementPositions, cartParkingSpots]);

    const zoneBreakdown = useMemo<ZoneBreakdown[]>(() => {
        return getZoneBreakdown(velocityAnalysis);
    }, [velocityAnalysis]);

    const kpiData = useMemo<KPIData>(() => {
        return calculateKPIs(aggregatedData, previousPeriodData, elements.length);
    }, [aggregatedData, previousPeriodData, elements.length]);

    const periodComparison = useMemo<PeriodComparison>(() => {
        return comparePeriods(aggregatedData, previousPeriodData);
    }, [aggregatedData, previousPeriodData]);

    const efficiencyMetrics = useMemo<EfficiencyMetrics>(() => {
        return calculateEfficiencyMetrics(velocityAnalysis, elements.length);
    }, [velocityAnalysis, elements.length]);

    const moveRecommendations = useMemo(() => {
        return getTopMoveRecommendations(velocityAnalysis, 3);
    }, [velocityAnalysis]);

    const paretoData = useMemo<ParetoDataPoint[]>(() => {
        return getParetoDistribution(velocityAnalysis);
    }, [velocityAnalysis]);

    const congestionZones = useMemo<CongestionZone[]>(() => {
        if (elements.length === 0) return [];
        return identifyCongestionZones(
            elements.map(el => ({
                id: el.id,
                label: el.label || '',
                x_coordinate: Number(el.x_coordinate),
                y_coordinate: Number(el.y_coordinate),
            })),
            aggregatedData,
            layout?.canvas_width || 1200,
            layout?.canvas_height || 800,
            10 // 10x10 grid
        );
    }, [elements, aggregatedData, layout]);

    // Load initial data
    useEffect(() => {
        loadData();
    }, []);

    // Reload data when layout changes
    useEffect(() => {
        if (currentLayoutId) {
            loadLayoutData(currentLayoutId);
        }
    }, [currentLayoutId]);

    // Reload when period changes or available dates change
    useEffect(() => {
        if (currentLayoutId && availableDates.length > 0) {
            loadPeriodData(currentLayoutId, selectedPeriod, availableDates);
        }
    }, [selectedPeriod, currentLayoutId, availableDates]);

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
            setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadLayoutData = async (layoutId: string) => {
        try {
            setLoading(true);

            // Fetch layout elements for total count
            const elementsData = await layoutApi.getElements(layoutId);
            setElements(elementsData);

            // Fetch available dates
            const dates = await picksApi.getDates(layoutId);
            setAvailableDates(dates);

            // Fetch transactions for sparkline
            const rawTransactions = await picksApi.getTransactions(layoutId);
            setTransactions(rawTransactions);

            // Fetch route markers for distance calculations
            const markers = await routeMarkersApi.getMarkers(layoutId);
            setRouteMarkers(markers);

            // Period data loading is handled by the useEffect that watches availableDates
            // Clear previous data if no dates available
            if (dates.length === 0) {
                setAggregatedData([]);
                setPreviousPeriodData([]);
                setCurrentPeriodDates(null);
                setPreviousPeriodDates(null);
            }
        } catch (err) {
            console.error('Failed to load layout data:', err);
            setError('Failed to load data for this layout');
        } finally {
            setLoading(false);
        }
    };

    const loadPeriodData = async (layoutId: string, period: ComparisonPeriod, dates?: string[]) => {
        try {
            // Get current and previous period date ranges based on calendar
            const calendarCurrentRange = getDateRangeForPeriod(period === 'custom' ? 'week' : period, 0);
            const calendarPreviousRange = getDateRangeForPeriod(period === 'custom' ? 'week' : period, 1);

            // Check if available dates overlap with calendar ranges
            // If not, use the actual available dates instead
            let currentRange = calendarCurrentRange;
            let previousRange = calendarPreviousRange;

            // Use passed dates or fall back to state
            const datesToUse = dates || availableDates;

            if (datesToUse.length > 0) {
                const sortedDates = [...datesToUse].sort();
                const oldestDate = sortedDates[0];
                const newestDate = sortedDates[sortedDates.length - 1];

                // If the newest available date is before today's period, use available dates
                if (newestDate < calendarCurrentRange.start) {
                    // Use the most recent available dates as "current period"
                    currentRange = { start: oldestDate, end: newestDate };

                    // Calculate a "previous period" as the first half of available data
                    const midIndex = Math.floor(sortedDates.length / 2);
                    if (midIndex > 0) {
                        previousRange = { start: sortedDates[0], end: sortedDates[midIndex - 1] };
                        currentRange = { start: sortedDates[midIndex], end: newestDate };
                    } else {
                        previousRange = { start: oldestDate, end: oldestDate };
                    }
                }
            }

            setCurrentPeriodDates(currentRange);
            setPreviousPeriodDates(previousRange);

            // Fetch data for both periods (including walk distance)
            const [currentData, prevData, walkData, prevWalkData] = await Promise.all([
                picksApi.getAggregated(layoutId, currentRange.start, currentRange.end),
                picksApi.getAggregated(layoutId, previousRange.start, previousRange.end),
                routeMarkersApi.getWalkDistance(layoutId, currentRange.start, currentRange.end).catch(() => null),
                routeMarkersApi.getWalkDistance(layoutId, previousRange.start, previousRange.end).catch(() => null),
            ]);

            setAggregatedData(currentData);
            setPreviousPeriodData(prevData);
            setWalkDistanceData(walkData);
            setPreviousWalkDistanceData(prevWalkData);
        } catch (err) {
            console.error('Failed to load period data:', err);
            // Fallback to all data
            const allData = await picksApi.getAggregated(layoutId);
            setAggregatedData(allData);
            setPreviousPeriodData([]);
            setWalkDistanceData(null);
            setPreviousWalkDistanceData(null);
        }
    };

    const handlePeriodChange = useCallback((period: ComparisonPeriod) => {
        setSelectedPeriod(period);
    }, []);

    // Period labels
    const getPeriodLabels = () => {
        switch (selectedPeriod) {
            case 'week':
                return { current: 'This Week', previous: 'Last Week' };
            case 'month':
                return { current: 'This Month', previous: 'Last Month' };
            case 'quarter':
                return { current: 'This Quarter', previous: 'Last Quarter' };
            default:
                return { current: 'Current', previous: 'Previous' };
        }
    };

    const periodLabels = getPeriodLabels();

    if (loading && !layouts.length) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-900/50 animate-pulse">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-lg font-mono font-bold text-slate-400 tracking-wider">LOADING ANALYTICS</p>
                    <p className="text-sm text-slate-600 mt-2">Preparing your warehouse insights...</p>
                </div>
            </div>
        );
    }

    const hasData = aggregatedData.length > 0 || transactions.length > 0;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* Header */}
            <Header
                title="Analytics Dashboard"
                subtitle="Warehouse Intelligence"
            >
                <LayoutManager
                    layouts={layouts}
                    currentLayoutId={currentLayoutId}
                    onLayoutSelect={setCurrentLayoutId}
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
                        <button
                            onClick={() => setError(null)}
                            className="text-red-400 hover:text-red-300"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {!hasData ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-slate-800">
                            <svg className="w-12 h-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">No Analytics Data Yet</h2>
                        <p className="text-slate-400 text-center max-w-md mb-8">
                            Upload pick data to see powerful analytics including velocity rankings,
                            zone efficiency, and slotting recommendations.
                        </p>
                        <div className="flex gap-4">
                            <Link
                                href="/upload"
                                target="_blank"
                                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-cyan-900/30"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Upload Pick Data
                            </Link>
                            <Link
                                href="/designer"
                                target="_blank"
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-mono rounded-xl transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
                                </svg>
                                Design Layout
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Dashboard Content */
                    <div className="space-y-6">
                        {/* Row 1: Hero KPIs (including Health Score) */}
                        <HeroKPIs data={kpiData} efficiency={efficiencyMetrics} loading={loading} />

                        {/* Row 2: Action Board + Zone Efficiency + Trend Watch */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 xl:col-span-1">
                                <ActionBoard
                                    moveCloser={moveRecommendations.moveCloser}
                                    moveFurther={moveRecommendations.moveFurther}
                                    layoutId={currentLayoutId || undefined}
                                    loading={loading}
                                />
                            </div>
                            <div>
                                <ZoneEfficiency zones={zoneBreakdown} loading={loading} />
                            </div>
                            <div>
                                <TrendWatch
                                    velocityAnalysis={velocityAnalysis}
                                    loading={loading}
                                    limit={5}
                                    onItemClick={(item) => setSelectedElement(item)}
                                />
                            </div>
                        </div>

                        {/* Row 3: Pareto Chart + Congestion Map */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ParetoChart data={paretoData} loading={loading} />
                            <CongestionMap zones={congestionZones} loading={loading} />
                        </div>

                        {/* Row 4: Velocity Table + Walk Distance */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2">
                                <VelocityTable
                                    data={velocityAnalysis}
                                    loading={loading}
                                    onRowClick={(item) => setSelectedElement(item)}
                                />
                            </div>
                            <div className="xl:col-span-1">
                                <WalkDistanceCard
                                    data={walkDistanceData}
                                    loading={loading}
                                    previousPeriodData={previousWalkDistanceData}
                                />
                            </div>
                        </div>

                        {/* Row 5: Time Comparison */}
                        <TimeComparison
                            comparison={periodComparison}
                            currentPeriodLabel={periodLabels.current}
                            previousPeriodLabel={periodLabels.previous}
                            currentPeriodDates={currentPeriodDates || undefined}
                            previousPeriodDates={previousPeriodDates || undefined}
                            onPeriodChange={handlePeriodChange}
                            selectedPeriod={selectedPeriod}
                            loading={loading}
                        />

                        {/* Footer Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-800">
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
                                    href="/heatmap"
                                    target="_blank"
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-sm rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                    View Heatmap
                                </Link>
                                <Link
                                    href="/upload"
                                    target="_blank"
                                    className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 font-mono text-sm rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add More Data
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Element Detail Modal */}
            <ElementDetailModal
                element={selectedElement}
                layoutId={currentLayoutId}
                onClose={() => setSelectedElement(null)}
            />
        </div>
    );
}
