/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
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
import { layoutApi, elementsApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { WarehouseElement, ElementType, Layout, ELEMENT_CONFIGS, LabelDisplayMode } from '@/lib/types';
import { useHistory } from '@/hooks/useHistory';
import { alignElements, AlignmentType } from '@/lib/alignment';

export default function Home() {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);

  // Derived state for current layout object
  const layout = layouts.find(l => l.id === currentLayoutId) || null;

  // History State
  const {
    state: elements,
    set: setElements,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory
  } = useHistory<WarehouseElement[]>([]);

  // Tool State
  const [activeTool, setActiveTool] = useState<'select' | ElementType>('select');

  // Selection State
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);

  // View State
  const [zoom, setZoom] = useState(1);
  const [cursorPos, setCursorPos] = useState<{ x: number, y: number } | undefined>(undefined);
  const [labelDisplayMode, setLabelDisplayMode] = useState<LabelDisplayMode>('all');
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);

  // System State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string>('free');
  const [elementLimit, setElementLimit] = useState<number>(50);

  // Modals & Toasts
  const [showBulkRenameModal, setShowBulkRenameModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [showResequenceModal, setShowResequenceModal] = useState(false);
  const [copiedElements, setCopiedElements] = useState<WarehouseElement[]>([]);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info'; duration?: number; onUndo?: () => void; onClose?: () => void } | null>(null);

  // Delete Undo State
  const deletedElementsRef = useRef<{ elements: WarehouseElement[], index: number } | null>(null);

  // Canvas Ref for exports
  const canvasRef = useRef<WarehouseCanvasRef>(null);

  // Load initial data
  useEffect(() => {
    loadData();
    loadData();
    getUser();
    fetchUserLimits();
  }, []);

  const fetchUserLimits = async () => {
    try {
      const token = localStorage.getItem('token');
      // Default to free if no token (though auth should prevent this)
      if (!token) return;

      const response = await fetch('http://localhost:3001/api/stripe/subscription-status', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUserTier(data.subscription_tier || 'free');

        // Set limits based on tier
        const limits = {
          free: 50,
          pro: 500,
          enterprise: Infinity,
        };
        // @ts-ignore - dynamic key access
        setElementLimit(limits[data.subscription_tier] || 50);
      }
    } catch (error) {
      console.error('Failed to fetch limits:', error);
    }
  };

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      setUserEmail(session.user.email);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch all layouts first
      const layoutsData = await layoutApi.getLayouts();
      setLayouts(layoutsData);

      // If we have layouts but no current selection, select the first one
      let activeId = currentLayoutId;
      if (!activeId && layoutsData.length > 0) {
        activeId = layoutsData[0].id;
        setCurrentLayoutId(activeId);
      }

      // If we have an active layout, fetch its elements
      if (activeId) {
        const elementsData = await layoutApi.getElements(activeId);
        resetHistory(elementsData);
        setError(null);
      } else {
        // No layouts exist? Should not happen as backend creates default, but handle it
        setElements([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Effect to reload elements when layout changes
  useEffect(() => {
    if (currentLayoutId) {
      const fetchElements = async () => {
        try {
          setLoading(true);
          const elementsData = await layoutApi.getElements(currentLayoutId);
          resetHistory(elementsData);
        } catch (err) {
          console.error('Failed to load elements:', err);
          setError('Failed to load elements for this layout');
        } finally {
          setLoading(false);
        }
      };
      fetchElements();
    }
  }, [currentLayoutId]);

  // Layout CRUD Handlers
  const handleLayoutCreate = async (name: string) => {
    try {
      setSaving(true);
      const newLayout = await layoutApi.createLayout({ name });
      setLayouts(prev => [...prev, newLayout]);
      setCurrentLayoutId(newLayout.id); // Switch to new layout
      setToast({ message: 'Layout created', type: 'success' });
    } catch (err) {
      setError('Failed to create layout');
    } finally {
      setSaving(false);
    }
  };

  const handleLayoutRename = async (id: string, name: string) => {
    try {
      setSaving(true);
      const updated = await layoutApi.updateLayout(id, { name });
      setLayouts(prev => prev.map(l => l.id === id ? updated : l));
      setToast({ message: 'Layout renamed', type: 'success' });
    } catch (err) {
      setError('Failed to rename layout');
    } finally {
      setSaving(false);
    }
  };

  const handleLayoutDelete = async (id: string) => {
    try {
      setSaving(true);
      await layoutApi.deleteLayout(id);

      const newLayouts = layouts.filter(l => l.id !== id);
      setLayouts(newLayouts);

      // If we deleted the current layout, switch to another one
      if (currentLayoutId === id) {
        if (newLayouts.length > 0) {
          setCurrentLayoutId(newLayouts[0].id);
        } else {
          setCurrentLayoutId(null);
          setElements([]);
        }
      }
      setToast({ message: 'Layout deleted', type: 'success' });
    } catch (err) {
      setError('Failed to delete layout');
    } finally {
      setSaving(false);
    }
  };

  // Create new element
  const handleElementCreate = useCallback(
    async (x: number, y: number) => {
      if (activeTool === 'select') return;

      const selectedType = activeTool as ElementType;
      const tempId = nanoid();
      const config = ELEMENT_CONFIGS[selectedType];

      // Generate abbreviated label
      const typeCount = elements.filter(el => el.element_type === selectedType).length + 1;
      const abbreviations: Record<ElementType, string> = {
        bay: 'B',
        flow_rack: 'FR',
        full_pallet: 'P',
        text: 'T',
        line: 'L',
        arrow: 'A',
      };
      const abbreviatedLabel = `${abbreviations[selectedType]}${typeCount}`;

      const tempElement: WarehouseElement = {
        id: tempId,
        layout_id: layout?.id || '',
        element_type: selectedType,
        label: abbreviatedLabel,
        x_coordinate: x,
        y_coordinate: y,
        width: config.width,
        height: config.height,
        rotation: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Update state via history
      const newElements = [...elements, tempElement];
      setElements(newElements);

      try {
        setSaving(true);
        const created = await elementsApi.create({
          layout_id: layout?.id || currentLayoutId || '',
          element_type: selectedType,
          label: tempElement.label,
          x_coordinate: x,
          y_coordinate: y,
          rotation: 0,
          width: config.width,
          height: config.height,
        });

        // Replace temp element with real one
        setElements(newElements.map((el) => (el.id === tempId ? created : el)));
      } catch (err) {
        setElements(elements); // Revert to previous state
        // @ts-ignore
        const message = err.data?.message || err.message || 'Failed to create element';
        setError(message);
      } finally {
        setSaving(false);
      }
    },
    [activeTool, layout, elements, setElements]
  );

  // Update element
  const handleElementUpdate = useCallback(
    async (
      id: string,
      updates: { x_coordinate?: number; y_coordinate?: number; rotation?: number; label?: string; width?: number; height?: number }
    ) => {
      const updatedElements = elements.map((el) =>
        el.id === id
          ? {
            ...el,
            ...(updates.x_coordinate !== undefined && { x_coordinate: updates.x_coordinate }),
            ...(updates.y_coordinate !== undefined && { y_coordinate: updates.y_coordinate }),
            ...(updates.rotation !== undefined && { rotation: updates.rotation }),
            ...(updates.label !== undefined && { label: updates.label }),
            ...(updates.width !== undefined && { width: updates.width }),
            ...(updates.height !== undefined && { height: updates.height }),
          }
          : el
      );

      setElements(updatedElements);

      try {
        setSaving(true);
        await elementsApi.update(id, updates);
      } catch (err) {
        setElements(elements); // Revert
        setError(err instanceof Error ? err.message : 'Failed to update element');
      } finally {
        setSaving(false);
      }
    },
    [elements, setElements]
  );

  // Delete element(s)
  const handleElementDelete = useCallback(async () => {
    if (selectedElementIds.length === 0) return;

    const elementsToDelete = elements.filter((el) => selectedElementIds.includes(el.id));
    if (elementsToDelete.length === 0) return;

    // Optimistically remove from UI
    const remainingElements = elements.filter((el) => !selectedElementIds.includes(el.id));
    setElements(remainingElements);
    setSelectedElementIds([]);

    try {
      setSaving(true);
      // Execute delete immediately to prevent data loss on refresh
      await Promise.all(elementsToDelete.map((el) => elementsApi.delete(el.id)));

      setToast({
        message: `Deleted ${elementsToDelete.length} element${elementsToDelete.length > 1 ? 's' : ''}`,
        type: 'success',
        duration: 5000,
        onUndo: async () => {
          // 1. Optimistically restore to UI (using old IDs temporarily)
          setElements((prev) => [...prev, ...elementsToDelete]);
          setToast(null);

          try {
            setSaving(true);
            // 2. Re-create elements on backend to get new permanent IDs
            const restoredElements = await Promise.all(elementsToDelete.map(el => elementsApi.create({
              element_type: el.element_type,
              label: el.label,
              x_coordinate: el.x_coordinate,
              y_coordinate: el.y_coordinate,
              rotation: el.rotation,
              width: el.width,
              height: el.height
            })));

            // 3. Update local state with the new, real IDs from backend
            setElements(current => current.map(el => {
              // If this element is one of the ones we just "restored" with an old ID
              const matchIndex = elementsToDelete.findIndex(d => d.id === el.id);
              if (matchIndex !== -1) {
                return restoredElements[matchIndex];
              }
              return el;
            }));
          } catch (err) {
            console.error('Undo failed:', err);
            setError('Failed to restore elements. Please try again.');
            loadData(); // Fallback to ensure consistency
          } finally {
            setSaving(false);
          }
        }
      });
    } catch (err) {
      console.error('Delete error:', err);
      // Revert optimistic update on failure
      setElements(elements);
      setError('Failed to delete elements. Please try again.');
      // Reload data to ensure sync
      loadData();
    } finally {
      setSaving(false);
    }
  }, [selectedElementIds, elements, setElements]);

  // Copy & Paste
  const handleCopy = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    const elementsToCopy = elements.filter((el) => selectedElementIds.includes(el.id));
    setCopiedElements(elementsToCopy);
    setToast({ message: `Copied ${elementsToCopy.length} elements`, type: 'success' });
  }, [selectedElementIds, elements]);

  const handlePaste = useCallback(async () => {
    if (copiedElements.length === 0) return;

    const newElementIds: string[] = [];
    const PASTE_OFFSET = 20;
    const newElementsToAdd: WarehouseElement[] = [];

    for (const copiedElement of copiedElements) {
      const tempId = nanoid();
      const config = ELEMENT_CONFIGS[copiedElement.element_type];

      const typeCount = elements.filter(el => el.element_type === copiedElement.element_type).length + 1 + newElementsToAdd.filter(el => el.element_type === copiedElement.element_type).length;
      const abbreviations: Record<ElementType, string> = {
        bay: 'B',
        flow_rack: 'FR',
        full_pallet: 'P',
        text: 'T',
        line: 'L',
        arrow: 'A'
      };
      const newLabel = `${abbreviations[copiedElement.element_type]}${typeCount}`;

      const newElement: WarehouseElement = {
        id: tempId,
        layout_id: layout?.id || '',
        element_type: copiedElement.element_type,
        label: newLabel,
        x_coordinate: copiedElement.x_coordinate + PASTE_OFFSET,
        y_coordinate: copiedElement.y_coordinate + PASTE_OFFSET,
        width: config.width,
        height: config.height,
        rotation: copiedElement.rotation,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      newElementsToAdd.push(newElement);
      newElementIds.push(tempId);
    }

    const updatedElements = [...elements, ...newElementsToAdd];
    setElements(updatedElements);
    setSelectedElementIds(newElementIds);

    try {
      setSaving(true);
      // Create all on backend
      const createdElements = await Promise.all(newElementsToAdd.map(el => elementsApi.create({
        layout_id: layout?.id || currentLayoutId || '',
        element_type: el.element_type,
        label: el.label,
        x_coordinate: el.x_coordinate,
        y_coordinate: el.y_coordinate,
        rotation: el.rotation,
      })));

      // Update IDs
      const finalElements = updatedElements.map(el => {
        const created = createdElements.find(c => c.label === el.label && c.element_type === el.element_type); // Simple matching
        // Better matching: use index
        return created ? created : el;
      });

      // Actually, simpler to just reload or map carefully.
      // For now, let's just assume success and reload if critical, but we need IDs for future updates.
      // Let's reload data to be safe and get real IDs
      await loadData();
    } catch (err) {
      setElements(elements); // Revert
      setError('Failed to paste elements');
    } finally {
      setSaving(false);
    }
  }, [copiedElements, elements, layout, setElements]);

  // Menu Actions
  const handleMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'save':
        // Auto-save is implemented, but we can force a save or show success
        setToast({ message: 'Layout saved successfully', type: 'success' });
        break;
      case 'export_png':
        canvasRef.current?.exportAsPNG();
        setToast({ message: 'Exported as PNG', type: 'success', duration: 2000 });
        break;
      case 'export_pdf':
        canvasRef.current?.exportAsPDF();
        setToast({ message: 'Exported as PDF', type: 'success', duration: 2000 });
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
        handleElementDelete();
        break;
      case 'copy':
        handleCopy();
        break;
      case 'paste':
        handlePaste();
        break;
      case 'delete':
        handleElementDelete();
        break;
      case 'select_all':
        setSelectedElementIds(elements.map(el => el.id));
        break;
      case 'zoom_in':
        setZoom(z => Math.min(z * 1.2, 5));
        break;
      case 'zoom_out':
        setZoom(z => Math.max(z / 1.2, 0.1));
        break;
      case 'zoom_fit':
        setZoom(1); // Todo: Implement real fit logic
        break;
      case 'toggle_grid':
        setShowGrid(prev => !prev);
        break;
      case 'toggle_snap':
        setSnapToGrid(prev => !prev);
        setToast({ message: `Snap to Grid: ${!snapToGrid ? 'On' : 'Off'}`, type: 'info' });
        break;
      case 'help_shortcuts':
        setShowShortcutsModal(true);
        break;
      case 'help_about':
        setToast({ 
          message: 'SlottingPRO v1.0 - Warehouse Heatmap Designer', 
          type: 'info',
          duration: 3000
        });
        break;
      case 'generate_pattern':
        if (selectedElementIds.length >= 1) {
          setShowPatternModal(true);
        } else {
          setToast({ message: 'Select at least 1 element to use as a template', type: 'info' });
        }
        break;
      case 'resequence':
        if (selectedElementIds.length >= 2) {
          setShowResequenceModal(true);
        } else {
          setToast({ message: 'Select at least 2 elements to resequence', type: 'info' });
        }
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [canUndo, canRedo, undo, redo, handleCopy, handleElementDelete, handlePaste, elements, snapToGrid, selectedElementIds]);

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

    // Save changes
    // Note: In a real app, we'd batch update these
    aligned.forEach(el => {
      elementsApi.update(el.id, { x_coordinate: el.x_coordinate, y_coordinate: el.y_coordinate });
    });
  }, [selectedElementIds, elements, setElements]);

  // Pattern Generation - bulk create elements from a template
  const handlePatternGenerate = useCallback(async (generatedElements: GeneratedElementData[]) => {
    if (generatedElements.length === 0) return;

    // Create temporary elements with temp IDs for optimistic update
    const tempElements: WarehouseElement[] = generatedElements.map((el, index) => ({
      id: `temp-${nanoid()}`,
      layout_id: layout?.id || currentLayoutId || '',
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

    // Optimistic update
    const newElements = [...elements, ...tempElements];
    setElements(newElements);
    setShowPatternModal(false);

    try {
      setSaving(true);

      // Create all elements on backend
      const createdElements = await Promise.all(
        generatedElements.map(el =>
          elementsApi.create({
            layout_id: layout?.id || currentLayoutId || '',
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

      // Replace temp elements with real ones
      const finalElements = elements.concat(createdElements);
      setElements(finalElements);

      // Select all newly created elements
      setSelectedElementIds(createdElements.map(el => el.id));

      setToast({
        message: `Generated ${createdElements.length} elements`,
        type: 'success',
      });
    } catch (err) {
      // Revert on error
      setElements(elements);
      // @ts-ignore
      const message = err.data?.message || err.message || 'Failed to generate elements';
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [elements, layout, currentLayoutId, setElements]);

  // Re-sequence - bulk rename elements based on position
  const handleResequenceApply = useCallback(async (renames: { id: string; newLabel: string }[]) => {
    if (renames.length === 0) return;

    // Optimistic update
    const newElements = elements.map(el => {
      const rename = renames.find(r => r.id === el.id);
      return rename ? { ...el, label: rename.newLabel } : el;
    });
    setElements(newElements);
    setShowResequenceModal(false);

    try {
      setSaving(true);

      // Update all on backend
      await Promise.all(
        renames.map(({ id, newLabel }) =>
          elementsApi.update(id, { label: newLabel })
        )
      );

      setToast({
        message: `Renamed ${renames.length} elements`,
        type: 'success',
      });
    } catch (err) {
      // Revert on error
      setElements(elements);
      setError('Failed to rename elements');
    } finally {
      setSaving(false);
    }
  }, [elements, setElements]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              if (canRedo) redo();
            } else {
              if (canUndo) undo();
            }
            break;
          case 'y':
            e.preventDefault();
            if (canRedo) redo();
            break;
          case 'a':
            e.preventDefault();
            handleMenuAction('select_all');
            break;
          case 's':
            e.preventDefault();
            handleMenuAction('save');
            break;
          case 'c':
            e.preventDefault();
            handleCopy();
            break;
          case 'v':
            e.preventDefault();
            handlePaste();
            break;
          case 'x':
            e.preventDefault();
            handleMenuAction('cut');
            break;
        }
      } else {
        switch (e.key.toLowerCase()) {
          case 'delete':
            e.preventDefault();
            handleElementDelete();
            break;
          case 'g':
            // G - Generate pattern (requires at least 1 element selected)
            if (selectedElementIds.length >= 1) {
              e.preventDefault();
              setShowPatternModal(true);
            }
            break;
          case 'r':
            // R - Resequence selection (requires at least 2 elements selected)
            if (selectedElementIds.length >= 2) {
              e.preventDefault();
              setShowResequenceModal(true);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, handleMenuAction, handleCopy, handlePaste, handleElementDelete, selectedElementIds]);

  if (loading) {
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
      <Header title="Warehouse Designer" subtitle={`${layout?.name || 'Untitled Layout'} • Layout Editor`} />

      <MenuBar
        layoutName={layout?.name || 'Untitled Layout'}
        onAction={handleMenuAction}
        headerContent={
          <LayoutManager
            layouts={layouts}
            currentLayoutId={currentLayoutId}
            onLayoutSelect={setCurrentLayoutId}
            onLayoutCreate={handleLayoutCreate}
            onLayoutRename={handleLayoutRename}
            onLayoutDelete={handleLayoutDelete}
          />
        }
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTool={activeTool} onSelectTool={setActiveTool} />

        <main className="flex-1 relative bg-[#0a0f1e] overflow-hidden">
          <WarehouseCanvas
            ref={canvasRef}
            elements={elements}
            selectedType={activeTool !== 'select' ? (activeTool as ElementType) : null}
            selectedElementIds={selectedElementIds}
            labelDisplayMode={labelDisplayMode}
            onElementClick={(id: string, ctrl: boolean, meta: boolean) => {
              // If in placement mode (drawing), auto-switch to select mode
              if (activeTool !== 'select') {
                setActiveTool('select');
                setSelectedElementIds([id]);
                return;
              }

              // If clicking the only selected element, deselect it
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
            onElementUpdate={handleElementUpdate}
            onCanvasClick={() => setSelectedElementIds([])}
            canvasWidth={layout?.canvas_width || 1200}
            canvasHeight={layout?.canvas_height || 800}
            onZoomChange={setZoom}
            onCursorMove={(x, y) => setCursorPos({ x, y })}
          />

          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-900/90 border border-red-500 text-white px-4 py-3 rounded shadow-xl flex items-center gap-4 z-50 max-w-md">
              <div className="flex flex-col">
                <span className="font-bold">{error}</span>
                {/* Check if error message contains suggestion or if we have a specific flag (we'd need state for that, but simple text check works for now) */}
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

              <button onClick={() => setError(null)} className="font-bold hover:text-red-200 ml-2">✕</button>
            </div>
          )}
        </main>

        <aside className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col z-30">
          <PropertiesPanel
            element={selectedElementIds.length === 1 ? elements.find(el => el.id === selectedElementIds[0]) || null : null}
            selectedCount={selectedElementIds.length}
            onUpdate={handleElementUpdate}
            onGeneratePattern={selectedElementIds.length >= 1 ? () => setShowPatternModal(true) : undefined}
            onResequence={selectedElementIds.length >= 2 ? () => setShowResequenceModal(true) : undefined}
          />
          {/* Add Alignment Controls here if needed, or in a separate toolbar */}
        </aside>
      </div>

      <StatusBar
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(z * 1.2, 5))}
        onZoomOut={() => setZoom(z => Math.max(z / 1.2, 0.1))}
        onFit={() => setZoom(1)}
        saving={saving}
        elementCount={elements.length}
        selectionCount={selectedElementIds.length}
        cursorPos={cursorPos}
        elementLimit={elementLimit}
        userTier={userTier}
      />

      {showBulkRenameModal && (
        <BulkRenameModal
          selectedElements={elements.filter((el) => selectedElementIds.includes(el.id))}
          allElements={elements}
          onApply={async (renames) => {
            // Bulk rename logic
            const newElements = elements.map(el => {
              const rename = renames.find(r => r.id === el.id);
              return rename ? { ...el, label: rename.newLabel } : el;
            });
            setElements(newElements);
            setShowBulkRenameModal(false);
            // Save
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
