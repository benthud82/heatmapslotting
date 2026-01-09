import { useCallback } from 'react';
import { nanoid } from 'nanoid';
import { RouteMarker, RouteMarkerType } from '@/lib/types';
import { routeMarkersApi } from '@/lib/api';
import { generateMarkerLabel } from '@/lib/designerConstants';

interface UseMarkerOperationsOptions {
  currentLayoutId: string | null;
  routeMarkers: RouteMarker[];
  setRouteMarkers: (markers: RouteMarker[] | ((prev: RouteMarker[]) => RouteMarker[])) => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onSavingChange?: (saving: boolean) => void;
  onLoadData?: () => Promise<void>;
}

interface UseMarkerOperationsReturn {
  createMarker: (x: number, y: number, markerType: RouteMarkerType) => Promise<void>;
  updateMarker: (id: string, updates: Partial<RouteMarker>) => Promise<void>;
  deleteMarkers: (ids: string[]) => Promise<void>;
}

export function useMarkerOperations(options: UseMarkerOperationsOptions): UseMarkerOperationsReturn {
  const {
    currentLayoutId,
    routeMarkers,
    setRouteMarkers,
    onSuccess,
    onError,
    onSavingChange,
    onLoadData,
  } = options;

  const setSaving = (value: boolean) => onSavingChange?.(value);

  // Create a route marker
  const createMarker = useCallback(async (x: number, y: number, markerType: RouteMarkerType) => {
    if (!currentLayoutId) return;

    const tempId = nanoid();
    const label = generateMarkerLabel(markerType, routeMarkers);

    // Calculate sequence order for cart parking
    const sequenceOrder = markerType === 'cart_parking'
      ? routeMarkers.filter(m => m.marker_type === 'cart_parking').length + 1
      : undefined;

    const tempMarker: RouteMarker = {
      id: tempId,
      layout_id: currentLayoutId,
      marker_type: markerType,
      label,
      x_coordinate: x,
      y_coordinate: y,
      sequence_order: sequenceOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic update
    setRouteMarkers([...routeMarkers, tempMarker]);

    try {
      setSaving(true);
      const created = await routeMarkersApi.create(currentLayoutId, {
        marker_type: markerType,
        label,
        x_coordinate: x,
        y_coordinate: y,
        sequence_order: sequenceOrder,
      });

      // Replace temp with real
      setRouteMarkers(markers => markers.map(m => m.id === tempId ? created : m));
      onSuccess?.(`${label} placed`);
    } catch (err) {
      // Revert
      setRouteMarkers(markers => markers.filter(m => m.id !== tempId));
      onError?.(err instanceof Error ? err.message : 'Failed to create route marker');
    } finally {
      setSaving(false);
    }
  }, [currentLayoutId, routeMarkers, setRouteMarkers, onSuccess, onError]);

  // Update a route marker
  const updateMarker = useCallback(async (
    id: string,
    updates: Partial<RouteMarker>
  ) => {
    const originalMarkers = [...routeMarkers];

    // Optimistic update
    setRouteMarkers(markers => markers.map(m =>
      m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
    ));

    try {
      setSaving(true);
      await routeMarkersApi.update(id, updates);
    } catch (err) {
      // Revert
      setRouteMarkers(originalMarkers);
      onError?.(err instanceof Error ? err.message : 'Failed to update route marker');
    } finally {
      setSaving(false);
    }
  }, [routeMarkers, setRouteMarkers, onError]);

  // Delete route markers
  const deleteMarkers = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    const markersToDelete = routeMarkers.filter(m => ids.includes(m.id));
    if (markersToDelete.length === 0) return;

    // Optimistic delete
    const remainingMarkers = routeMarkers.filter(m => !ids.includes(m.id));
    setRouteMarkers(remainingMarkers);

    try {
      setSaving(true);
      await Promise.all(markersToDelete.map(marker => routeMarkersApi.delete(marker.id)));
      onSuccess?.(`Deleted ${markersToDelete.length} marker${markersToDelete.length > 1 ? 's' : ''}`);
    } catch (err) {
      console.error('Delete error:', err);
      // Revert
      setRouteMarkers(routeMarkers);
      onError?.('Failed to delete markers. Please try again.');
      // Reload data to ensure sync
      onLoadData?.();
    } finally {
      setSaving(false);
    }
  }, [routeMarkers, setRouteMarkers, onSuccess, onError, onLoadData]);

  return {
    createMarker,
    updateMarker,
    deleteMarkers,
  };
}
