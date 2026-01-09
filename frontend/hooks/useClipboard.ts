import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { WarehouseElement, RouteMarker, ElementType, ELEMENT_CONFIGS } from '@/lib/types';
import { elementsApi, routeMarkersApi } from '@/lib/api';
import { PASTE_OFFSET, generateElementLabel, generateMarkerLabel } from '@/lib/designerConstants';

interface UseClipboardOptions {
  elements: WarehouseElement[];
  routeMarkers: RouteMarker[];
  setElements: (elements: WarehouseElement[] | ((prev: WarehouseElement[]) => WarehouseElement[])) => void;
  setRouteMarkers: (markers: RouteMarker[] | ((prev: RouteMarker[]) => RouteMarker[])) => void;
  layout: { id: string } | null;
  currentLayoutId: string | null;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onSavingChange?: (saving: boolean) => void;
}

interface UseClipboardReturn {
  copiedElements: WarehouseElement[];
  copiedMarkers: RouteMarker[];
  copy: (elementIds: string[], markerIds: string[]) => void;
  paste: () => Promise<{ newElementIds: string[]; newMarkerIds: string[] }>;
  hasCopiedContent: boolean;
}

export function useClipboard(options: UseClipboardOptions): UseClipboardReturn {
  const {
    elements,
    routeMarkers,
    setElements,
    setRouteMarkers,
    layout,
    currentLayoutId,
    onSuccess,
    onError,
    onSavingChange,
  } = options;

  const [copiedElements, setCopiedElements] = useState<WarehouseElement[]>([]);
  const [copiedMarkers, setCopiedMarkers] = useState<RouteMarker[]>([]);

  const setSaving = (value: boolean) => onSavingChange?.(value);

  // Copy elements or markers
  const copy = useCallback((elementIds: string[], markerIds: string[]) => {
    if (markerIds.length > 0) {
      const markersToCopy = routeMarkers.filter(m => markerIds.includes(m.id));
      setCopiedMarkers(markersToCopy);
      setCopiedElements([]); // Clear element clipboard
      onSuccess?.(`Copied ${markersToCopy.length} marker${markersToCopy.length > 1 ? 's' : ''}`);
    } else if (elementIds.length > 0) {
      const elementsToCopy = elements.filter(el => elementIds.includes(el.id));
      setCopiedElements(elementsToCopy);
      setCopiedMarkers([]); // Clear marker clipboard
      onSuccess?.(`Copied ${elementsToCopy.length} elements`);
    }
  }, [elements, routeMarkers, onSuccess]);

  // Paste copied content
  const paste = useCallback(async (): Promise<{ newElementIds: string[]; newMarkerIds: string[] }> => {
    if (copiedMarkers.length > 0) {
      return pasteMarkers();
    } else if (copiedElements.length > 0) {
      return pasteElements();
    }
    return { newElementIds: [], newMarkerIds: [] };
  }, [copiedElements, copiedMarkers]);

  // Paste markers
  const pasteMarkers = async (): Promise<{ newElementIds: string[]; newMarkerIds: string[] }> => {
    if (!currentLayoutId) return { newElementIds: [], newMarkerIds: [] };

    const newMarkerIds: string[] = [];
    const newMarkersToAdd: RouteMarker[] = [];

    for (const copiedMarker of copiedMarkers) {
      const tempId = nanoid();
      const markerCount = routeMarkers.filter(m => m.marker_type === copiedMarker.marker_type).length + 1 +
                          newMarkersToAdd.filter(m => m.marker_type === copiedMarker.marker_type).length;
      const label = markerCount === 1
        ? copiedMarker.marker_type.replace('_', ' ')
        : `${copiedMarker.marker_type.replace('_', ' ')} ${markerCount}`;

      const newMarker: RouteMarker = {
        id: tempId,
        layout_id: currentLayoutId,
        marker_type: copiedMarker.marker_type,
        label,
        x_coordinate: copiedMarker.x_coordinate + PASTE_OFFSET,
        y_coordinate: copiedMarker.y_coordinate + PASTE_OFFSET,
        sequence_order: copiedMarker.marker_type === 'cart_parking'
          ? routeMarkers.filter(m => m.marker_type === 'cart_parking').length + 1 +
            newMarkersToAdd.filter(m => m.marker_type === 'cart_parking').length
          : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      newMarkersToAdd.push(newMarker);
      newMarkerIds.push(tempId);
    }

    // Optimistic update
    setRouteMarkers([...routeMarkers, ...newMarkersToAdd]);

    try {
      setSaving(true);
      const createdMarkers = await Promise.all(
        newMarkersToAdd.map(marker =>
          routeMarkersApi.create(currentLayoutId, {
            marker_type: marker.marker_type,
            label: marker.label,
            x_coordinate: marker.x_coordinate,
            y_coordinate: marker.y_coordinate,
            sequence_order: marker.sequence_order,
          })
        )
      );

      // Replace temp markers with real ones
      setRouteMarkers(prev =>
        prev.map(m => {
          const created = createdMarkers.find(
            cm => cm.marker_type === m.marker_type && Math.abs(cm.x_coordinate - m.x_coordinate) < 1
          );
          return created || m;
        })
      );

      onSuccess?.(`Pasted ${createdMarkers.length} marker${createdMarkers.length > 1 ? 's' : ''}`);
      return { newElementIds: [], newMarkerIds: createdMarkers.map(m => m.id) };
    } catch (err) {
      setRouteMarkers(routeMarkers); // Revert
      onError?.('Failed to paste markers');
      return { newElementIds: [], newMarkerIds: [] };
    } finally {
      setSaving(false);
    }
  };

  // Paste elements
  const pasteElements = async (): Promise<{ newElementIds: string[]; newMarkerIds: string[] }> => {
    const newElementIds: string[] = [];
    const newElementsToAdd: WarehouseElement[] = [];

    for (const copiedElement of copiedElements) {
      const tempId = nanoid();
      const config = ELEMENT_CONFIGS[copiedElement.element_type];

      // Generate label considering both existing and elements being pasted
      const combinedElements = [...elements, ...newElementsToAdd];
      const newLabel = generateElementLabel(copiedElement.element_type, combinedElements);

      const newElement: WarehouseElement = {
        id: tempId,
        layout_id: layout?.id || '',
        element_type: copiedElement.element_type,
        label: newLabel,
        x_coordinate: copiedElement.x_coordinate + PASTE_OFFSET,
        y_coordinate: copiedElement.y_coordinate + PASTE_OFFSET,
        width: copiedElement.width,
        height: copiedElement.height,
        rotation: copiedElement.rotation,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      newElementsToAdd.push(newElement);
      newElementIds.push(tempId);
    }

    // Optimistic update
    setElements([...elements, ...newElementsToAdd]);

    try {
      setSaving(true);
      const createdElements = await Promise.all(
        newElementsToAdd.map(el =>
          elementsApi.create({
            layout_id: layout?.id || currentLayoutId || '',
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

      // Build mapping: tempId -> permanentId
      const tempToPermanentIdMap = new Map<string, string>();
      for (let i = 0; i < newElementsToAdd.length; i++) {
        tempToPermanentIdMap.set(newElementsToAdd[i].id, createdElements[i].id);
      }

      // Replace temp elements with real ones
      setElements(currentElements =>
        currentElements.map(el => {
          const permanentId = tempToPermanentIdMap.get(el.id);
          if (permanentId) {
            const createdEl = createdElements.find(c => c.id === permanentId);
            return createdEl || el;
          }
          return el;
        })
      );

      onSuccess?.(`Pasted ${createdElements.length} element${createdElements.length > 1 ? 's' : ''}`);
      return {
        newElementIds: newElementIds.map(tempId => tempToPermanentIdMap.get(tempId) || tempId),
        newMarkerIds: [],
      };
    } catch (err) {
      setElements(elements); // Revert
      onError?.('Failed to paste elements');
      return { newElementIds: [], newMarkerIds: [] };
    } finally {
      setSaving(false);
    }
  };

  return {
    copiedElements,
    copiedMarkers,
    copy,
    paste,
    hasCopiedContent: copiedElements.length > 0 || copiedMarkers.length > 0,
  };
}
