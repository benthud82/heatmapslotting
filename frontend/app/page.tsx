'use client';

import { useEffect, useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import ElementToolbar from '@/components/ElementToolbar';
import WarehouseCanvas from '@/components/WarehouseCanvas';
import ElementPropertiesPanel from '@/components/ElementPropertiesPanel';
import BulkRenameModal from '@/components/BulkRenameModal';
import { layoutApi, elementsApi } from '@/lib/api';
import { WarehouseElement, ElementType, Layout, ELEMENT_CONFIGS, LabelDisplayMode } from '@/lib/types';

export default function Home() {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [elements, setElements] = useState<WarehouseElement[]>([]);
  const [selectedType, setSelectedType] = useState<ElementType | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [labelDisplayMode, setLabelDisplayMode] = useState<LabelDisplayMode>('all');
  const [showBulkRenameModal, setShowBulkRenameModal] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

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
      if (!selectedType) return;

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
      } catch (err) {
        // Revert on error
        setElements((prev) => prev.filter((el) => el.id !== tempId));
        setError(err instanceof Error ? err.message : 'Failed to create element');
        console.error('Create error:', err);
      } finally {
        setSaving(false);
      }
    },
    [selectedType, layout, elements.length]
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

  // Keyboard shortcut: Delete key to delete selected element(s)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only Delete key triggers deletion (not Backspace)
      if (e.key === 'Delete' && selectedElementIds.length > 0 && !saving) {
        e.preventDefault();
        handleElementDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, handleElementDelete, saving]);

  // Handle element click with multi-select support
  const handleElementClick = useCallback(
    (id: string, ctrlKey: boolean, metaKey: boolean) => {
      const isMultiSelect = ctrlKey || metaKey;

      if (isMultiSelect) {
        // Toggle selection
        setSelectedElementIds((prev) =>
          prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
        );
      } else {
        // Single select
        setSelectedElementIds([id]);
        // Show properties panel when single element is selected
        setShowPropertiesPanel(true);
      }
    },
    []
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

  // Auto-show properties panel when single element is selected
  useEffect(() => {
    if (selectedElementIds.length === 1) {
      setShowPropertiesPanel(true);
    } else if (selectedElementIds.length === 0) {
      setShowPropertiesPanel(false);
    }
  }, [selectedElementIds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-slate-700 rounded-lg animate-ping"></div>
            <div className="absolute inset-0 border-4 border-blue-500 rounded-lg animate-spin"></div>
          </div>
          <p className="text-lg font-mono font-bold text-slate-400 tracking-wider">
            LOADING WAREHOUSE LAYOUT
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
                  Warehouse Slotting Designer
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm font-mono text-blue-400">
                    {layout?.name || 'Primary Layout'}
                  </p>
                  <span className="text-slate-600">•</span>
                  <p className="text-xs font-mono text-slate-500">
                    {layout?.canvas_width || 1200} × {layout?.canvas_height || 800} px
                  </p>
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-4">
              {/* Element Count */}
              <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
                <div className="text-xs font-mono text-slate-400">ELEMENTS</div>
                <div className="text-2xl font-bold text-white font-mono">{elements.length}</div>
              </div>

              {/* Save Status */}
              {saving && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 border border-blue-700 rounded-lg">
                  <div className="relative w-5 h-5">
                    <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <span className="text-sm font-mono font-bold text-blue-400">SYNCING</span>
                </div>
              )}

              {!saving && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-700 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-mono font-bold text-green-400">SAVED</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

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

      {/* Toolbar */}
      <ElementToolbar
        selectedType={selectedType}
        onSelectType={setSelectedType}
        onDelete={handleElementDelete}
        hasSelection={selectedElementIds.length > 0}
        selectedCount={selectedElementIds.length}
        onBulkRename={() => setShowBulkRenameModal(true)}
        labelDisplayMode={labelDisplayMode}
        onLabelModeChange={setLabelDisplayMode}
      />

      {/* Main Content with Properties Panel */}
      <div className="flex">
        {/* Canvas */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <WarehouseCanvas
              elements={elements}
              selectedType={selectedType}
              selectedElementIds={selectedElementIds}
              labelDisplayMode={labelDisplayMode}
              onElementClick={handleElementClick}
              onElementCreate={handleElementCreate}
              onElementUpdate={handleElementUpdate}
              onCanvasClick={() => {
                // Clear element selection but keep placement mode active
                setSelectedElementIds([]);
              }}
              canvasWidth={layout?.canvas_width || 1200}
              canvasHeight={layout?.canvas_height || 800}
            />
          </div>
        </main>

        {/* Properties Panel (Sidebar) */}
        {showPropertiesPanel && selectedElementIds.length === 1 && (
          <aside className="w-96 border-l-2 border-slate-800">
            <ElementPropertiesPanel
              element={elements.find((el) => el.id === selectedElementIds[0]) || null}
              allElements={elements}
              onUpdate={handleElementUpdate}
              onClose={() => setShowPropertiesPanel(false)}
            />
          </aside>
        )}
      </div>

      {/* Bulk Rename Modal */}
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
