'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import WarehouseCanvas from '@/components/WarehouseCanvas';
import HeatmapLegend from '@/components/HeatmapLegend';
import UploadPicksModal from '@/components/UploadPicksModal';
import { layoutApi, picksApi } from '@/lib/api';
import { WarehouseElement, Layout, AggregatedPickData } from '@/lib/types';

export default function Heatmap() {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [elements, setElements] = useState<WarehouseElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Date range state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pick data state
  const [pickData, setPickData] = useState<Map<string, number>>(new Map());
  const [hasPickData, setHasPickData] = useState(false);

  // Helper function to convert date to YYYY-MM-DD format for date inputs
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    // Extract just the date portion (YYYY-MM-DD) from ISO string or date string
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Load pick data when date range changes
  useEffect(() => {
    if (hasPickData) {
      loadPickData();
    }
  }, [startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [layoutData, elementsData] = await Promise.all([
        layoutApi.getLayout(),
        layoutApi.getElements(),
      ]);
      setLayout(layoutData);
      setElements(elementsData);
      setError(null);

      // Try to load pick data (might be empty if none uploaded yet)
      // First load without date filters to find the most recent date
      const allAggregatedData = await picksApi.getAggregated(undefined, undefined);
      
      if (allAggregatedData.length > 0) {
        // Find the most recent date across all elements
        const mostRecentDate = allAggregatedData.reduce((latest, item) => {
          const itemDate = new Date(item.last_date);
          const latestDate = new Date(latest);
          return itemDate > latestDate ? item.last_date : latest;
        }, allAggregatedData[0].last_date);

        // Set both start and end date to the most recent day (format for date input)
        const formattedDate = formatDateForInput(mostRecentDate);
        setStartDate(formattedDate);
        setEndDate(formattedDate);
        
        // Load pick data for the most recent day (use formatted date for API)
        const recentDayData = await picksApi.getAggregated(formattedDate, formattedDate);
        const pickMap = new Map<string, number>();
        recentDayData.forEach(item => {
          pickMap.set(item.element_id, item.total_picks);
        });
        setPickData(pickMap);
        setHasPickData(recentDayData.length > 0);
      } else {
        // No pick data, load normally
        await loadPickData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPickData = async () => {
    try {
      const aggregatedData = await picksApi.getAggregated(
        startDate || undefined,
        endDate || undefined
      );

      // Convert array to Map<element_id, total_picks>
      const pickMap = new Map<string, number>();
      aggregatedData.forEach(item => {
        pickMap.set(item.element_id, item.total_picks);
      });

      setPickData(pickMap);
      setHasPickData(aggregatedData.length > 0);
    } catch (err) {
      console.error('Failed to load pick data:', err);
      // Don't set error - pick data is optional
    }
  };

  const handleUploadSuccess = () => {
    // Reload pick data after successful upload
    loadPickData();
  };

  // No-op handlers for read-only mode
  const handleElementClick = () => {};
  const handleElementCreate = () => {};
  const handleElementUpdate = () => {};
  const handleCanvasClick = () => {};

  // Calculate min/max picks for legend and heatmap color scaling
  const { minPicks, maxPicks } = useMemo(() => {
    if (!pickData || pickData.size === 0) {
      return { minPicks: 0, maxPicks: 0 };
    }
    const pickValues = Array.from(pickData.values());
    return {
      minPicks: Math.min(...pickValues),
      maxPicks: Math.max(...pickValues),
    };
  }, [pickData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50 animate-spin"></div>
          </div>
          <p className="text-lg font-mono font-bold text-slate-400 tracking-wider">
            LOADING WAREHOUSE HEATMAP
          </p>
          <div className="mt-2 flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-2 border-blue-500 shadow-2xl shadow-blue-900/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo/Icon */}
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
                  </svg>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900"></div>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Warehouse Heatmap
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm font-mono text-blue-400">
                    {layout?.name || 'Primary Layout'}
                  </p>
                  <span className="text-slate-600">•</span>
                  <p className="text-xs font-mono text-slate-500">
                    Read-only visualization
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-mono text-sm rounded transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                UPLOAD PICKS
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-sm rounded transition-colors border border-slate-600"
              >
                ← HOME
              </Link>
              <Link
                href="/designer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-sm rounded transition-colors"
              >
                DESIGNER
              </Link>
            </div>
          </div>

          {/* Date Range Filters - Only show if we have pick data */}
          {hasPickData && (
            <div className="mt-4 border-t border-slate-700 pt-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-mono text-slate-400">Date Range:</span>
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  placeholder="Start date"
                />
                <span className="text-slate-600">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  placeholder="End date"
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
                <div className="ml-auto text-sm font-mono text-slate-500">
                  {pickData.size} elements with pick data
                </div>
              </div>
              {/* Display selected date range */}
              {(startDate || endDate) && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500">Showing picks from:</span>
                  <span className="text-sm font-mono font-bold text-blue-400">
                    {startDate ? new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '...'}
                  </span>
                  <span className="text-slate-600">to</span>
                  <span className="text-sm font-mono font-bold text-blue-400">
                    {endDate ? new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '...'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Upload Modal */}
      <UploadPicksModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-950 border-b-2 border-red-500">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">Error</div>
                  <p className="text-sm font-mono text-red-300 mt-1">{error}</p>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white font-mono text-sm rounded transition-colors"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-slate-400 font-mono text-sm">
              {hasPickData
                ? 'Heatmap colors represent pick intensity (blue = low, yellow = medium, red = high)'
                : 'This is a read-only visualization of your warehouse layout. Upload pick data to see the heatmap.'}
            </p>
            {!hasPickData && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-mono text-sm rounded transition-colors"
              >
                Upload Pick Data
              </button>
            )}
          </div>

          {/* Canvas and Legend Container */}
          <div className="flex gap-8 items-start justify-center">
            <WarehouseCanvas
              elements={elements}
              selectedType={null} // No placement mode
              selectedElementIds={[]} // No element selection
              labelDisplayMode="all" // Show all labels for visualization
              onElementClick={handleElementClick}
              onElementCreate={handleElementCreate}
              onElementUpdate={handleElementUpdate}
              onCanvasClick={handleCanvasClick}
              canvasWidth={layout?.canvas_width || 1200}
              canvasHeight={layout?.canvas_height || 800}
              isReadOnly={true} // Read-only visualization
              pickData={hasPickData ? pickData : undefined} // Pass pick data for heatmap
            />

            {/* Color Legend - only show when pick data exists */}
            {hasPickData && (
              <HeatmapLegend
                minPicks={minPicks}
                maxPicks={maxPicks}
                pickData={pickData}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
