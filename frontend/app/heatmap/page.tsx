'use client';

import { useEffect, useState, useMemo } from 'react';
import WarehouseCanvas from '@/components/WarehouseCanvas';
import HeatmapSidebar from '@/components/HeatmapSidebar';
import HeatmapGuide from '@/components/HeatmapGuide';
import HeatmapElementModal from '@/components/heatmap/HeatmapElementModal';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import DateRangePicker from '@/components/DateRangePicker';
import { layoutApi, picksApi, routeMarkersApi } from '@/lib/api';
import { WarehouseElement, Layout, AggregatedPickData, RouteMarker, AggregatedItemPickData } from '@/lib/types';
import LayoutManager from '@/components/designer/LayoutManager';
import { analyzeVelocity } from '@/lib/dashboardUtils';
import { useRef } from 'react';
import SkuDetailModal from '@/components/heatmap/SkuDetailModal';


export default function Heatmap() {
  const canvasRef = useRef<any>(null);
  // ... (existing state)

  // Helper to calculate and add round trip distance to data
  const enrichDataWithDistance = (data: AggregatedPickData[], markers: RouteMarker[], elementsList: WarehouseElement[]): AggregatedPickData[] => {
    if (!data.length || !markers.length) return data;

    // Extract parking spots (prioritize cart_parking, fallback to start_point)
    let parkingSpots = markers
      .filter(m => m.marker_type === 'cart_parking')
      .map(m => ({ x: Number(m.x_coordinate), y: Number(m.y_coordinate) }));

    // Fallback to start point if no cart parking
    if (parkingSpots.length === 0) {
      parkingSpots = markers
        .filter(m => m.marker_type === 'start_point')
        .map(m => ({ x: Number(m.x_coordinate), y: Number(m.y_coordinate) }));
    }

    if (parkingSpots.length === 0) return data;

    // Map elements for analysis
    const elementsForAnalysis = elementsList.map(el => ({
      id: el.id,
      x: Number(el.x_coordinate),
      y: Number(el.y_coordinate)
    }));

    // Run analysis to get distances
    const analysis = analyzeVelocity(data, undefined, elementsForAnalysis, parkingSpots);

    // Merge back
    return data.map(item => {
      const analyzed = analysis.find(a => a.elementId === item.element_id);
      if (analyzed) {
        // currentDistance is in pixels. Round trip = dist * 2. Feet = pixels / 12.
        // Even if distance is 0, we can define it
        const distPx = analyzed.currentDistance || 0;
        return {
          ...item,
          roundTripDistanceFeet: Math.round((distPx * 2) / 12)
        };
      }
      return item;
    });
  };

  // ... (loadLayoutDetails and loadPickData updates will be in next steps or follow)

  const router = useRouter();
  const searchParams = useSearchParams();

  const handleUploadClick = () => {
    router.push('/upload');
  };

  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);

  // Selected element state (from URL param or canvas click)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
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
  const [showRouteMarkers, setShowRouteMarkers] = useState(true);
  const [showDistances, setShowDistances] = useState(false);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSku, setSelectedSku] = useState<AggregatedItemPickData | null>(null);
  const [selectedSkuRank, setSelectedSkuRank] = useState<number | undefined>(undefined);

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
  }, [startDate, endDate, routeMarkers]);

  // Handle element selection from URL param
  useEffect(() => {
    const selectId = searchParams.get('select');
    if (selectId && elements.some(el => el.id === selectId)) {
      setSelectedElementId(selectId);
    }

    // Fit all elements when layout is loaded
    if (elements.length > 0) {
      setTimeout(() => {
        canvasRef.current?.fitToElements();
      }, 100);
    }
  }, [elements, searchParams]);

  const loadLayouts = async () => {
    try {
      setLoading(true);
      const layoutsData = await layoutApi.getLayouts();
      setLayouts(layoutsData);

      // Check for layout ID from URL parameter first
      const urlLayoutId = searchParams.get('layout');

      if (urlLayoutId && layoutsData.some(l => l.id === urlLayoutId)) {
        // Use layout from URL param
        setCurrentLayoutId(urlLayoutId);
      } else if (layoutsData.length > 0 && !currentLayoutId) {
        // Fall back to first layout
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
      let markersData: RouteMarker[] = [];
      try {
        markersData = await routeMarkersApi.getMarkers(layoutId);
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
        setAggregatedData(enrichDataWithDistance(recentDayData, markersData, elementsData));
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
      setAggregatedData(enrichDataWithDistance(data, routeMarkers, elements));
      setHasPickData(data.length > 0);
    } catch (err) {
      console.error('Failed to load pick data:', err);
    }
  };

  // Handlers
  const handleElementClick = (elementId: string) => {
    setSelectedElementId(elementId);
  };
  const handleElementCreate = () => { };
  const handleElementUpdate = () => { };
  const handleCanvasClick = () => {
    // Clear selection when clicking on canvas background
    setSelectedElementId(null);
  };

  // Clear element selection
  const handleClearSelection = () => {
    setSelectedElementId(null);
    setShowDetailModal(false);
  };

  // View element details in modal
  const handleViewDetails = () => {
    setShowDetailModal(true);
  };

  // Get selected element data for modal
  const selectedElementData = useMemo(() => {
    if (!selectedElementId) return null;
    return aggregatedData.find(d => d.element_id === selectedElementId) || null;
  }, [selectedElementId, aggregatedData]);

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
          <button
            onClick={() => setShowRouteMarkers(!showRouteMarkers)}
            className={`px-4 py-2 font-mono text-sm rounded transition-colors flex items-center gap-2 border ${showRouteMarkers
              ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
              }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">{showRouteMarkers ? 'HIDE MARKERS' : 'SHOW MARKERS'}</span>
          </button>
          <button
            onClick={() => setShowDistances(!showDistances)}
            className={`px-4 py-2 font-mono text-sm rounded transition-colors flex items-center gap-2 border ${showDistances
              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
              }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.806-.98l-3.253-1.626M15 10v10" />
            </svg>
            <span className="hidden sm:inline">{showDistances ? 'HIDE DISTANCES' : 'SHOW DISTANCES'}</span>
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
            ref={canvasRef}
            elements={elements}
            selectedType={null}
            selectedElementIds={selectedElementId ? [selectedElementId] : []}
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
            showDistances={showDistances}
            onDistancesToggle={() => setShowDistances(prev => !prev)}
          />
        </div>

        {/* Sidebar - Fixed width on right */}
        {(hasPickData || availableDates.length > 0) ? (
          <HeatmapSidebar
            minPicks={minPicks}
            maxPicks={maxPicks}
            aggregatedData={aggregatedData}
            totalPicks={totalPicks}
            selectedElementId={selectedElementId}
            layoutId={currentLayoutId}
            onClearSelection={handleClearSelection}
            startDate={startDate}
            endDate={endDate}
            onViewDetails={handleViewDetails}
            onSkuClick={(item, rank) => {
              setSelectedSku(item);
              setSelectedSkuRank(rank);
            }}
          />
        ) : (
          <div className="h-full border-l border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6 min-w-[280px] w-[320px]">
            <HeatmapGuide onUploadClick={handleUploadClick} />
          </div>
        )}
      </div>

      {/* Element Detail Modal */}
      {showDetailModal && selectedElementData && (
        <HeatmapElementModal
          element={selectedElementData}
          layoutId={currentLayoutId}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* SKU Detail Modal */}
      {selectedSku && (
        <SkuDetailModal
          item={selectedSku}
          rank={selectedSkuRank}
          startDate={startDate}
          endDate={endDate}
          onClose={() => {
            setSelectedSku(null);
            setSelectedSkuRank(undefined);
          }}
        />
      )}
    </div>
  );
}
