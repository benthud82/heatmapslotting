'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import WarehouseCanvas from '@/components/WarehouseCanvas';
import HeatmapSidebar from '@/components/HeatmapSidebar';
import HeatmapGuide from '@/components/HeatmapGuide';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import DateRangePicker from '@/components/DateRangePicker';
import { layoutApi, picksApi, routeMarkersApi } from '@/lib/api';
import { WarehouseElement, Layout, AggregatedPickData, RouteMarker } from '@/lib/types';
import LayoutManager from '@/components/designer/LayoutManager';

export default function Heatmap() {
  const router = useRouter();

  const handleUploadClick = () => {
    router.push('/upload');
  };

  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const layout = useMemo(() => layouts.find(l => l.id === currentLayoutId) || null, [layouts, currentLayoutId]);
  const [elements, setElements] = useState<WarehouseElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pick data state
  const [pickData, setPickData] = useState<Map<string, number>>(new Map());
  const [aggregatedData, setAggregatedData] = useState<AggregatedPickData[]>([]);
  const [hasPickData, setHasPickData] = useState(false);

  // Available dates state
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // Route markers state
  const [routeMarkers, setRouteMarkers] = useState<RouteMarker[]>([]);
  const [showRouteMarkers, setShowRouteMarkers] = useState(false);

  // Helper function to convert date to YYYY-MM-DD format for date inputs
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    // If it's already in YYYY-MM-DD format, return it
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    // Fallback for other formats (though backend should now return YYYY-MM-DD)
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load initial layouts
  useEffect(() => {
    loadLayouts();
  }, []);

  // Load layout details when currentLayoutId changes
  useEffect(() => {
    if (currentLayoutId) {
      loadLayoutDetails(currentLayoutId);
    }
  }, [currentLayoutId]);

  // Load pick data when date range changes
  useEffect(() => {
    if (hasPickData && currentLayoutId) {
      loadPickData(currentLayoutId);
    }
  }, [startDate, endDate]);

  const loadLayouts = async () => {
    try {
      setLoading(true);
      const layoutsData = await layoutApi.getLayouts();
      setLayouts(layoutsData);

      if (layoutsData.length > 0 && !currentLayoutId) {
        setCurrentLayoutId(layoutsData[0].id);
      } else if (layoutsData.length === 0) {
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load layouts');
      setLoading(false);
    }
  };

  const loadLayoutDetails = async (layoutId: string) => {
    try {
      setLoading(true);

      // Fetch elements for active layout
      const elementsData = await layoutApi.getElements(layoutId);
      setElements(elementsData);

      // Fetch route markers for the layout
      try {
        const markersData = await routeMarkersApi.getMarkers(layoutId);
        setRouteMarkers(markersData);
      } catch (markerErr) {
        console.error('Failed to load route markers:', markerErr);
        setRouteMarkers([]);
      }

      setError(null);

      // Try to load pick data
      const allAggregatedData = await picksApi.getAggregated(layoutId, undefined, undefined);

      if (allAggregatedData.length > 0) {
        // Fetch available dates
        try {
          const dates = await picksApi.getDates(layoutId);
          setAvailableDates(dates);
        } catch (err) {
          console.error('Failed to fetch available dates:', err);
        }

        // Find the most recent date across all elements
        // Since dates are now strings YYYY-MM-DD, we can compare them directly
        const mostRecentDate = allAggregatedData.reduce((latest, item) => {
          return item.last_date > latest ? item.last_date : latest;
        }, allAggregatedData[0].last_date);

        const formattedDate = formatDateForInput(mostRecentDate);

        // Only update dates if they are not already set (to preserve user selection during switching if possible, 
        // but usually we want to reset to latest for the new layout)
        // For now, let's reset to latest for the new layout
        setStartDate(formattedDate);
        setEndDate(formattedDate);

        // Load pick data for the most recent day
        const recentDayData = await picksApi.getAggregated(layoutId, formattedDate, formattedDate);
        const pickMap = new Map<string, number>();
        recentDayData.forEach(item => {
          pickMap.set(item.element_id, item.total_picks);
        });
        setPickData(pickMap);
        setAggregatedData(recentDayData);
        setHasPickData(recentDayData.length > 0);
      } else {
        setPickData(new Map());
        setAggregatedData([]);
        setHasPickData(false);
        setAvailableDates([]);
        setStartDate('');
        setEndDate('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load layout details');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPickData = async (layoutId: string) => {
    if (!layoutId) return;
    try {
      const data = await picksApi.getAggregated(
        layoutId,
        startDate || undefined,
        endDate || undefined
      );

      const pickMap = new Map<string, number>();
      data.forEach(item => {
        pickMap.set(item.element_id, item.total_picks);
      });

      setPickData(pickMap);
      setAggregatedData(data);
      setHasPickData(data.length > 0);
    } catch (err) {
      console.error('Failed to load pick data:', err);
    }
  };

  // No-op handlers
  const handleElementClick = () => { };
  const handleElementCreate = () => { };
  const handleElementUpdate = () => { };
  const handleCanvasClick = () => { };

  // Calculate min/max picks
  const { minPicks, maxPicks, totalPicks } = useMemo(() => {
    if (!pickData || pickData.size === 0) {
      return { minPicks: 0, maxPicks: 0, totalPicks: 0 };
    }
    const pickValues = Array.from(pickData.values());
    return {
      minPicks: Math.min(...pickValues),
      maxPicks: Math.max(...pickValues),
      totalPicks: pickValues.reduce((a, b) => a + b, 0),
    };
  }, [pickData]);

  if (loading && !layouts.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50 animate-spin"></div>
          </div>
          <p className="text-lg font-mono font-bold text-slate-400 tracking-wider">
            LOADING WAREHOUSE HEATMAP
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      <Header
        title="Warehouse Heatmap"
        subtitle="Read-only visualization"
      >
        <div className="flex items-center gap-4">
          <LayoutManager
            layouts={layouts}
            currentLayoutId={currentLayoutId}
            onLayoutSelect={(id) => {
              setCurrentLayoutId(id);
            }}
            // Read-only mode
            readOnly={true}
            onLayoutCreate={() => { }}
            onLayoutRename={() => { }}
            onLayoutDelete={() => { }}
          />
          <button
            onClick={handleUploadClick}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-mono text-sm rounded transition-colors flex items-center gap-2 shadow-lg shadow-green-900/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="hidden sm:inline">UPLOAD PICKS</span>
          </button>
        </div>
      </Header>

      {/* Date Range Filters */}
      {(hasPickData || availableDates.length > 0) && (
        <div className="bg-slate-900 border-b border-slate-800 flex-shrink-0">
          <div className="w-full px-6 py-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-mono text-slate-400">Date Range:</span>
              </div>

              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
                availableDates={availableDates}
              />

              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-mono text-sm rounded transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-950 border-b-2 border-red-500 flex-shrink-0">
          <div className="w-full px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">Error</div>
              <p className="text-sm font-mono text-red-300">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white font-mono text-sm rounded transition-colors"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Full Height Flex Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas Area - Takes remaining space */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden">
          <WarehouseCanvas
            elements={elements}
            selectedType={null}
            selectedElementIds={[]}
            labelDisplayMode="all"
            onElementClick={handleElementClick}
            onElementCreate={handleElementCreate}
            onElementUpdate={handleElementUpdate}
            onCanvasClick={handleCanvasClick}
            canvasWidth={layout?.canvas_width || 1200}
            canvasHeight={layout?.canvas_height || 800}
            isReadOnly={true}
            pickData={hasPickData ? pickData : undefined}
            isHeatmap={true}
            routeMarkers={routeMarkers}
            showRouteMarkers={showRouteMarkers}
            onRouteMarkersToggle={() => setShowRouteMarkers(prev => !prev)}
            onSnappingToggle={() => {}} // No-op for heatmap page
          />
        </div>

        {/* Sidebar - Fixed width on right */}
        {(hasPickData || availableDates.length > 0) ? (
          <HeatmapSidebar
            minPicks={minPicks}
            maxPicks={maxPicks}
            aggregatedData={aggregatedData}
            totalPicks={totalPicks}
          />
        ) : (
          <div className="h-full border-l border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6 min-w-[280px] w-[320px]">
            <HeatmapGuide onUploadClick={handleUploadClick} />
          </div>
        )}
      </div>
    </div>
  );
}
