'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import WarehouseCanvas, { WarehouseCanvasRef } from '@/components/WarehouseCanvas';
import Sidebar from '@/components/designer/Sidebar';
import PropertiesPanel from '@/components/designer/PropertiesPanel';
import StatusBar from '@/components/designer/StatusBar';
import MenuBar from '@/components/designer/MenuBar';
import BulkRenameModal from '@/components/BulkRenameModal';
import LayoutManager from '@/components/designer/LayoutManager';
import Header from '@/components/Header';
import KeyboardShortcutsModal from '@/components/designer/KeyboardShortcutsModal';
import Toast from '@/components/ui/Toast';
import PatternGeneratorModal, { GeneratedElementData } from '@/components/designer/PatternGeneratorModal';
import ResequenceModal from '@/components/designer/ResequenceModal';
import TemplateLibrary from '@/components/designer/TemplateLibrary';
import DxfImportModal from '@/components/designer/DxfImportModal';
import DimensionsModal from '@/components/designer/DimensionsModal';
import AutoAlignModal from '@/components/designer/AutoAlignModal';
import { HintsContainer } from '@/components/journey';

import { elementsApi, routeMarkersApi, API_URL } from '@/lib/api';
import { WarehouseTemplate } from '@/lib/templates';
import { ImportedElement } from '@/lib/dxfImporter';
import { WarehouseElement, ElementType, ELEMENT_CONFIGS, LabelDisplayMode, RouteMarker, RouteMarkerType } from '@/lib/types';
import { alignElements, AlignmentType } from '@/lib/alignment';
import { detectPatterns, generateCorrectionPlan, correctionsToUpdates, correctionsToMarkerUpdates, CorrectionPlan, ElementCorrection } from '@/lib/autoAlign';
import { TIER_ELEMENT_LIMITS, DEFAULT_TIER, DEFAULT_ELEMENT_LIMIT, isPickableType } from '@/lib/designerConstants';

import { useHistory } from '@/hooks/useHistory';
import { useLayoutOperations } from '@/hooks/useLayoutOperations';
import { useElementOperations } from '@/hooks/useElementOperations';
import { useMarkerOperations } from '@/hooks/useMarkerOperations';
import { useClipboard } from '@/hooks/useClipboard';
import { useDesignerKeyboardShortcuts } from '@/hooks/useDesignerKeyboardShortcuts';
import { useJourney } from '@/lib/journey';
import { nanoid } from 'nanoid';

export default function DesignerPage() {
  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type?: 'success' | 'error' | 'info';
    duration?: number;
    onUndo?: () => void;
    onClose?: () => void;
  } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', duration?: number) => {
    setToast({ message, type, duration });
  }, []);

  // History State
  const {
    state: historyState,
    set: setHistoryState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
  } = useHistory<{ elements: WarehouseElement[]; routeMarkers: RouteMarker[] }>({
    elements: [],
    routeMarkers: [],
  });

  const { elements, routeMarkers } = historyState;

  const setElements = useCallback((newElementsOrFn: WarehouseElement[] | ((prev: WarehouseElement[]) => WarehouseElement[])) => {
    setHistoryState(prevState => ({
      ...prevState,
      elements: typeof newElementsOrFn === 'function' ? newElementsOrFn(prevState.elements) : newElementsOrFn,
    }));
  }, [setHistoryState]);

  const setRouteMarkers = useCallback((newMarkersOrFn: RouteMarker[] | ((prev: RouteMarker[]) => RouteMarker[])) => {
    setHistoryState(prevState => ({
      ...prevState,
      routeMarkers: typeof newMarkersOrFn === 'function' ? newMarkersOrFn(prevState.routeMarkers) : newMarkersOrFn,
    }));
  }, [setHistoryState]);

  // Layout Operations
  const layoutOps = useLayoutOperations({
    onSuccess: showToast,
    onError: (msg) => showToast(msg, 'error'),
    resetHistory,
  });

  // Tool & Selection State
  const [activeTool, setActiveTool] = useState<'select' | ElementType | RouteMarkerType>('select');
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [selectedMarkerIds, setSelectedMarkerIds] = useState<string[]>([]);

  // View State
  const [zoom, setZoom] = useState(1);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | undefined>(undefined);
  const [labelDisplayMode, setLabelDisplayMode] = useState<LabelDisplayMode>('all');
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snappingEnabled, setSnappingEnabled] = useState(true);
  const [showDistances, setShowDistances] = useState(false);

  // System State
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string>(DEFAULT_TIER);
  const [elementLimit, setElementLimit] = useState<number>(DEFAULT_ELEMENT_LIMIT);

  // Modal State
  const [showBulkRenameModal, setShowBulkRenameModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [showResequenceModal, setShowResequenceModal] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showDxfImport, setShowDxfImport] = useState(false);
  const [showAutoAlignModal, setShowAutoAlignModal] = useState(false);
  const [autoAlignCorrectionPlan, setAutoAlignCorrectionPlan] = useState<CorrectionPlan | null>(null);

  // First-element dimension modal state
  const [showFirstElementModal, setShowFirstElementModal] = useState(false);
  const [pendingElementPlacement, setPendingElementPlacement] = useState<{
    x: number;
    y: number;
    type: ElementType;
  } | null>(null);
  const [customElementDefaults, setCustomElementDefaults] = useState<Record<string, { width: number; height: number }>>({});
  const [elementRotationDefaults, setElementRotationDefaults] = useState<Record<string, number>>({});

  // Refs
  const canvasRef = useRef<WarehouseCanvasRef>(null);

  // Journey/Onboarding
  const journey = useJourney();

  // Element Operations
  const elementOps = useElementOperations({
    layout: layoutOps.currentLayout,
    currentLayoutId: layoutOps.currentLayoutId,
    elements,
    setElements,
    customElementDefaults,
    setCustomElementDefaults,
    elementRotationDefaults,
    setElementRotationDefaults,
    onSuccess: showToast,
    onError: (msg) => {
      setError(msg);
      showToast(msg, 'error');
    },
    onSavingChange: setSaving,
  });

  // Marker Operations
  const markerOps = useMarkerOperations({
    currentLayoutId: layoutOps.currentLayoutId,
    routeMarkers,
    setRouteMarkers,
    onSuccess: showToast,
    onError: (msg) => {
      setError(msg);
      showToast(msg, 'error');
    },
    onSavingChange: setSaving,
    onLoadData: layoutOps.loadLayouts,
  });

  // Clipboard Operations
  const clipboard = useClipboard({
    elements,
    routeMarkers,
    setElements,
    setRouteMarkers,
    layout: layoutOps.currentLayout,
    currentLayoutId: layoutOps.currentLayoutId,
    onSuccess: showToast,
    onError: (msg) => showToast(msg, 'error'),
    onSavingChange: setSaving,
  });

  // Load initial data
  useEffect(() => {
    layoutOps.loadLayouts();
    fetchUserLimits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load layout data when layout changes
  useEffect(() => {
    if (layoutOps.currentLayoutId) {
      layoutOps.loadLayoutData(layoutOps.currentLayoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutOps.currentLayoutId]);

  // Journey milestone tracking
  useEffect(() => {
    if (elements.length > 0 && journey && !journey.progress.completedMilestones.includes('layout_created')) {
      journey.markMilestone('layout_created');
    }
  }, [elements.length, journey]);

  useEffect(() => {
    const hasCartParking = routeMarkers.some(m => m.marker_type === 'cart_parking');
    if (hasCartParking && journey && !journey.progress.completedMilestones.includes('route_markers_added')) {
      journey.markMilestone('route_markers_added');
    }
  }, [routeMarkers, journey]);

  useEffect(() => {
    if (showDistances && journey && !journey.progress.completedMilestones.includes('distances_viewed')) {
      journey.markMilestone('distances_viewed');
    }
  }, [showDistances, journey]);

  // Journey event listeners
  useEffect(() => {
    const handleOpenTemplates = () => setShowTemplateLibrary(true);
    window.addEventListener('journey:open-templates', handleOpenTemplates);
    return () => window.removeEventListener('journey:open-templates', handleOpenTemplates);
  }, []);

  const fetchUserLimits = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/stripe/subscription-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUserTier(data.subscription_tier || DEFAULT_TIER);
        setElementLimit(TIER_ELEMENT_LIMITS[data.subscription_tier] || DEFAULT_ELEMENT_LIMIT);
      }
    } catch (err) {
      console.error('Failed to fetch limits:', err);
    }
  };

  // Auto-Align Handlers
  const handleAutoAlign = useCallback(() => {
    const detection = detectPatterns(elements, routeMarkers);
    const plan = generateCorrectionPlan(detection);
    setAutoAlignCorrectionPlan(plan);
    setShowAutoAlignModal(true);
  }, [elements, routeMarkers]);

  const misalignedCount = (() => {
    const detection = detectPatterns(elements, routeMarkers);
    return detection.totalMisaligned;
  })();

  const handleAutoAlignApply = useCallback(async (corrections: ElementCorrection[]) => {
    const elementUpdates = correctionsToUpdates(corrections);
    if (elementUpdates.length > 0) {
      await elementOps.updateMultipleElements(elementUpdates);
    }

    const markerUpdates = correctionsToMarkerUpdates(corrections);
    for (const update of markerUpdates) {
      await markerOps.updateMarker(update.id, {
        x_coordinate: update.x_coordinate,
        y_coordinate: update.y_coordinate,
      });
    }

    const elementCount = elementUpdates.length;
    const markerCount = markerUpdates.length;
    const totalCount = elementCount + markerCount;

    let message = `Aligned ${totalCount} item${totalCount !== 1 ? 's' : ''}`;
    if (elementCount > 0 && markerCount > 0) {
      message = `Aligned ${elementCount} element${elementCount !== 1 ? 's' : ''} and ${markerCount} marker${markerCount !== 1 ? 's' : ''}`;
    }

    showToast(message);
  }, [elementOps, markerOps, showToast]);

  // Element Create Handler (for canvas click)
  const handleElementCreate = useCallback(async (x: number, y: number) => {
    if (activeTool === 'select') return;

    const selectedType = activeTool as ElementType;

    if (isPickableType(selectedType) && elementOps.isFirstOfType(selectedType)) {
      setPendingElementPlacement({ x, y, type: selectedType });
      setShowFirstElementModal(true);
      return;
    }

    await elementOps.createElement(x, y, selectedType);
  }, [activeTool, elementOps]);

  // Direct element create (for drag-drop)
  const handleDirectElementCreate = useCallback(async (x: number, y: number, elementType: ElementType) => {
    if (isPickableType(elementType) && elementOps.isFirstOfType(elementType)) {
      setPendingElementPlacement({ x, y, type: elementType });
      setShowFirstElementModal(true);
      return;
    }

    await elementOps.createElement(x, y, elementType);
    showToast(`Created ${ELEMENT_CONFIGS[elementType].displayName}`, 'success', 1500);
  }, [elementOps, showToast]);

  // First element modal handlers
  const handleFirstElementModalApply = useCallback(async (dimensions: { width: number; height: number }) => {
    if (!pendingElementPlacement) return;

    await elementOps.createWithDimensions(
      pendingElementPlacement.x,
      pendingElementPlacement.y,
      pendingElementPlacement.type,
      dimensions
    );

    setPendingElementPlacement(null);
    setShowFirstElementModal(false);
  }, [pendingElementPlacement, elementOps]);

  const handleFirstElementModalCancel = useCallback(() => {
    setPendingElementPlacement(null);
    setShowFirstElementModal(false);
  }, []);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (selectedMarkerIds.length > 0) {
      await markerOps.deleteMarkers(selectedMarkerIds);
      setSelectedMarkerIds([]);
    } else if (selectedElementIds.length > 0) {
      const elementsToDelete = elements.filter(el => selectedElementIds.includes(el.id));
      await elementOps.deleteElements(selectedElementIds);
      setSelectedElementIds([]);

      // Set up toast with undo functionality
      setToast({
        message: `Deleted ${elementsToDelete.length} element${elementsToDelete.length > 1 ? 's' : ''}`,
        type: 'success',
        duration: 5000,
        onUndo: async () => {
          setToast(null);
          setSaving(true);
          try {
            const restored = await Promise.all(
              elementsToDelete.map(el =>
                elementsApi.create({
                  element_type: el.element_type,
                  label: el.label,
                  x_coordinate: el.x_coordinate,
                  y_coordinate: el.y_coordinate,
                  rotation: el.rotation,
                  width: el.width,
                  height: el.height,
                })
              )
            );
            setElements(prev => [...prev, ...restored]);
          } catch {
            setError('Failed to restore elements');
          } finally {
            setSaving(false);
          }
        },
      });
    }
  }, [selectedMarkerIds, selectedElementIds, elements, elementOps, markerOps, setElements]);

  // Copy/Paste handlers
  const handleCopy = useCallback(() => {
    clipboard.copy(selectedElementIds, selectedMarkerIds);
  }, [clipboard, selectedElementIds, selectedMarkerIds]);

  const handlePaste = useCallback(async () => {
    const { newElementIds, newMarkerIds } = await clipboard.paste();
    if (newElementIds.length > 0) {
      setSelectedElementIds(newElementIds);
      setSelectedMarkerIds([]);
    } else if (newMarkerIds.length > 0) {
      setSelectedMarkerIds(newMarkerIds);
      setSelectedElementIds([]);
    }
  }, [clipboard]);

  // Alignment
  const handleAlign = useCallback((type: AlignmentType) => {
    if (selectedElementIds.length < 2) return;

    const selectedElements = elements.filter(el => selectedElementIds.includes(el.id));
    const aligned = alignElements(selectedElements, type);

    const newElements = elements.map(el => {
      const match = aligned.find(a => a.id === el.id);
      return match || el;
    });

    setElements(newElements);
    aligned.forEach(el => {
      elementsApi.update(el.id, { x_coordinate: el.x_coordinate, y_coordinate: el.y_coordinate });
    });
  }, [selectedElementIds, elements, setElements]);

  // Pattern Generation
  const handlePatternGenerate = useCallback(async (generatedElements: GeneratedElementData[]) => {
    if (generatedElements.length === 0) return;

    const tempElements: WarehouseElement[] = generatedElements.map((el) => ({
      id: `temp-${nanoid()}`,
      layout_id: layoutOps.currentLayout?.id || layoutOps.currentLayoutId || '',
      element_type: el.element_type,
      label: el.label,
      x_coordinate: el.x_coordinate,
      y_coordinate: el.y_coordinate,
      width: el.width,
      height: el.height,
      rotation: el.rotation,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setElements([...elements, ...tempElements]);
    setShowPatternModal(false);

    try {
      setSaving(true);
      const createdElements = await Promise.all(
        generatedElements.map(el =>
          elementsApi.create({
            layout_id: layoutOps.currentLayout?.id || layoutOps.currentLayoutId || '',
            element_type: el.element_type,
            label: el.label,
            x_coordinate: el.x_coordinate,
            y_coordinate: el.y_coordinate,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
          })
        )
      );

      setElements(elements.concat(createdElements));
      setSelectedElementIds(createdElements.map(el => el.id));
      showToast(`Generated ${createdElements.length} elements`);
    } catch (err) {
      setElements(elements);
      setError((err as Error)?.message || 'Failed to generate elements');
    } finally {
      setSaving(false);
    }
  }, [elements, layoutOps, setElements, showToast]);

  // Resequence
  const handleResequenceApply = useCallback(async (renames: { id: string; newLabel: string }[]) => {
    if (renames.length === 0) return;

    const newElements = elements.map(el => {
      const rename = renames.find(r => r.id === el.id);
      return rename ? { ...el, label: rename.newLabel } : el;
    });
    setElements(newElements);
    setShowResequenceModal(false);

    try {
      setSaving(true);
      await Promise.all(renames.map(({ id, newLabel }) => elementsApi.update(id, { label: newLabel })));
      showToast(`Renamed ${renames.length} elements`);
    } catch {
      setElements(elements);
      setError('Failed to rename elements');
    } finally {
      setSaving(false);
    }
  }, [elements, setElements, showToast]);

  // Template Application
  const handleApplyTemplate = useCallback(async (template: WarehouseTemplate) => {
    if (!layoutOps.currentLayoutId) return;

    const tempElements: WarehouseElement[] = template.elements.map((el, index) => ({
      id: `temp-template-${index}`,
      layout_id: layoutOps.currentLayoutId!,
      element_type: el.element_type,
      label: el.label,
      x_coordinate: el.x_coordinate,
      y_coordinate: el.y_coordinate,
      width: el.width,
      height: el.height,
      rotation: el.rotation,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const tempMarkers: RouteMarker[] = template.routeMarkers.map((marker, index) => ({
      id: `temp-marker-${index}`,
      layout_id: layoutOps.currentLayoutId!,
      marker_type: marker.marker_type,
      label: marker.label,
      x_coordinate: marker.x_coordinate,
      y_coordinate: marker.y_coordinate,
      sequence_order: marker.sequence_order,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setHistoryState(prev => ({
      elements: [...prev.elements, ...tempElements],
      routeMarkers: [...prev.routeMarkers, ...tempMarkers],
    }));
    setShowTemplateLibrary(false);

    try {
      setSaving(true);
      const createdElements = await Promise.all(
        template.elements.map(el =>
          elementsApi.create({
            layout_id: layoutOps.currentLayoutId!,
            element_type: el.element_type,
            label: el.label,
            x_coordinate: el.x_coordinate,
            y_coordinate: el.y_coordinate,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
          })
        )
      );

      const createdMarkers = await Promise.all(
        template.routeMarkers.map(marker =>
          routeMarkersApi.create(layoutOps.currentLayoutId!, {
            marker_type: marker.marker_type,
            label: marker.label,
            x_coordinate: marker.x_coordinate,
            y_coordinate: marker.y_coordinate,
            sequence_order: marker.sequence_order,
          })
        )
      );

      setHistoryState(prev => ({
        elements: prev.elements.filter(el => !el.id.startsWith('temp-template-')).concat(createdElements),
        routeMarkers: prev.routeMarkers.filter(m => !m.id.startsWith('temp-marker-')).concat(createdMarkers),
      }));

      showToast(`Applied "${template.name}" template (${createdElements.length} elements, ${createdMarkers.length} markers)`);
    } catch {
      setHistoryState(prev => ({
        elements: prev.elements.filter(el => !el.id.startsWith('temp-template-')),
        routeMarkers: prev.routeMarkers.filter(m => !m.id.startsWith('temp-marker-')),
      }));
      setError('Failed to apply template');
    } finally {
      setSaving(false);
    }
  }, [layoutOps.currentLayoutId, setHistoryState, showToast]);

  // DXF Import
  const handleDxfImport = useCallback(async (importedElements: ImportedElement[]) => {
    if (!layoutOps.currentLayoutId || importedElements.length === 0) return;

    const tempElements: WarehouseElement[] = importedElements.map((el, index) => ({
      id: `temp-dxf-${index}`,
      layout_id: layoutOps.currentLayoutId!,
      element_type: el.element_type,
      label: el.label,
      x_coordinate: el.x_coordinate,
      y_coordinate: el.y_coordinate,
      width: el.width,
      height: el.height,
      rotation: el.rotation,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setElements(prev => [...prev, ...tempElements]);

    try {
      setSaving(true);
      const createdElements = await Promise.all(
        importedElements.map(el =>
          elementsApi.create({
            layout_id: layoutOps.currentLayoutId!,
            element_type: el.element_type,
            label: el.label,
            x_coordinate: el.x_coordinate,
            y_coordinate: el.y_coordinate,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
          })
        )
      );

      setElements(prev => prev.filter(el => !el.id.startsWith('temp-dxf-')).concat(createdElements));
      setSelectedElementIds(createdElements.map(el => el.id));
      showToast(`Imported ${createdElements.length} elements from DXF file`);
    } catch {
      setElements(prev => prev.filter(el => !el.id.startsWith('temp-dxf-')));
      setError('Failed to import DXF elements');
    } finally {
      setSaving(false);
    }
  }, [layoutOps.currentLayoutId, setElements, showToast]);

  // Menu Actions
  const handleMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'save':
        showToast('Layout saved successfully');
        break;
      case 'export_png':
        canvasRef.current?.exportAsPNG();
        showToast('Exported as PNG', 'success', 2000);
        break;
      case 'export_pdf':
        canvasRef.current?.exportAsPDF();
        showToast('Exported as PDF', 'success', 2000);
        break;
      case 'print':
        window.print();
        break;
      case 'undo':
        if (canUndo) undo();
        break;
      case 'redo':
        if (canRedo) redo();
        break;
      case 'cut':
        handleCopy();
        handleDelete();
        break;
      case 'copy':
        handleCopy();
        break;
      case 'paste':
        handlePaste();
        break;
      case 'delete':
        handleDelete();
        break;
      case 'select_all':
        if (selectedMarkerIds.length > 0) {
          setSelectedMarkerIds(routeMarkers.map(m => m.id));
        } else {
          setSelectedElementIds(elements.map(el => el.id));
        }
        break;
      case 'zoom_in':
        setZoom(z => Math.min(z * 1.2, 5));
        break;
      case 'zoom_out':
        setZoom(z => Math.max(z / 1.2, 0.1));
        break;
      case 'zoom_fit':
        setZoom(1);
        break;
      case 'toggle_grid':
        setShowGrid(prev => !prev);
        break;
      case 'toggle_snap':
        setSnappingEnabled(prev => !prev);
        showToast(`Smart Snapping: ${!snappingEnabled ? 'On' : 'Off'}`, 'info');
        break;
      case 'help_shortcuts':
        setShowShortcutsModal(true);
        break;
      case 'help_about':
        showToast('HeatmapSlotting v1.0 - Warehouse Heatmap Designer', 'info', 3000);
        break;
      case 'generate_pattern':
        if (selectedElementIds.length >= 1) {
          setShowPatternModal(true);
        } else {
          showToast('Select at least 1 element to use as a template', 'info');
        }
        break;
      case 'resequence':
        if (selectedElementIds.length >= 2) {
          setShowResequenceModal(true);
        } else {
          showToast('Select at least 2 elements to resequence', 'info');
        }
        break;
    }
  }, [
    canUndo, canRedo, undo, redo, handleCopy, handleDelete, handlePaste,
    elements, routeMarkers, selectedMarkerIds, selectedElementIds, snappingEnabled, showToast
  ]);

  // Marker click handler
  const handleMarkerClick = useCallback((id: string, ctrl: boolean, meta: boolean) => {
    if (selectedMarkerIds.length === 1 && selectedMarkerIds[0] === id && !ctrl && !meta) {
      setSelectedMarkerIds([]);
      return;
    }

    if (ctrl || meta) {
      setSelectedMarkerIds(prev => prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]);
    } else {
      setSelectedMarkerIds([id]);
    }
    setSelectedElementIds([]);
  }, [selectedMarkerIds]);

  // Keyboard Shortcuts
  useDesignerKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onCut: () => { handleCopy(); handleDelete(); },
    onDelete: handleDelete,
    onSelectAll: () => handleMenuAction('select_all'),
    onSave: () => handleMenuAction('save'),
    onGeneratePattern: () => setShowPatternModal(true),
    onResequence: () => setShowResequenceModal(true),
    onAutoAlign: handleAutoAlign,
    canUndo,
    canRedo,
    hasMarkersSelected: selectedMarkerIds.length > 0,
    selectedElementCount: selectedElementIds.length,
  });

  if (layoutOps.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50 animate-spin"></div>
          </div>
          <p className="text-lg font-mono font-bold text-slate-400 tracking-wider">LOADING WAREHOUSE LAYOUT</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <Header
        title="Warehouse Designer"
        subtitle={`${layoutOps.currentLayout?.name || 'Untitled Layout'} • Layout Editor`}
      />

      <div className="px-4 pt-2">
        <HintsContainer page="/designer" />
      </div>

      <MenuBar
        layoutName={layoutOps.currentLayout?.name || 'Untitled Layout'}
        onAction={handleMenuAction}
        onShowTemplates={() => setShowTemplateLibrary(true)}
        onShowDxfImport={() => setShowDxfImport(true)}
        showDistances={showDistances}
        onToggleDistances={() => setShowDistances(!showDistances)}
        headerContent={
          <LayoutManager
            layouts={layoutOps.layouts}
            currentLayoutId={layoutOps.currentLayoutId}
            onLayoutSelect={layoutOps.setCurrentLayoutId}
            onLayoutCreate={layoutOps.createLayout}
            onLayoutRename={layoutOps.renameLayout}
            onLayoutDelete={layoutOps.deleteLayout}
          />
        }
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTool={activeTool} onSelectTool={setActiveTool} />

        <main
          className="flex-1 relative bg-[#0a0f1e] overflow-hidden"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={async (e) => {
            e.preventDefault();
            try {
              const data = JSON.parse(e.dataTransfer.getData('application/json'));
              if (!data?.type) return;

              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;

              if (data.isRouteMarker) {
                await markerOps.createMarker(x, y, data.type as RouteMarkerType);
              } else {
                await handleDirectElementCreate(x, y, data.type as ElementType);
              }
            } catch (err) {
              console.error('Drop error:', err);
            }
          }}
        >
          <WarehouseCanvas
            ref={canvasRef}
            elements={elements}
            selectedType={activeTool !== 'select' ? (activeTool as ElementType) : null}
            selectedElementIds={selectedElementIds}
            labelDisplayMode={labelDisplayMode}
            onElementClick={(id: string, ctrl: boolean, meta: boolean) => {
              if (activeTool !== 'select') {
                setActiveTool('select');
                setSelectedElementIds([id]);
                return;
              }

              if (selectedElementIds.length === 1 && selectedElementIds[0] === id && !ctrl && !meta) {
                setSelectedElementIds([]);
                return;
              }

              if (ctrl || meta) {
                setSelectedElementIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
              } else {
                setSelectedElementIds([id]);
              }
            }}
            onElementCreate={handleElementCreate}
            onElementUpdate={elementOps.updateElement}
            onCanvasClick={() => {
              setSelectedElementIds([]);
              setSelectedMarkerIds([]);
            }}
            canvasWidth={layoutOps.currentLayout?.canvas_width || 1200}
            canvasHeight={layoutOps.currentLayout?.canvas_height || 800}
            onZoomChange={setZoom}
            onCursorMove={(x, y) => setCursorPos({ x, y })}
            routeMarkers={routeMarkers}
            selectedMarkerIds={selectedMarkerIds}
            onMarkerClick={handleMarkerClick}
            onMarkerCreate={markerOps.createMarker}
            onMarkerUpdate={markerOps.updateMarker}
            snappingEnabled={snappingEnabled}
            onSnappingToggle={() => setSnappingEnabled(prev => !prev)}
            showRouteMarkers={true}
            onMultiElementSelect={(ids) => setSelectedElementIds(ids)}
            onMultiElementUpdate={elementOps.updateMultipleElements}
            showDistances={showDistances}
            onDistancesToggle={() => setShowDistances(prev => !prev)}
            customElementDefaults={customElementDefaults}
            elementRotationDefaults={elementRotationDefaults}
          />

          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-900/90 border border-red-500 text-white px-4 py-3 rounded shadow-xl flex items-center gap-4 z-50 max-w-md">
              <div className="flex flex-col">
                <span className="font-bold">{error}</span>
                {(error.includes('limit reached') || error.includes('Upgrade')) && (
                  <span className="text-xs text-red-200 mt-1">
                    Need more capacity? Upgrade your plan.
                  </span>
                )}
              </div>
              {(error.includes('limit reached') || error.includes('Upgrade')) && (
                <a
                  href="/pricing"
                  className="bg-white text-red-900 px-3 py-1.5 rounded text-sm font-bold hover:bg-red-50 whitespace-nowrap"
                >
                  Upgrade Plan
                </a>
              )}
              <button onClick={() => setError(null)} className="font-bold hover:text-red-200 ml-2">
                ✕
              </button>
            </div>
          )}
        </main>

        <aside className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col z-30">
          <PropertiesPanel
            element={selectedElementIds.length === 1 ? elements.find(el => el.id === selectedElementIds[0]) || null : null}
            selectedCount={selectedElementIds.length}
            onUpdate={elementOps.updateElement}
            onGeneratePattern={selectedElementIds.length >= 1 ? () => setShowPatternModal(true) : undefined}
            onResequence={selectedElementIds.length >= 2 ? () => setShowResequenceModal(true) : undefined}
            selectedMarker={selectedMarkerIds.length === 1 ? routeMarkers.find(m => m.id === selectedMarkerIds[0]) || null : null}
            onMarkerUpdate={markerOps.updateMarker}
            onMarkerDelete={() => {
              markerOps.deleteMarkers(selectedMarkerIds);
              setSelectedMarkerIds([]);
            }}
            elements={elements}
            routeMarkers={routeMarkers}
            labelDisplayMode={labelDisplayMode}
            onLabelDisplayModeChange={setLabelDisplayMode}
            onAlign={handleAlign}
            onBatchUpdateDimensions={elementOps.batchUpdateDimensions}
          />
        </aside>
      </div>

      <StatusBar
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(z * 1.2, 5))}
        onZoomOut={() => setZoom(z => Math.max(z / 1.2, 0.1))}
        onFit={() => canvasRef.current?.fitToElements()}
        saving={saving}
        elementCount={elements.length}
        selectionCount={selectedElementIds.length}
        cursorPos={cursorPos}
        elementLimit={elementLimit}
        userTier={userTier}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(prev => !prev)}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(prev => !prev)}
        showDistances={showDistances}
        onToggleDistances={() => setShowDistances(prev => !prev)}
        onAutoAlign={handleAutoAlign}
        misalignedCount={misalignedCount}
      />

      {showBulkRenameModal && (
        <BulkRenameModal
          selectedElements={elements.filter(el => selectedElementIds.includes(el.id))}
          allElements={elements}
          onApply={async (renames) => {
            const newElements = elements.map(el => {
              const rename = renames.find(r => r.id === el.id);
              return rename ? { ...el, label: rename.newLabel } : el;
            });
            setElements(newElements);
            setShowBulkRenameModal(false);
            for (const { id, newLabel } of renames) {
              await elementsApi.update(id, { label: newLabel });
            }
          }}
          onCancel={() => setShowBulkRenameModal(false)}
        />
      )}

      {showPatternModal && selectedElementIds.length >= 1 && (
        <PatternGeneratorModal
          templateElement={elements.find(el => el.id === selectedElementIds[0])!}
          existingLabels={elements.map(el => el.label)}
          elementLimit={elementLimit}
          currentElementCount={elements.length}
          onGenerate={handlePatternGenerate}
          onCancel={() => setShowPatternModal(false)}
        />
      )}

      {showResequenceModal && selectedElementIds.length >= 2 && (
        <ResequenceModal
          selectedElements={elements.filter(el => selectedElementIds.includes(el.id))}
          allElements={elements}
          onApply={handleResequenceApply}
          onCancel={() => setShowResequenceModal(false)}
        />
      )}

      <KeyboardShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />

      <TemplateLibrary
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onSelectTemplate={handleApplyTemplate}
        currentElementCount={elements.length}
        elementLimit={elementLimit}
      />

      <DxfImportModal
        isOpen={showDxfImport}
        onClose={() => setShowDxfImport(false)}
        onImport={handleDxfImport}
        currentElementCount={elements.length}
        elementLimit={elementLimit}
      />

      <AutoAlignModal
        isOpen={showAutoAlignModal}
        onClose={() => setShowAutoAlignModal(false)}
        onApply={handleAutoAlignApply}
        correctionPlan={autoAlignCorrectionPlan}
      />

      {showFirstElementModal && pendingElementPlacement && (
        <DimensionsModal
          mode="create"
          elementType={pendingElementPlacement.type as 'bay' | 'flow_rack' | 'full_pallet'}
          initialWidth={ELEMENT_CONFIGS[pendingElementPlacement.type].width}
          initialHeight={ELEMENT_CONFIGS[pendingElementPlacement.type].height}
          onApply={handleFirstElementModalApply}
          onCancel={handleFirstElementModalCancel}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onUndo={toast.onUndo}
          onClose={() => {
            if (toast.onClose) toast.onClose();
            setToast(null);
          }}
        />
      )}
    </div>
  );
}
