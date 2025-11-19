'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import WarehouseCanvas, { WarehouseCanvasRef } from '@/components/WarehouseCanvas';
import Sidebar from '@/components/Designer/Sidebar';
import PropertiesPanel from '@/components/Designer/PropertiesPanel';
import StatusBar from '@/components/Designer/StatusBar';
import MenuBar from '@/components/Designer/MenuBar';
import BulkRenameModal from '@/components/BulkRenameModal';
import Header from '@/components/Header';
import KeyboardShortcutsModal from '@/components/designer/KeyboardShortcutsModal';
import Toast from '@/components/ui/Toast';
import { layoutApi, elementsApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { WarehouseElement, ElementType, Layout, ELEMENT_CONFIGS, LabelDisplayMode } from '@/lib/types';
import { useHistory } from '@/hooks/useHistory';
import { alignElements, AlignmentType } from '@/lib/alignment';

export default function Home() {
  const [layout, setLayout] = useState<Layout | null>(null);

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
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | ElementType>('select');

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

  // Modals & Toasts
  const [showBulkRenameModal, setShowBulkRenameModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [copiedElements, setCopiedElements] = useState<WarehouseElement[]>([]);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info'; duration?: number; onUndo?: () => void; onClose?: () => void } | null>(null);

  // Delete Undo State
  const deletedElementsRef = useRef<{ elements: WarehouseElement[], index: number } | null>(null);

  // Canvas Ref for exports
  const canvasRef = useRef<WarehouseCanvasRef>(null);

  // Load initial data
  useEffect(() => {
    loadData();
    getUser();
  }, []);

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      setUserEmail(session.user.email);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [layoutData, elementsData] = await Promise.all([
        layoutApi.getLayout(),
        layoutApi.getElements(),
      ]);
      setLayout(layoutData);
      resetHistory(elementsData); // Initialize history with loaded elements
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create new element
  const handleElementCreate = useCallback(
    async (x: number, y: number) => {
      if (activeTool === 'select' || activeTool === 'pan') return;

      const selectedType = activeTool as ElementType;
      const tempId = nanoid();
      const config = ELEMENT_CONFIGS[selectedType];

      // Generate abbreviated label
      const typeCount = elements.filter(el => el.element_type === selectedType).length + 1;
      const abbreviations: Record<ElementType, string> = {
        bay: 'B',
        flow_rack: 'FR',
        full_pallet: 'P',
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
          element_type: selectedType,
          label: tempElement.label,
          x_coordinate: x,
          y_coordinate: y,
          rotation: 0,
        });

        // Replace temp element with real one
        setElements(newElements.map((el) => (el.id === tempId ? created : el)));
      } catch (err) {
        setElements(elements); // Revert to previous state
        setError(err instanceof Error ? err.message : 'Failed to create element');
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
      updates: { x_coordinate?: number; y_coordinate?: number; rotation?: number; label?: string }
    ) => {
      const updatedElements = elements.map((el) =>
        el.id === id
          ? {
            ...el,
            ...(updates.x_coordinate !== undefined && { x_coordinate: updates.x_coordinate }),
            ...(updates.y_coordinate !== undefined && { y_coordinate: updates.y_coordinate }),
            ...(updates.rotation !== undefined && { rotation: updates.rotation }),
            ...(updates.label !== undefined && { label: updates.label }),
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
  const handleElementDelete = useCallback(() => {
    if (selectedElementIds.length === 0) return;

    const elementsToDelete = elements.filter((el) => selectedElementIds.includes(el.id));
    if (elementsToDelete.length === 0) return;

    // Optimistically remove from UI
    const remainingElements = elements.filter((el) => !selectedElementIds.includes(el.id));
    setElements(remainingElements);
    setSelectedElementIds([]);

    // Show Undo Toast with Delayed Delete (8 seconds)
    setToast({
      message: `Deleted ${elementsToDelete.length} element${elementsToDelete.length > 1 ? 's' : ''}`,
      type: 'info',
      duration: 8000,
      onUndo: () => {
        // Restore elements locally
        setElements((prev) => [...prev, ...elementsToDelete]);
        setToast(null);
        // Note: We do NOT call undo() here because we want to add a "restoration" state to history
        // rather than reverting other potential actions the user took while the toast was open.
        // Also, since we delayed the API call, we don't need to do anything for the backend.
      },
      onClose: async () => {
        // Commit the delete to the backend
        try {
          setSaving(true);
          await Promise.all(elementsToDelete.map((el) => elementsApi.delete(el.id)));
        } catch (err) {
          // If delete fails, we should probably notify the user, but it's tricky since the toast is gone.
          // For now, just log it. In a real app, we might show a new error toast.
          console.error('Delete error:', err);
          setError('Failed to delete elements on server');
          // Force reload to sync
          loadData();
        } finally {
          setSaving(false);
        }
      }
    });
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
      const abbreviations: Record<ElementType, string> = { bay: 'B', flow_rack: 'FR', full_pallet: 'P' };
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
      default:
        console.log('Unknown action:', action);
    }
  }, [canUndo, canRedo, undo, redo, handleCopy, handleElementDelete, handlePaste, elements, snapToGrid]);

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
        if (e.key === 'Delete') {
          e.preventDefault();
          handleElementDelete();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, handleMenuAction, handleCopy, handlePaste, handleElementDelete]);

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

      <MenuBar layoutName={layout?.name || 'Untitled Layout'} onAction={handleMenuAction} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTool={activeTool} onSelectTool={setActiveTool} />

        <main className="flex-1 relative bg-[#0a0f1e] overflow-hidden">
          <WarehouseCanvas
            ref={canvasRef}
            elements={elements}
            selectedType={activeTool !== 'select' && activeTool !== 'pan' ? (activeTool as ElementType) : null}
            selectedElementIds={selectedElementIds}
            labelDisplayMode={labelDisplayMode}
            onElementClick={(id: string, ctrl: boolean, meta: boolean) => {
              if (activeTool !== 'select' && activeTool !== 'pan') return;

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
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-900/90 border border-red-500 text-white px-4 py-2 rounded shadow-xl flex items-center gap-3 z-50">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="font-bold hover:text-red-200">✕</button>
            </div>
          )}
        </main>

        <aside className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col z-30">
          <PropertiesPanel
            element={selectedElementIds.length === 1 ? elements.find(el => el.id === selectedElementIds[0]) || null : null}
            selectedCount={selectedElementIds.length}
            onUpdate={handleElementUpdate}
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
