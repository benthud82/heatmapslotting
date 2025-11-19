'use client';

import { useEffect, useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import WarehouseCanvas from '@/components/WarehouseCanvas';
import Sidebar from '@/components/Designer/Sidebar';
import PropertiesPanel from '@/components/Designer/PropertiesPanel';
import StatusBar from '@/components/Designer/StatusBar';
import MenuBar from '@/components/Designer/MenuBar';
import BulkRenameModal from '@/components/BulkRenameModal';
import Header from '@/components/Header';
import { layoutApi, elementsApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { WarehouseElement, ElementType, Layout, ELEMENT_CONFIGS, LabelDisplayMode } from '@/lib/types';

export default function Home() {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [elements, setElements] = useState<WarehouseElement[]>([]);

  // Tool State
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | ElementType>('select');

  // Selection State
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);

  // View State
  const [zoom, setZoom] = useState(1);
  const [cursorPos, setCursorPos] = useState<{ x: number, y: number } | undefined>(undefined);
  const [labelDisplayMode, setLabelDisplayMode] = useState<LabelDisplayMode>('all');

  // System State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Modals
  const [showBulkRenameModal, setShowBulkRenameModal] = useState(false);
  const [copiedElements, setCopiedElements] = useState<WarehouseElement[]>([]);

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
      setElements(elementsData);
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
      // Only create if active tool is an element type
      if (activeTool === 'select' || activeTool === 'pan') return;

      const selectedType = activeTool as ElementType;
      const tempId = nanoid();
      const config = ELEMENT_CONFIGS[selectedType];

      // Generate abbreviated label based on element type
      const typeCount = elements.filter(el => el.element_type === selectedType).length + 1;
      const abbreviations: Record<ElementType, string> = {
        bay: 'B',
        flow_rack: 'FR',
        full_pallet: 'P',
      };
      const abbreviatedLabel = `${abbreviations[selectedType]}${typeCount}`;

      // Optimistically add to UI
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

      setElements((prev) => [...prev, tempElement]);

      try {
        setSaving(true);
        const created = await elementsApi.create({
          element_type: selectedType,
          label: tempElement.label,
          x_coordinate: x,
          y_coordinate: y,
          rotation: 0,
        });

        // Replace temp element with real one from backend
        setElements((prev) => prev.map((el) => (el.id === tempId ? created : el)));

        // Reset to select tool after placement (optional, maybe keep tool active for multi-place?)
        // setActiveTool('select'); 
      } catch (err) {
        // Revert on error
        setElements((prev) => prev.filter((el) => el.id !== tempId));
        setError(err instanceof Error ? err.message : 'Failed to create element');
        console.error('Create error:', err);
      } finally {
        setSaving(false);
      }
    },
    [activeTool, layout, elements.length]
  );

  // Update element
  const handleElementUpdate = useCallback(
    async (
      id: string,
      updates: { x_coordinate?: number; y_coordinate?: number; rotation?: number; label?: string }
    ) => {
      // Optimistically update UI
      setElements((prev) =>
        prev.map((el) =>
          el.id === id
            ? {
              ...el,
              ...(updates.x_coordinate !== undefined && { x_coordinate: updates.x_coordinate }),
              ...(updates.y_coordinate !== undefined && { y_coordinate: updates.y_coordinate }),
              ...(updates.rotation !== undefined && { rotation: updates.rotation }),
              ...(updates.label !== undefined && { label: updates.label }),
            }
            : el
        )
      );

      try {
        setSaving(true);
        await elementsApi.update(id, updates);
      } catch (err) {
        // Revert on error - reload from server
        await loadData();
        setError(err instanceof Error ? err.message : 'Failed to update element');
        console.error('Update error:', err);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Delete element(s)
  const handleElementDelete = useCallback(async () => {
    if (selectedElementIds.length === 0) return;

    const elementsToDelete = elements.filter((el) => selectedElementIds.includes(el.id));
    if (elementsToDelete.length === 0) return;

    // Optimistically remove from UI
    setElements((prev) => prev.filter((el) => !selectedElementIds.includes(el.id)));
    setSelectedElementIds([]);

    try {
      setSaving(true);
      // Delete all selected elements
      await Promise.all(selectedElementIds.map((id) => elementsApi.delete(id)));
    } catch (err) {
      // Revert on error
      setElements((prev) => [...prev, ...elementsToDelete]);
      setError(err instanceof Error ? err.message : 'Failed to delete element(s)');
      console.error('Delete error:', err);
    } finally {
      setSaving(false);
    }
  }, [selectedElementIds, elements]);

  // Copy selected elements
  const handleCopy = useCallback(() => {
    if (selectedElementIds.length === 0) return;

    const elementsToCopy = elements.filter((el) => selectedElementIds.includes(el.id));
    setCopiedElements(elementsToCopy);
  }, [selectedElementIds, elements]);

  // Paste copied elements
  const handlePaste = useCallback(async () => {
    if (copiedElements.length === 0) return;

    const newElementIds: string[] = [];
    const PASTE_OFFSET = 20; // Offset in pixels for pasted elements

    try {
      setSaving(true);

      for (const copiedElement of copiedElements) {
        const tempId = nanoid();
        const config = ELEMENT_CONFIGS[copiedElement.element_type];

        // Generate next available label for this element type
        const typeCount = elements.filter(el => el.element_type === copiedElement.element_type).length + 1;
        const abbreviations: Record<ElementType, string> = {
          bay: 'B',
          flow_rack: 'FR',
          full_pallet: 'P',
        };
        const newLabel = `${abbreviations[copiedElement.element_type]}${typeCount}`;

        // Create new element with offset position
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

        // Optimistically add to UI
        setElements((prev) => [...prev, newElement]);
        newElementIds.push(tempId);

        // Create on backend
        const created = await elementsApi.create({
          element_type: copiedElement.element_type,
          label: newElement.label,
          x_coordinate: newElement.x_coordinate,
          y_coordinate: newElement.y_coordinate,
          rotation: newElement.rotation,
        });

        // Replace temp element with real one from backend
        setElements((prev) => prev.map((el) => (el.id === tempId ? created : el)));

        // Update the newElementIds with the real ID
        const index = newElementIds.indexOf(tempId);
        if (index !== -1) {
          newElementIds[index] = created.id;
        }
      }

      // Auto-select all newly pasted elements
      setSelectedElementIds(newElementIds);
    } catch (err) {
      // Revert on error
      setElements((prev) => prev.filter((el) => !newElementIds.includes(el.id)));
      setError(err instanceof Error ? err.message : 'Failed to paste elements');
      console.error('Paste error:', err);
    } finally {
      setSaving(false);
    }
  }, [copiedElements, elements, layout]);

  // Keyboard shortcuts: Delete, Ctrl+C, Ctrl+V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Delete key to delete selected element(s)
      if (e.key === 'Delete' && selectedElementIds.length > 0 && !saving) {
        e.preventDefault();
        handleElementDelete();
      }
      // Ctrl+C / Cmd+C to copy
      else if (cmdOrCtrl && e.key === 'c' && selectedElementIds.length > 0) {
        e.preventDefault();
        handleCopy();
      }
      // Ctrl+V / Cmd+V to paste
      else if (cmdOrCtrl && e.key === 'v' && copiedElements.length > 0 && !saving) {
        e.preventDefault();
        handlePaste();
      }
      // V key for Select tool
      else if (e.key === 'v' && !cmdOrCtrl) {
        setActiveTool('select');
      }
      // Spacebar for Pan tool (handled in Canvas, but good to sync state if needed)
      // Note: Canvas handles spacebar press/release for temporary pan
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, copiedElements, handleElementDelete, handleCopy, handlePaste, saving]);

  // Handle element click with multi-select support
  const handleElementClick = useCallback(
    (id: string, ctrlKey: boolean, metaKey: boolean) => {
      // If using a drawing tool, don't select
      if (activeTool !== 'select' && activeTool !== 'pan') return;

      const isMultiSelect = ctrlKey || metaKey;

      if (isMultiSelect) {
        // Toggle selection
        setSelectedElementIds((prev) =>
          prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
        );
      } else {
        // Single select
        setSelectedElementIds([id]);
      }
    },
    [activeTool]
  );

  // Handle bulk rename
  const handleBulkRename = useCallback(async (renames: { id: string; newLabel: string }[]) => {
    try {
      setSaving(true);

      // Apply all renames
      for (const { id, newLabel } of renames) {
        await handleElementUpdate(id, { label: newLabel });
      }

      // Close modal and clear selection
      setShowBulkRenameModal(false);
      setSelectedElementIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename elements');
      console.error('Bulk rename error:', err);
    } finally {
      setSaving(false);
    }
  }, [handleElementUpdate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50 animate-spin"></div>
          </div>
          <p className="text-lg font-mono font-bold text-slate-400 tracking-wider">
            LOADING WAREHOUSE LAYOUT
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Main Header Navigation */}
      <Header
        title="Warehouse Designer"
        subtitle={`${layout?.name || 'Untitled Layout'} • Layout Editor`}
      />

      {/* Top Menu Bar */}
      <MenuBar
        layoutName={layout?.name || 'Untitled Layout'}
      />

      {/* Main Workspace Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <Sidebar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
        />

        {/* Center Canvas Area */}
        <main className="flex-1 relative bg-[#0a0f1e] overflow-hidden">
          <WarehouseCanvas
            elements={elements}
            selectedType={activeTool !== 'select' && activeTool !== 'pan' ? (activeTool as ElementType) : null}
            selectedElementIds={selectedElementIds}
            labelDisplayMode={labelDisplayMode}
            onElementClick={handleElementClick}
            onElementCreate={handleElementCreate}
            onElementUpdate={handleElementUpdate}
            onCanvasClick={() => {
              // Clear element selection but keep tool active
              setSelectedElementIds([]);
            }}
            canvasWidth={layout?.canvas_width || 1200}
            canvasHeight={layout?.canvas_height || 800}
            onZoomChange={setZoom}
            onCursorMove={(x, y) => setCursorPos({ x, y })}
          />

          {/* Error Toast */}
          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-900/90 border border-red-500 text-white px-4 py-2 rounded shadow-xl flex items-center gap-3 z-50">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="font-bold hover:text-red-200">✕</button>
            </div>
          )}
        </main>

        {/* Right Properties Panel */}
        <aside className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col z-30">
          <PropertiesPanel
            element={selectedElementIds.length === 1 ? elements.find(el => el.id === selectedElementIds[0]) || null : null}
            selectedCount={selectedElementIds.length}
            onUpdate={handleElementUpdate}
          />
        </aside>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        zoom={zoom}
        onZoomIn={() => { }} // Zoom logic is internal to Canvas for now, need to refactor if we want external control
        onZoomOut={() => { }}
        onFit={() => { }}
        saving={saving}
        elementCount={elements.length}
        selectionCount={selectedElementIds.length}
        cursorPos={cursorPos}
      />

      {/* Modals */}
      {showBulkRenameModal && (
        <BulkRenameModal
          selectedElements={elements.filter((el) => selectedElementIds.includes(el.id))}
          allElements={elements}
          onApply={handleBulkRename}
          onCancel={() => setShowBulkRenameModal(false)}
        />
      )}
    </div>
  );
}
