'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import WarehouseCanvas from '@/components/WarehouseCanvas';
import HeatmapSidebar from '@/components/HeatmapSidebar';
import HeatmapGuide from '@/components/HeatmapGuide';
import HeatmapElementModal from '@/components/heatmap/HeatmapElementModal';
import ReslotHUD from '@/components/heatmap/ReslotHUD';
import OptimizationSummaryCard from '@/components/heatmap/OptimizationSummaryCard';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import DateRangePicker from '@/components/DateRangePicker';
import { layoutApi, picksApi, routeMarkersApi } from '@/lib/api';
import { WarehouseElement, Layout, AggregatedPickData, RouteMarker, AggregatedItemPickData, CapacityAwareReslottingOpportunity } from '@/lib/types';
import LayoutManager from '@/components/designer/LayoutManager';
import { analyzeItemVelocity, findItemReslottingOpportunities } from '@/lib/dashboardUtils';
import { exportElementDataCSV, exportItemDataCSV, exportReslottingPlan } from '@/lib/exportData';
import { useRef } from 'react';
import SkuDetailModal from '@/components/heatmap/SkuDetailModal';
import { useJourney } from '@/lib/journey';
import { HintsContainer } from '@/components/journey';


export default function Heatmap() {
  // Auth guard - redirects to /landing if not authenticated
  const { loading: authLoading } = useAuthGuard();

  const canvasRef = useRef<any>(null);
  // ... (existing state)

  // Helper to calculate and add round trip distance to data
  // Uses element and marker CENTERS to match the canvas distance calculations exactly
  const enrichDataWithDistance = (data: AggregatedPickData[], markers: RouteMarker[], elementsList: WarehouseElement[]): AggregatedPickData[] => {
    if (!data.length || !markers.length || !elementsList.length) return data;

    // Cart parking dimensions from ROUTE_MARKER_CONFIGS: 40x24
    const CART_PARKING_WIDTH = 40;
    const CART_PARKING_HEIGHT = 24;

    // Extract cart parking spots only, using CENTER coordinates
    const cartParkingSpots = markers
      .filter(m => m.marker_type === 'cart_parking')
      .map(m => ({
        x: Number(m.x_coordinate) + CART_PARKING_WIDTH / 2,
        y: Number(m.y_coordinate) + CART_PARKING_HEIGHT / 2
      }));

    if (cartParkingSpots.length === 0) return data;

    // Build element center lookup (matches getElementCenter in distanceCalculation.ts)
    const elementCenters = new Map<string, { x: number; y: number }>();
    elementsList.forEach(el => {
      elementCenters.set(el.id, {
        x: Number(el.x_coordinate) + el.width / 2,
        y: Number(el.y_coordinate) + el.height / 2
      });
    });

    // Calculate distance for each element (matching WarehouseCanvas.tsx elementDistances logic exactly)
    return data.map(item => {
      const elementCenter = elementCenters.get(item.element_id);
      if (!elementCenter) return item;

      // Find nearest cart parking using Manhattan distance
      let minDistance = Infinity;
      cartParkingSpots.forEach(parking => {
        const dist = Math.abs(elementCenter.x - parking.x) + Math.abs(elementCenter.y - parking.y);
        if (dist < minDistance) minDistance = dist;
      });

      if (minDistance === Infinity) return item;

      // Round trip = 2x one-way distance, convert pixels to feet (12 pixels = 1 foot)
      // Use Math.round to match the canvas display which uses .toFixed(0)
      const roundTripFeet = Math.round((minDistance * 2) / 12);

      return {
        ...item,
        roundTripDistanceFeet: roundTripFeet
      };
    });
  };

  // Helper to calculate and add round trip distance to item-level data
  // Uses marker and element CENTERS to match the canvas distance calculations
  const enrichItemDataWithDistance = (
    data: AggregatedItemPickData[],
    markers: RouteMarker[],
    elementsList?: WarehouseElement[]
  ): AggregatedItemPickData[] => {
    if (!data.length || !markers.length) return data;

    // Cart parking dimensions from ROUTE_MARKER_CONFIGS: 40x24
    const CART_PARKING_WIDTH = 40;
    const CART_PARKING_HEIGHT = 24;

    // Get parking spots using CENTER coordinates (prioritize cart_parking only)
    const parkingSpots = markers
      .filter(m => m.marker_type === 'cart_parking')
      .map(m => ({
        x: Number(m.x_coordinate) + CART_PARKING_WIDTH / 2,
        y: Number(m.y_coordinate) + CART_PARKING_HEIGHT / 2
      }));

    if (parkingSpots.length === 0) return data;

    // Build element dimension lookup
    const elementDimensions = new Map<string, { width: number; height: number }>();
    if (elementsList) {
      elementsList.forEach(el => {
        elementDimensions.set(el.id, { width: el.width, height: el.height });
      });
    }

    return data.map(item => {
      // Use element dimensions to calculate center (item inherits element position)
      const dims = elementDimensions.get(item.element_id) || { width: 0, height: 0 };
      const itemPos = {
        x: Number(item.x_coordinate) + dims.width / 2,
        y: Number(item.y_coordinate) + dims.height / 2
      };
      // Calculate Manhattan distance to nearest parking
      let minDist = Infinity;
      parkingSpots.forEach(parking => {
        const dist = Math.abs(itemPos.x - parking.x) + Math.abs(itemPos.y - parking.y);
        if (dist < minDist) minDist = dist;
      });
      // Round trip feet = (distance * 2) / 12 (pixels to feet)
      const roundTripFeet = Math.round((minDist * 2) / 12);

      return {
        ...item,
        roundTripDistanceFeet: roundTripFeet,
      };
    });
  };

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
  const [heatmapColorMode, setHeatmapColorMode] = useState<'picks' | 'burden'>('picks');

  // Item-level data state
  const [itemData, setItemData] = useState<AggregatedItemPickData[]>([]);
  const [itemDataLoading, setItemDataLoading] = useState(false);
  const [sameElementTypeOnly, setSameElementTypeOnly] = useState(true);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSku, setSelectedSku] = useState<AggregatedItemPickData | null>(null);
  const [selectedSkuRank, setSelectedSkuRank] = useState<number | undefined>(undefined);

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Reslot HUD state
  const [showReslotHUD, setShowReslotHUD] = useState(false);
  const [activeReslotIndex, setActiveReslotIndex] = useState(0);
  const [approvedMoves, setApprovedMoves] = useState<CapacityAwareReslottingOpportunity[]>([]);
  const [autoTourEnabled, setAutoTourEnabled] = useState(false);
  const [capacityThreshold, setCapacityThreshold] = useState(0.15);
  const [reslotDeepLinkProcessed, setReslotDeepLinkProcessed] = useState(false);

  // Reslot pagination state
  const [reslotOffset, setReslotOffset] = useState(0);
  const [loadedOpportunities, setLoadedOpportunities] = useState<CapacityAwareReslottingOpportunity[]>([]);
  const [hasMoreOpportunities, setHasMoreOpportunities] = useState(false);
  const [totalOpportunities, setTotalOpportunities] = useState(0);
  const [totalSavingsFeet, setTotalSavingsFeet] = useState(0);

  // Swap suggestions toggle
  const [showSwapSuggestions, setShowSwapSuggestions] = useState(true);

  // Journey/Onboarding
  const journey = useJourney();

  // Track heatmap_explored milestone when pick data is loaded
  useEffect(() => {
    if (hasPickData && journey && !journey.progress.completedMilestones.includes('heatmap_explored')) {
      journey.markMilestone('heatmap_explored');
    }
  }, [hasPickData, journey]);

  // Track distances_viewed milestone when showDistances is enabled
  useEffect(() => {
    if (showDistances && journey && !journey.progress.completedMilestones.includes('distances_viewed')) {
      journey.markMilestone('distances_viewed');
    }
  }, [showDistances, journey]);

  // Track optimization_started milestone when ReslotHUD is opened
  useEffect(() => {
    if (showReslotHUD && journey && !journey.progress.completedMilestones.includes('optimization_started')) {
      journey.markMilestone('optimization_started');
    }
  }, [showReslotHUD, journey]);

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

  // Sync date params to URL (for dashboard sync)
  const syncDateParamsToUrl = useCallback((start: string, end: string) => {
    const params = new URLSearchParams(window.location.search);
    if (start) params.set('startDate', start);
    else params.delete('startDate');
    if (end) params.set('endDate', end);
    else params.delete('endDate');

    router.replace(`/heatmap?${params.toString()}`, { scroll: false });
  }, [router]);

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
      // Reset deep-link state to allow re-processing for new layout
      setReslotDeepLinkProcessed(false);

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

        // Check for URL params first (for dashboard sync)
        const urlStartDate = searchParams.get('startDate');
        const urlEndDate = searchParams.get('endDate');

        let effectiveStartDate: string;
        let effectiveEndDate: string;

        if (urlStartDate && urlEndDate) {
          // Use URL params if provided (from dashboard sync)
          effectiveStartDate = urlStartDate;
          effectiveEndDate = urlEndDate;
        } else {
          // Find the most recent date across all elements
          // Since dates are now strings YYYY-MM-DD, we can compare them directly
          const mostRecentDate = allAggregatedData.reduce((latest, item) => {
            return item.last_date > latest ? item.last_date : latest;
          }, allAggregatedData[0].last_date);
          effectiveStartDate = formatDateForInput(mostRecentDate);
          effectiveEndDate = effectiveStartDate;
        }

        setStartDate(effectiveStartDate);
        setEndDate(effectiveEndDate);

        // Load pick data for the date range
        const recentDayData = await picksApi.getAggregated(layoutId, effectiveStartDate, effectiveEndDate);
        const pickMap = new Map<string, number>();
        recentDayData.forEach(item => {
          pickMap.set(item.element_id, item.total_picks);
        });
        setPickData(pickMap);
        setAggregatedData(enrichDataWithDistance(recentDayData, markersData, elementsData));
        setHasPickData(recentDayData.length > 0);

        // Load item-level data
        setItemDataLoading(true);
        try {
          const itemLevelData = await picksApi.getItemsAggregated(layoutId, effectiveStartDate, effectiveEndDate);
          setItemData(enrichItemDataWithDistance(itemLevelData, markersData, elementsData));
        } catch (itemErr) {
          console.error('Failed to load item-level data:', itemErr);
          setItemData([]);
        } finally {
          setItemDataLoading(false);
        }
      } else {
        setPickData(new Map());
        setAggregatedData([]);
        setItemData([]);
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

      // Also load item-level data
      setItemDataLoading(true);
      try {
        const itemLevelData = await picksApi.getItemsAggregated(
          layoutId,
          startDate || undefined,
          endDate || undefined
        );
        setItemData(enrichItemDataWithDistance(itemLevelData, routeMarkers, elements));
      } catch (itemErr) {
        console.error('Failed to load item-level data:', itemErr);
        setItemData([]);
      } finally {
        setItemDataLoading(false);
      }
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

  // Calculate walk burden data (picks × distance) for heatmap mode
  // Uses item-level data when available for more accurate burden calculation
  const walkBurdenData = useMemo(() => {
    const burdenMap = new Map<string, number>();
    if (heatmapColorMode !== 'burden') {
      return { burdenMap, minBurden: 0, maxBurden: 0 };
    }

    // Use item-level data if available (more accurate)
    if (itemData.length > 0) {
      // Aggregate item-level burden by element
      itemData.forEach(item => {
        if (item.roundTripDistanceFeet) {
          const burden = item.total_picks * item.roundTripDistanceFeet;
          const existing = burdenMap.get(item.element_id) || 0;
          burdenMap.set(item.element_id, existing + burden);
        }
      });
    } else if (aggregatedData.length > 0) {
      // Fall back to element-level data
      aggregatedData.forEach(item => {
        if (item.roundTripDistanceFeet) {
          const burden = item.total_picks * item.roundTripDistanceFeet;
          burdenMap.set(item.element_id, burden);
        }
      });
    }

    const burdenValues = Array.from(burdenMap.values());
    if (burdenValues.length === 0) {
      return { burdenMap, minBurden: 0, maxBurden: 0 };
    }

    return {
      burdenMap,
      minBurden: Math.min(...burdenValues),
      maxBurden: Math.max(...burdenValues),
    };
  }, [heatmapColorMode, itemData, aggregatedData]);

  // Prepare data for reslotting analysis (memoized to avoid recalculation)
  const reslotAnalysisData = useMemo(() => {
    if (!itemData.length || !routeMarkers.length) {
      return null;
    }

    // Get parking spots for distance calculation
    let parkingSpots = routeMarkers
      .filter(m => m.marker_type === 'cart_parking')
      .map(m => ({ x: Number(m.x_coordinate), y: Number(m.y_coordinate) }));

    if (parkingSpots.length === 0) {
      parkingSpots = routeMarkers
        .filter(m => m.marker_type === 'start_point')
        .map(m => ({ x: Number(m.x_coordinate), y: Number(m.y_coordinate) }));
    }

    if (parkingSpots.length === 0) {
      return null;
    }

    // Map elements with their types for reslotting analysis
    const elementsWithTypes = elements
      .filter(el => !['text', 'line', 'arrow'].includes(el.element_type))
      .map(el => ({
        id: el.id,
        label: el.label,
        x: Number(el.x_coordinate),
        y: Number(el.y_coordinate),
        element_type: el.element_type,
      }));

    // Run item-level velocity analysis
    const itemAnalysis = analyzeItemVelocity(itemData, undefined, parkingSpots);

    return { itemAnalysis, elementsWithTypes, parkingSpots };
  }, [itemData, routeMarkers, elements]);

  // Load initial opportunities when data or settings change
  useEffect(() => {
    if (!reslotAnalysisData) {
      setLoadedOpportunities([]);
      setHasMoreOpportunities(false);
      setTotalOpportunities(0);
      setTotalSavingsFeet(0);
      return;
    }

    const { itemAnalysis, elementsWithTypes, parkingSpots } = reslotAnalysisData;

    // Find reslotting opportunities with pagination (initial load)
    const result = findItemReslottingOpportunities(
      itemAnalysis,
      elementsWithTypes,
      parkingSpots,
      sameElementTypeOnly,
      itemData,
      capacityThreshold,
      { limit: 10, offset: 0 }
    );

    setLoadedOpportunities(result.opportunities);
    setHasMoreOpportunities(result.hasMore);
    setTotalOpportunities(result.totalAvailable);
    setTotalSavingsFeet(result.totalSavingsFeet);
    setReslotOffset(0);
    setActiveReslotIndex(0);
  }, [reslotAnalysisData, sameElementTypeOnly, capacityThreshold, itemData]);

  // Load more opportunities handler
  const handleLoadMoreOpportunities = useCallback(() => {
    if (!reslotAnalysisData || !hasMoreOpportunities) return;

    const { itemAnalysis, elementsWithTypes, parkingSpots } = reslotAnalysisData;
    const newOffset = loadedOpportunities.length;

    const result = findItemReslottingOpportunities(
      itemAnalysis,
      elementsWithTypes,
      parkingSpots,
      sameElementTypeOnly,
      itemData,
      capacityThreshold,
      { limit: 10, offset: newOffset }
    );

    setLoadedOpportunities(prev => [...prev, ...result.opportunities]);
    setHasMoreOpportunities(result.hasMore);
    setReslotOffset(newOffset);
  }, [reslotAnalysisData, hasMoreOpportunities, loadedOpportunities.length, sameElementTypeOnly, itemData, capacityThreshold]);

  // Calculate item-level slotting recommendations (uses loaded opportunities)
  const itemSlottingRecommendations = useMemo(() => {
    // Calculate savings from loaded (top N) opportunities
    const loadedSavingsFeet = loadedOpportunities.reduce(
      (sum, opp) => sum + opp.totalDailyWalkSavings,
      0
    );

    return {
      opportunities: loadedOpportunities,
      loadedSavingsFeet,
      totalSavingsFeet,
      totalOpportunityCount: totalOpportunities,
    };
  }, [loadedOpportunities, totalSavingsFeet, totalOpportunities]);

  // Computed active reslot move for canvas visualization
  const activeReslotMove = useMemo(() => {
    if (!showReslotHUD || !itemSlottingRecommendations.opportunities.length) return null;

    const opp = itemSlottingRecommendations.opportunities[activeReslotIndex];
    if (!opp || !opp.targetElements[0]) return null;

    return {
      fromId: opp.currentElement.id,
      toId: opp.targetElements[0].id,
    };
  }, [showReslotHUD, itemSlottingRecommendations.opportunities, activeReslotIndex]);

  // Handler for approving a reslot move
  const handleReslotApprove = useCallback((opp: CapacityAwareReslottingOpportunity) => {
    setApprovedMoves(prev => [...prev, opp]);
    // Auto-advance to next
    if (activeReslotIndex < itemSlottingRecommendations.opportunities.length - 1) {
      setActiveReslotIndex(prev => prev + 1);
    }
  }, [activeReslotIndex, itemSlottingRecommendations.opportunities.length]);

  // Handler for ignoring/skipping a reslot move
  const handleReslotIgnore = useCallback(() => {
    if (activeReslotIndex < itemSlottingRecommendations.opportunities.length - 1) {
      setActiveReslotIndex(prev => prev + 1);
    }
  }, [activeReslotIndex, itemSlottingRecommendations.opportunities.length]);

  // Handler for exporting approved moves
  const handleExportApproved = useCallback(() => {
    const currentLayout = layouts.find(l => l.id === currentLayoutId);
    exportReslottingPlan(approvedMoves, currentLayout?.name || 'warehouse');
    // Track moves_exported milestone
    if (journey && !journey.progress.completedMilestones.includes('moves_exported')) {
      journey.markMilestone('moves_exported');
    }
  }, [approvedMoves, layouts, currentLayoutId, journey]);

  // Camera and Selection sync effect - center on elements and select source when active reslot move changes
  useEffect(() => {
    if (!showReslotHUD || !activeReslotMove) return;

    canvasRef.current?.centerOnElements([activeReslotMove.fromId, activeReslotMove.toId]);

    // Auto-select the source element to show context in sidebar
    setSelectedElementId(activeReslotMove.fromId);
  }, [showReslotHUD, activeReslotMove]);

  // Auto-tour effect
  useEffect(() => {
    if (!autoTourEnabled || !showReslotHUD) return;

    const interval = setInterval(() => {
      setActiveReslotIndex(prev => {
        const opportunities = itemSlottingRecommendations.opportunities;
        return prev < opportunities.length - 1 ? prev + 1 : 0;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [autoTourEnabled, showReslotHUD, itemSlottingRecommendations.opportunities.length]);

  // Deep-link handler for ?reslot= and ?index= parameters from dashboard
  useEffect(() => {
    const reslotItemId = searchParams.get('reslot');
    const reslotIndex = searchParams.get('index');

    // Early exit conditions
    if (!reslotItemId) return;
    if (reslotDeepLinkProcessed) return;

    // WAIT for data to be fully loaded
    if (loading || itemDataLoading) return;

    // WAIT for opportunities to be calculated if we have item data
    // (Resolves race condition where itemData is ready but opportunities useEffect hasn't run)
    if (itemData.length > 0 && itemSlottingRecommendations.opportunities.length === 0) return;

    // If we have no items at all after loading, we can't do anything, so mark processed and exit
    if (itemData.length === 0 && !loading && !itemDataLoading) {
      setReslotDeepLinkProcessed(true);
      return;
    }

    // Mark as processed to prevent re-running
    setReslotDeepLinkProcessed(true);

    const opportunities = itemSlottingRecommendations.opportunities;

    // Fast path: If index is provided and matches, use it directly (guaranteed congruency)
    if (reslotIndex !== null) {
      const idx = parseInt(reslotIndex, 10);
      if (!isNaN(idx) && idx >= 0 && idx < opportunities.length) {
        // Verify the item at this index matches (for safety)
        const opp = opportunities[idx];
        if (opp?.item.externalItemId === reslotItemId) {
          setShowReslotHUD(true);
          setActiveReslotIndex(idx);

          // Select the source element to highlight it on the canvas and sidebar
          setSelectedElementId(opp.currentElement.id);
          return;
        }
      }
    }

    // Fallback: Find the opportunity index by searching
    const opportunityIndex = opportunities.findIndex(
      opp => opp.item.externalItemId === reslotItemId
    );

    if (opportunityIndex !== -1) {
      // Found the item in opportunities - open HUD and navigate to it
      const opp = opportunities[opportunityIndex];
      setShowReslotHUD(true);
      setActiveReslotIndex(opportunityIndex);

      // Select the source element
      setSelectedElementId(opp.currentElement.id);
    } else {
      // Item not in opportunities - try fallback behaviors
      // Fallback 1: Try to find the item in itemData and select its element
      const itemMatch = itemData.find(item => item.external_item_id === reslotItemId);
      if (itemMatch) {
        setSelectedElementId(itemMatch.element_id);
      }
      // Fallback 2: If opportunities exist, open HUD at start
      if (opportunities.length > 0) {
        setShowReslotHUD(true);
        setActiveReslotIndex(0);
      }
    }
  }, [searchParams, itemSlottingRecommendations.opportunities, itemData, reslotDeepLinkProcessed, loading, itemDataLoading]);

  if (authLoading || (loading && !layouts.length)) {
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

      {/* Contextual hints for onboarding */}
      <div className="px-4 pt-2">
        <HintsContainer page="/heatmap" />
      </div>

      {/* Date Range & View Controls Bar */}
      {(hasPickData || availableDates.length > 0) && (
        <div className="bg-slate-900 border-b border-slate-800 flex-shrink-0">
          <div className="w-full px-6 py-3">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Left: Date Range */}
              <div data-tour="date-filter" className="flex items-center gap-4 flex-wrap">
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
                    // Sync to URL for dashboard sync
                    if (start && end) {
                      syncDateParamsToUrl(start, end);
                    }
                  }}
                  availableDates={availableDates}
                />

                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      syncDateParamsToUrl('', '');
                    }}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-mono text-sm rounded transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Right: View Controls */}
              <div className="flex items-center gap-2">
                {/* Route Markers Toggle */}
                <button
                  onClick={() => setShowRouteMarkers(!showRouteMarkers)}
                  className={`px-3 py-1.5 font-mono text-xs rounded transition-colors flex items-center gap-2 border ${showRouteMarkers
                    ? 'bg-purple-600/30 border-purple-500/60 text-purple-200'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white'
                    }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Markers
                </button>

                {/* Distances Toggle */}
                <button
                  onClick={() => setShowDistances(!showDistances)}
                  className={`px-3 py-1.5 font-mono text-xs rounded transition-colors flex items-center gap-2 border ${showDistances
                    ? 'bg-blue-600/30 border-blue-500/60 text-blue-200'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white'
                    }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.806-.98l-3.253-1.626M15 10v10" />
                  </svg>
                  Distances
                </button>

                {/* Color Mode Toggle */}
                {hasPickData && (
                  <div data-tour="burden-toggle" className="flex bg-slate-700 rounded border border-slate-600 text-[11px] font-mono">
                    <button
                      onClick={() => setHeatmapColorMode('picks')}
                      className={`px-2.5 py-1.5 rounded-l transition-colors ${heatmapColorMode === 'picks' ? 'bg-slate-600 text-white' : 'text-slate-300 hover:text-white'}`}
                    >
                      Picks
                    </button>
                    <button
                      onClick={() => setHeatmapColorMode('burden')}
                      className={`px-2.5 py-1.5 rounded-r transition-colors ${heatmapColorMode === 'burden' ? 'bg-amber-600/40 text-amber-200' : 'text-slate-300 hover:text-white'}`}
                      title="Color by Walk Burden (picks × distance)"
                    >
                      Burden
                    </button>
                  </div>
                )}

                {/* Export Button */}
                {hasPickData && (
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="px-3 py-1.5 font-mono text-xs rounded transition-colors flex items-center gap-2 border bg-green-600/20 border-green-500/50 text-green-300 hover:bg-green-600/30"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export
                      <svg className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Export Dropdown Menu */}
                    {showExportMenu && (
                      <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                        <button
                          onClick={() => {
                            exportElementDataCSV(
                              aggregatedData,
                              layout?.name || 'layout',
                              startDate && endDate ? { start: startDate, end: endDate } : undefined
                            );
                            setShowExportMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 rounded-t-lg"
                        >
                          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                          </svg>
                          Export Elements
                        </button>
                        <button
                          onClick={() => {
                            exportItemDataCSV(
                              itemData,
                              layout?.name || 'layout',
                              startDate && endDate ? { start: startDate, end: endDate } : undefined
                            );
                            setShowExportMenu(false);
                          }}
                          disabled={itemData.length === 0}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 rounded-b-lg ${itemData.length === 0 ? 'text-slate-500 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                        >
                          <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          Export Items
                          {itemData.length === 0 && <span className="text-xs text-slate-600">(No data)</span>}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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

      {/* Reslot HUD - Floating Optimization Navigator */}
      {showReslotHUD && itemSlottingRecommendations.opportunities.length > 0 && (
        <ReslotHUD
          opportunities={itemSlottingRecommendations.opportunities}
          activeIndex={activeReslotIndex}
          onIndexChange={setActiveReslotIndex}
          onApprove={handleReslotApprove}
          onIgnore={handleReslotIgnore}
          onClose={() => {
            setShowReslotHUD(false);
            setAutoTourEnabled(false);
          }}
          onExportApproved={handleExportApproved}
          approvedCount={approvedMoves.length}
          autoTourEnabled={autoTourEnabled}
          onAutoTourToggle={() => setAutoTourEnabled(prev => !prev)}
          capacityThreshold={capacityThreshold}
          onCapacityThresholdChange={setCapacityThreshold}
          // Pagination props
          hasMore={hasMoreOpportunities}
          totalAvailable={totalOpportunities}
          onLoadMore={handleLoadMoreOpportunities}
          // Swap toggle props
          showSwapSuggestions={showSwapSuggestions}
          onShowSwapSuggestionsChange={setShowSwapSuggestions}
        />
      )}

      {/* Main Content - Full Height Flex Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas Area - Takes remaining space */}
        <div data-tour="heatmap-canvas" className="flex-1 bg-slate-950 relative overflow-hidden">
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
            heatmapColorMode={heatmapColorMode}
            walkBurdenData={walkBurdenData.burdenMap}
            minBurden={walkBurdenData.minBurden}
            maxBurden={walkBurdenData.maxBurden}
            activeReslotMove={activeReslotMove}
          />

          {/* Optimization Summary Card Overlay */}
          {itemSlottingRecommendations.opportunities.length > 0 && (
            <div className="absolute top-4 right-4 z-40">
              <OptimizationSummaryCard
                loadedSavingsFeet={itemSlottingRecommendations.loadedSavingsFeet}
                loadedOpportunityCount={itemSlottingRecommendations.opportunities.length}
                totalSavingsFeet={itemSlottingRecommendations.totalSavingsFeet}
                totalOpportunityCount={itemSlottingRecommendations.totalOpportunityCount}
                onStartTour={() => {
                  setShowReslotHUD(true);
                  setActiveReslotIndex(0);
                }}
                isActive={showReslotHUD}
              />
            </div>
          )}
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
            allItemData={itemData}
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

      {/* Status Bar Footer */}
      <footer className="h-7 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-4 text-[11px] font-mono text-slate-400 select-none z-40 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">ELEMENTS:</span>
            <span className="font-semibold text-white">{elements.length}</span>
          </div>
          <div className="w-px h-3 bg-slate-700"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">ITEMS:</span>
            <span className="font-semibold text-white">{itemData.length}</span>
          </div>
          <div className="w-px h-3 bg-slate-700"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">PICKS:</span>
            <span className="font-semibold text-white">{totalPicks.toLocaleString()}</span>
          </div>
          {routeMarkers.length > 0 && (
            <>
              <div className="w-px h-3 bg-slate-700"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">MARKERS:</span>
                <span className="font-semibold text-white">{routeMarkers.length}</span>
              </div>
            </>
          )}
        </div>

        {/* Center: Distances & Fit All */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDistances(prev => !prev)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${showDistances
              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
              : 'bg-slate-700/60 text-slate-300 border border-slate-600 hover:text-white hover:bg-slate-700'
              }`}
            title="Toggle Distances (D)"
          >
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Distances
            </span>
          </button>
          <button
            onClick={() => canvasRef.current?.fitToElements()}
            className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors bg-slate-700/60 text-slate-300 border border-slate-600 hover:text-white hover:bg-slate-700"
            title="Fit All Elements (F)"
          >
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
              Fit All
            </span>
          </button>
          {/* Optimize HUD Button - only show when opportunities exist */}
          {hasPickData && itemSlottingRecommendations.opportunities.length > 0 && (
            <button
              onClick={() => {
                setShowReslotHUD(!showReslotHUD);
                if (!showReslotHUD) {
                  setActiveReslotIndex(0);
                  setApprovedMoves([]);
                }
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${showReslotHUD
                ? 'bg-amber-600/40 text-amber-200 border border-amber-500/70'
                : 'bg-slate-700/60 text-slate-300 border border-slate-600 hover:text-amber-300 hover:border-amber-500/50'
                }`}
              title="Optimization Navigator"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Optimize ({itemSlottingRecommendations.opportunities.length})
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {itemDataLoading ? (
            <div className="flex items-center gap-1.5 text-slate-400">
              <div className="w-1.5 h-1.5 border border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px]">LOADING</span>
            </div>
          ) : hasPickData ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-[10px] text-green-400">READY</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div>
              <span className="text-[10px] text-slate-500">NO DATA</span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
