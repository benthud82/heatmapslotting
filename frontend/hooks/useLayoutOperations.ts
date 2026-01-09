import { useState, useCallback } from 'react';
import { Layout, WarehouseElement, RouteMarker } from '@/lib/types';
import { layoutApi, routeMarkersApi } from '@/lib/api';

interface UseLayoutOperationsOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  resetHistory?: (state: { elements: WarehouseElement[]; routeMarkers: RouteMarker[] }) => void;
}

interface UseLayoutOperationsReturn {
  layouts: Layout[];
  currentLayoutId: string | null;
  currentLayout: Layout | null;
  loading: boolean;
  saving: boolean;
  setCurrentLayoutId: (id: string | null) => void;
  loadLayouts: () => Promise<void>;
  loadLayoutData: (layoutId: string) => Promise<{ elements: WarehouseElement[]; routeMarkers: RouteMarker[] }>;
  createLayout: (name: string) => Promise<void>;
  renameLayout: (id: string, name: string) => Promise<void>;
  deleteLayout: (id: string) => Promise<void>;
}

export function useLayoutOperations(options: UseLayoutOperationsOptions = {}): UseLayoutOperationsReturn {
  const { onSuccess, onError, resetHistory } = options;

  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Derived current layout
  const currentLayout = layouts.find(l => l.id === currentLayoutId) || null;

  // Load all layouts for the user
  const loadLayouts = useCallback(async () => {
    try {
      setLoading(true);
      const layoutsData = await layoutApi.getLayouts();
      setLayouts(layoutsData);

      // Auto-select first layout if none selected
      if (!currentLayoutId && layoutsData.length > 0) {
        setCurrentLayoutId(layoutsData[0].id);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to load layouts');
    } finally {
      setLoading(false);
    }
  }, [currentLayoutId, onError]);

  // Load elements and route markers for a specific layout
  const loadLayoutData = useCallback(async (layoutId: string): Promise<{ elements: WarehouseElement[]; routeMarkers: RouteMarker[] }> => {
    try {
      setLoading(true);
      const elementsData = await layoutApi.getElements(layoutId);

      let markersData: RouteMarker[] = [];
      try {
        markersData = await routeMarkersApi.getMarkers(layoutId);
      } catch (markerErr) {
        console.error('Failed to load route markers:', markerErr);
      }

      const state = { elements: elementsData, routeMarkers: markersData };
      resetHistory?.(state);
      return state;
    } catch (err) {
      onError?.('Failed to load elements for this layout');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onError, resetHistory]);

  // Create a new layout
  const createLayout = useCallback(async (name: string) => {
    try {
      setSaving(true);
      const newLayout = await layoutApi.createLayout({ name });
      setLayouts(prev => [...prev, newLayout]);
      setCurrentLayoutId(newLayout.id);
      onSuccess?.('Layout created');
    } catch (err) {
      onError?.('Failed to create layout');
    } finally {
      setSaving(false);
    }
  }, [onSuccess, onError]);

  // Rename a layout
  const renameLayout = useCallback(async (id: string, name: string) => {
    try {
      setSaving(true);
      const updated = await layoutApi.updateLayout(id, { name });
      setLayouts(prev => prev.map(l => l.id === id ? updated : l));
      onSuccess?.('Layout renamed');
    } catch (err) {
      onError?.('Failed to rename layout');
    } finally {
      setSaving(false);
    }
  }, [onSuccess, onError]);

  // Delete a layout
  const deleteLayout = useCallback(async (id: string) => {
    try {
      setSaving(true);
      await layoutApi.deleteLayout(id);

      const newLayouts = layouts.filter(l => l.id !== id);
      setLayouts(newLayouts);

      // Switch to another layout if we deleted the current one
      if (currentLayoutId === id) {
        if (newLayouts.length > 0) {
          setCurrentLayoutId(newLayouts[0].id);
        } else {
          setCurrentLayoutId(null);
          resetHistory?.({ elements: [], routeMarkers: [] });
        }
      }
      onSuccess?.('Layout deleted');
    } catch (err) {
      onError?.('Failed to delete layout');
    } finally {
      setSaving(false);
    }
  }, [layouts, currentLayoutId, onSuccess, onError, resetHistory]);

  return {
    layouts,
    currentLayoutId,
    currentLayout,
    loading,
    saving,
    setCurrentLayoutId,
    loadLayouts,
    loadLayoutData,
    createLayout,
    renameLayout,
    deleteLayout,
  };
}
