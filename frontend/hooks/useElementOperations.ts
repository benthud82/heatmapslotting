import { useCallback, useState } from 'react';
import { nanoid } from 'nanoid';
import { WarehouseElement, ElementType, ELEMENT_CONFIGS, Layout } from '@/lib/types';
import { elementsApi } from '@/lib/api';
import { generateElementLabel, isPickableType, isValidUUID } from '@/lib/designerConstants';

interface UseElementOperationsOptions {
  layout: Layout | null;
  currentLayoutId: string | null;
  elements: WarehouseElement[];
  setElements: (elements: WarehouseElement[] | ((prev: WarehouseElement[]) => WarehouseElement[])) => void;
  customElementDefaults: Record<string, { width: number; height: number }>;
  setCustomElementDefaults: React.Dispatch<React.SetStateAction<Record<string, { width: number; height: number }>>>;
  elementRotationDefaults: Record<string, number>;
  setElementRotationDefaults: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onSavingChange?: (saving: boolean) => void;
}

interface UseElementOperationsReturn {
  // Check if this is the first element of a pickable type
  isFirstOfType: (type: ElementType) => boolean;
  // Get effective dimensions for an element type
  getEffectiveDimensions: (type: ElementType) => { width: number; height: number };
  // Get effective rotation for an element type
  getEffectiveRotation: (type: ElementType) => number;
  // Create a new element
  createElement: (x: number, y: number, type: ElementType) => Promise<void>;
  // Update an element
  updateElement: (id: string, updates: Partial<WarehouseElement>) => Promise<void>;
  // Update multiple elements at once
  updateMultipleElements: (updates: Array<{ id: string; changes: Partial<WarehouseElement> }>) => Promise<void>;
  // Delete selected elements
  deleteElements: (ids: string[], onUndo?: () => Promise<void>) => Promise<void>;
  // Batch update dimensions for all elements of a type
  batchUpdateDimensions: (type: ElementType, dimensions: { width: number; height: number }) => Promise<void>;
  // Create element with custom dimensions (for first-element modal)
  createWithDimensions: (x: number, y: number, type: ElementType, dimensions: { width: number; height: number }) => Promise<void>;
}

export function useElementOperations(options: UseElementOperationsOptions): UseElementOperationsReturn {
  const {
    layout,
    currentLayoutId,
    elements,
    setElements,
    customElementDefaults,
    setCustomElementDefaults,
    elementRotationDefaults,
    setElementRotationDefaults,
    onSuccess,
    onError,
    onSavingChange,
  } = options;

  const setSaving = (value: boolean) => onSavingChange?.(value);

  // Check if first of pickable type
  const isFirstOfType = useCallback((type: ElementType): boolean => {
    if (!isPickableType(type)) return false;
    return !elements.some(el => el.element_type === type);
  }, [elements]);

  // Get effective dimensions
  const getEffectiveDimensions = useCallback((type: ElementType): { width: number; height: number } => {
    if (customElementDefaults[type]) {
      return customElementDefaults[type];
    }
    return { width: ELEMENT_CONFIGS[type].width, height: ELEMENT_CONFIGS[type].height };
  }, [customElementDefaults]);

  // Get effective rotation (remembers last-used rotation per element type)
  const getEffectiveRotation = useCallback((type: ElementType): number => {
    return elementRotationDefaults[type] ?? 0;
  }, [elementRotationDefaults]);

  // Create temp element helper
  const createTempElement = (x: number, y: number, type: ElementType, dimensions: { width: number; height: number }, rotation: number): WarehouseElement => ({
    id: nanoid(),
    layout_id: layout?.id || '',
    element_type: type,
    label: generateElementLabel(type, elements),
    x_coordinate: x,
    y_coordinate: y,
    width: dimensions.width,
    height: dimensions.height,
    rotation,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Create a new element
  const createElement = useCallback(async (x: number, y: number, type: ElementType) => {
    const dimensions = getEffectiveDimensions(type);
    const rotation = getEffectiveRotation(type);
    const tempElement = createTempElement(x, y, type, dimensions, rotation);
    const tempId = tempElement.id;

    // Optimistic update
    const newElements = [...elements, tempElement];
    setElements(newElements);

    try {
      setSaving(true);
      const created = await elementsApi.create({
        layout_id: layout?.id || currentLayoutId || '',
        element_type: type,
        label: tempElement.label,
        x_coordinate: x,
        y_coordinate: y,
        rotation,
        width: dimensions.width,
        height: dimensions.height,
      });

      // Replace temp with real
      setElements(newElements.map(el => el.id === tempId ? created : el));
    } catch (err) {
      setElements(elements); // Revert
      const message = (err as { data?: { message?: string }; message?: string })?.data?.message ||
                      (err as Error)?.message || 'Failed to create element';
      onError?.(message);
    } finally {
      setSaving(false);
    }
  }, [elements, layout, currentLayoutId, getEffectiveDimensions, getEffectiveRotation, setElements, onError]);

  // Create with custom dimensions
  const createWithDimensions = useCallback(async (
    x: number,
    y: number,
    type: ElementType,
    dimensions: { width: number; height: number }
  ) => {
    // Store as custom default
    setCustomElementDefaults(prev => ({ ...prev, [type]: dimensions }));

    const rotation = getEffectiveRotation(type);
    const tempElement = createTempElement(x, y, type, dimensions, rotation);
    const tempId = tempElement.id;

    // Optimistic update
    const newElements = [...elements, tempElement];
    setElements(newElements);

    try {
      setSaving(true);
      const created = await elementsApi.create({
        layout_id: layout?.id || currentLayoutId || '',
        element_type: type,
        label: tempElement.label,
        x_coordinate: x,
        y_coordinate: y,
        rotation,
        width: dimensions.width,
        height: dimensions.height,
      });

      setElements(newElements.map(el => el.id === tempId ? created : el));
      const config = ELEMENT_CONFIGS[type];
      onSuccess?.(`Created ${config.displayName} (${dimensions.width}" × ${dimensions.height}")`);
    } catch (err) {
      setElements(elements); // Revert
      const message = (err as { data?: { message?: string }; message?: string })?.data?.message ||
                      (err as Error)?.message || 'Failed to create element';
      onError?.(message);
    } finally {
      setSaving(false);
    }
  }, [elements, layout, currentLayoutId, setElements, setCustomElementDefaults, getEffectiveRotation, onSuccess, onError]);

  // Update an element
  const updateElement = useCallback(async (
    id: string,
    updates: Partial<WarehouseElement>
  ) => {
    // Find the element to get its type for rotation memory
    const element = elements.find(el => el.id === id);

    // Remember rotation for this element type when rotation changes
    if (updates.rotation !== undefined && element) {
      setElementRotationDefaults(prev => ({
        ...prev,
        [element.element_type]: updates.rotation as number,
      }));
    }

    const updatedElements = elements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    );
    setElements(updatedElements);

    try {
      setSaving(true);
      await elementsApi.update(id, updates);
    } catch (err) {
      setElements(elements); // Revert
      onError?.(err instanceof Error ? err.message : 'Failed to update element');
    } finally {
      setSaving(false);
    }
  }, [elements, setElements, setElementRotationDefaults, onError]);

  // Update multiple elements
  const updateMultipleElements = useCallback(async (
    updates: Array<{ id: string; changes: Partial<WarehouseElement> }>
  ) => {
    const updatedElements = elements.map(el => {
      const update = updates.find(u => u.id === el.id);
      return update ? { ...el, ...update.changes } : el;
    });
    setElements(updatedElements);

    try {
      setSaving(true);
      await Promise.all(updates.map(u => elementsApi.update(u.id, u.changes)));
    } catch (err) {
      setElements(elements); // Revert
      onError?.(err instanceof Error ? err.message : 'Failed to update elements');
    } finally {
      setSaving(false);
    }
  }, [elements, setElements, onError]);

  // Delete elements with undo support
  const deleteElements = useCallback(async (
    ids: string[],
    onUndo?: () => Promise<void>
  ) => {
    const elementsToDelete = elements.filter(el => ids.includes(el.id));
    if (elementsToDelete.length === 0) return;

    const remainingElements = elements.filter(el => !ids.includes(el.id));
    setElements(remainingElements);

    try {
      setSaving(true);
      await Promise.all(elementsToDelete.map(el => elementsApi.delete(el.id)));
      onSuccess?.(`Deleted ${elementsToDelete.length} element${elementsToDelete.length > 1 ? 's' : ''}`);
    } catch (err) {
      setElements(elements); // Revert
      onError?.('Failed to delete elements. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [elements, setElements, onSuccess, onError]);

  // Batch update dimensions
  const batchUpdateDimensions = useCallback(async (
    type: ElementType,
    dimensions: { width: number; height: number }
  ) => {
    const allOfType = elements.filter(el => el.element_type === type);
    const validElements = allOfType.filter(el => isValidUUID(el.id));

    if (allOfType.length === 0) return;

    // Optimistic update
    const updatedElements = elements.map(el =>
      el.element_type === type ? { ...el, ...dimensions } : el
    );
    setElements(updatedElements);

    // Also update custom defaults
    setCustomElementDefaults(prev => ({ ...prev, [type]: dimensions }));

    if (validElements.length > 0) {
      try {
        setSaving(true);
        await Promise.all(
          validElements.map(el => elementsApi.update(el.id, dimensions))
        );

        const typeName = ELEMENT_CONFIGS[type]?.displayName || type;
        onSuccess?.(
          `Updated ${allOfType.length} ${typeName.toLowerCase()}${allOfType.length > 1 ? 's' : ''} to ${dimensions.width}" × ${dimensions.height}"`
        );
      } catch (err) {
        setElements(elements); // Revert
        onError?.(err instanceof Error ? err.message : 'Failed to update elements');
      } finally {
        setSaving(false);
      }
    } else {
      const typeName = ELEMENT_CONFIGS[type]?.displayName || type;
      onSuccess?.(
        `Updated ${allOfType.length} ${typeName.toLowerCase()}${allOfType.length > 1 ? 's' : ''} to ${dimensions.width}" × ${dimensions.height}"`
      );
    }
  }, [elements, setElements, setCustomElementDefaults, onSuccess, onError]);

  return {
    isFirstOfType,
    getEffectiveDimensions,
    getEffectiveRotation,
    createElement,
    updateElement,
    updateMultipleElements,
    deleteElements,
    batchUpdateDimensions,
    createWithDimensions,
  };
}
