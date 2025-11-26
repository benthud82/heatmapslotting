/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback, useImperativeHandle } from 'react';
import { Stage, Layer, Rect, Text, Transformer, Line, Group, Arrow } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import { WarehouseElement, ElementType, ELEMENT_CONFIGS, LabelDisplayMode, RouteMarker, RouteMarkerType, ROUTE_MARKER_CONFIGS } from '@/lib/types';
import { findSnapPoints, snapRotation, SNAP_THRESHOLD, getElementEdges } from '@/lib/snapping';
import { getHeatmapColor } from '@/lib/heatmapColors';
import { exportStageAsPNG, exportStageAsPDF } from '@/lib/canvasExport';

// Route marker snapping function with intelligent prioritization
const findRouteMarkerSnapPoints = (
  draggedMarker: { x: number; y: number; width: number; height: number; type: RouteMarkerType },
  routeMarkers: RouteMarker[],
  warehouseElements: WarehouseElement[],
  threshold: number = SNAP_THRESHOLD
): { snapX: number | null; snapY: number | null; snapLines: Array<{ points: number[]; orientation: 'horizontal' | 'vertical' }>; snappedElementIds: string[] } => {
  const result = {
    snapX: null as number | null,
    snapY: null as number | null,
    snapLines: [] as Array<{ points: number[]; orientation: 'horizontal' | 'vertical' }>,
    snappedElementIds: [] as string[]
  };

  if (!routeMarkers.length && !warehouseElements.length) return result;

  const dragEdges = {
    left: draggedMarker.x,
    right: draggedMarker.x + draggedMarker.width,
    centerX: draggedMarker.x + draggedMarker.width / 2,
    top: draggedMarker.y,
    bottom: draggedMarker.y + draggedMarker.height,
    centerY: draggedMarker.y + draggedMarker.height / 2,
  };

  let minXDiff = threshold;
  let minYDiff = threshold;

  // For cart parking: specific snapping logic
  if (draggedMarker.type === 'cart_parking') {
    // Phase 1: Cart-to-cart alignment (High Priority)
    const otherCartParking = routeMarkers.filter(m => m.marker_type === 'cart_parking');

    otherCartParking.forEach((cart) => {
      const cartX = Number(cart.x_coordinate);
      const cartY = Number(cart.y_coordinate);
      const cartWidth = ROUTE_MARKER_CONFIGS.cart_parking.width;
      const cartHeight = ROUTE_MARKER_CONFIGS.cart_parking.height;

      const cartEdges = {
        left: cartX,
        right: cartX + cartWidth,
        centerX: cartX + cartWidth / 2,
        top: cartY,
        bottom: cartY + cartHeight,
        centerY: cartY + cartHeight / 2,
      };

      // X-axis snapping to cart parking
      const xDiffs = [
        { diff: Math.abs(dragEdges.left - cartEdges.left), target: cartEdges.left, offset: dragEdges.left - draggedMarker.x },
        { diff: Math.abs(dragEdges.right - cartEdges.right), target: cartEdges.right, offset: dragEdges.right - draggedMarker.x },
        { diff: Math.abs(dragEdges.centerX - cartEdges.centerX), target: cartEdges.centerX, offset: dragEdges.centerX - draggedMarker.x },
      ];

      // Y-axis snapping to cart parking
      const yDiffs = [
        { diff: Math.abs(dragEdges.top - cartEdges.top), target: cartEdges.top, offset: dragEdges.top - draggedMarker.y },
        { diff: Math.abs(dragEdges.bottom - cartEdges.bottom), target: cartEdges.bottom, offset: dragEdges.bottom - draggedMarker.y },
        { diff: Math.abs(dragEdges.centerY - cartEdges.centerY), target: cartEdges.centerY, offset: dragEdges.centerY - draggedMarker.y },
      ];

      xDiffs.forEach(({ diff, target, offset }) => {
        if (diff < minXDiff) {
          minXDiff = diff;
          result.snapX = target - offset;
          // Line from dragged cart to target cart
          result.snapLines = result.snapLines.filter(l => l.orientation !== 'vertical'); // Replace existing X snap
          result.snapLines.push({
            points: [target, Math.min(dragEdges.top, cartEdges.top) - 20, target, Math.max(dragEdges.bottom, cartEdges.bottom) + 20],
            orientation: 'vertical'
          });
          if (!result.snappedElementIds.includes(cart.id)) result.snappedElementIds.push(cart.id);
        }
      });

      yDiffs.forEach(({ diff, target, offset }) => {
        if (diff < minYDiff) {
          minYDiff = diff;
          result.snapY = target - offset;
          // Line from dragged cart to target cart
          result.snapLines = result.snapLines.filter(l => l.orientation !== 'horizontal'); // Replace existing Y snap
          result.snapLines.push({
            points: [Math.min(dragEdges.left, cartEdges.left) - 20, target, Math.max(dragEdges.right, cartEdges.right) + 20, target],
            orientation: 'horizontal'
          });
          if (!result.snappedElementIds.includes(cart.id)) result.snappedElementIds.push(cart.id);
        }
      });
    });

    // Phase 2: Element Snapping (Sub-snapping)
    const currentX = result.snapX !== null ? result.snapX : draggedMarker.x;
    const currentY = result.snapY !== null ? result.snapY : draggedMarker.y;

    const currentEdges = {
      left: currentX,
      right: currentX + draggedMarker.width,
      centerX: currentX + draggedMarker.width / 2,
      top: currentY,
      bottom: currentY + draggedMarker.height,
      centerY: currentY + draggedMarker.height / 2,
    };

    warehouseElements.forEach((element) => {
      const elementEdges = getElementEdges(element);
      let snappedToElement = false;

      // Rule: Center to Center for Flow Rack or Full Pallet
      if (element.element_type === 'flow_rack' || element.element_type === 'full_pallet') {
        // X-axis Center
        const xDiff = Math.abs(currentEdges.centerX - elementEdges.centerX);
        if (xDiff < minXDiff) {
          minXDiff = xDiff;
          result.snapX = elementEdges.centerX - (dragEdges.centerX - draggedMarker.x);
          result.snapLines = result.snapLines.filter(l => l.orientation !== 'vertical');
          result.snapLines.push({
            points: [
              elementEdges.centerX,
              Math.min(currentEdges.top, elementEdges.top) - 20,
              elementEdges.centerX,
              Math.max(currentEdges.bottom, elementEdges.bottom) + 20
            ],
            orientation: 'vertical'
          });
          snappedToElement = true;
        }

        // Y-axis Center
        const yDiff = Math.abs(currentEdges.centerY - elementEdges.centerY);
        if (yDiff < minYDiff) {
          minYDiff = yDiff;
          result.snapY = elementEdges.centerY - (dragEdges.centerY - draggedMarker.y);
          result.snapLines = result.snapLines.filter(l => l.orientation !== 'horizontal');
          result.snapLines.push({
            points: [
              Math.min(currentEdges.left, elementEdges.left) - 20,
              elementEdges.centerY,
              Math.max(currentEdges.right, elementEdges.right) + 20,
              elementEdges.centerY
            ],
            orientation: 'horizontal'
          });
          snappedToElement = true;
        }
      }

      // Rule: Front of Cart to Leading Edge of Bin (Bay)
      if (element.element_type === 'bay') {
        // Cart Right to Element Left
        const diff1 = Math.abs(currentEdges.right - elementEdges.left);
        if (diff1 < minXDiff) {
          minXDiff = diff1;
          result.snapX = elementEdges.left - (dragEdges.right - draggedMarker.x);
          result.snapLines = result.snapLines.filter(l => l.orientation !== 'vertical');
          result.snapLines.push({
            points: [
              elementEdges.left,
              Math.min(currentEdges.top, elementEdges.top) - 20,
              elementEdges.left,
              Math.max(currentEdges.bottom, elementEdges.bottom) + 20
            ],
            orientation: 'vertical'
          });
          snappedToElement = true;
        }

        // Cart Left to Element Right
        const diff2 = Math.abs(currentEdges.left - elementEdges.right);
        if (diff2 < minXDiff) {
          minXDiff = diff2;
          result.snapX = elementEdges.right - (dragEdges.left - draggedMarker.x);
          result.snapLines = result.snapLines.filter(l => l.orientation !== 'vertical');
          result.snapLines.push({
            points: [
              elementEdges.right,
              Math.min(currentEdges.top, elementEdges.top) - 20,
              elementEdges.right,
              Math.max(currentEdges.bottom, elementEdges.bottom) + 20
            ],
            orientation: 'vertical'
          });
          snappedToElement = true;
        }

        // Center-to-Center Y alignment for Bins
        const yCenterDiff = Math.abs(currentEdges.centerY - elementEdges.centerY);
        if (yCenterDiff < minYDiff) {
          minYDiff = yCenterDiff;
          result.snapY = elementEdges.centerY - (dragEdges.centerY - draggedMarker.y);
          result.snapLines = result.snapLines.filter(l => l.orientation !== 'horizontal');
          result.snapLines.push({
            points: [
              Math.min(currentEdges.left, elementEdges.left) - 20,
              elementEdges.centerY,
              Math.max(currentEdges.right, elementEdges.right) + 20,
              elementEdges.centerY
            ],
            orientation: 'horizontal'
          });
          snappedToElement = true;
        }
      }

      if (snappedToElement) {
        if (!result.snappedElementIds.includes(element.id)) result.snappedElementIds.push(element.id);
      }
    });

  } else {
    // For other markers (start/stop points), use regular warehouse element snapping
    const elementSnapResult = findSnapPoints(
      { x: draggedMarker.x, y: draggedMarker.y, width: draggedMarker.width, height: draggedMarker.height, rotation: 0 },
      warehouseElements,
      threshold
    );
    result.snapX = elementSnapResult.snapX;
    result.snapY = elementSnapResult.snapY;
    // For non-cart_parking markers, we don't currently highlight snapped elements from findSnapPoints
    result.snappedElementIds = [];
  }

  return result;
};

export interface WarehouseCanvasRef {
  exportAsPNG: () => void;
  exportAsPDF: () => void;
  fitToElements: () => void;
}

interface WarehouseCanvasProps {
  elements: WarehouseElement[];
  selectedType: ElementType | RouteMarkerType | null;
  selectedElementIds: string[];
  labelDisplayMode: LabelDisplayMode;
  onElementClick: (id: string, ctrlKey: boolean, metaKey: boolean) => void;
  onElementCreate: (x: number, y: number) => void;
  onElementUpdate: (id: string, updates: { x_coordinate?: number; y_coordinate?: number; rotation?: number; label?: string; width?: number; height?: number }) => void;
  onCanvasClick: () => void;
  canvasWidth?: number;
  canvasHeight?: number;
  isReadOnly?: boolean;
  pickData?: Map<string, number>;
  onZoomChange?: (zoom: number) => void;
  onCursorMove?: (x: number, y: number) => void;
  isHeatmap?: boolean;
  // Route markers
  routeMarkers?: RouteMarker[];
  selectedMarkerId?: string | null;
  onMarkerClick?: (id: string) => void;
  onMarkerCreate?: (x: number, y: number, type: RouteMarkerType) => void;
  onMarkerUpdate?: (id: string, updates: { x_coordinate?: number; y_coordinate?: number; label?: string; sequence_order?: number }) => void;
  // Snapping
  snappingEnabled?: boolean;
  onSnappingToggle?: () => void;
  // Route marker visibility (for heatmap page)
  showRouteMarkers?: boolean;
  onRouteMarkersToggle?: () => void;
}

const WarehouseCanvas = React.forwardRef<WarehouseCanvasRef, WarehouseCanvasProps>(function WarehouseCanvas({
  elements,
  selectedType,
  selectedElementIds,
  labelDisplayMode,
  onElementClick,
  onElementCreate,
  onElementUpdate,
  onCanvasClick,
  canvasWidth = 1200,
  canvasHeight = 800,
  isReadOnly = false,
  pickData,
  onZoomChange,
  onCursorMove,
  isHeatmap = false,
  routeMarkers = [],
  selectedMarkerId,
  onMarkerClick,
  onMarkerCreate,
  onMarkerUpdate,
  snappingEnabled = true,
  onSnappingToggle,
  showRouteMarkers = false,
  onRouteMarkersToggle,
}, ref) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedShapeRef = useRef<Konva.Group>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [editingPosition, setEditingPosition] = useState<{ x: number; y: number } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [cursorCanvasPos, setCursorCanvasPos] = useState<{ x: number; y: number } | null>(null);

  // Zoom and pan state
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Multi-select drag state
  const [isGroupDragging, setIsGroupDragging] = useState(false);
  const [groupDragStart, setGroupDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);

  // Calculate min/max picks for heatmap color scaling
  const { minPicks, maxPicks } = useMemo(() => {
    if (!pickData || pickData.size === 0) {
      return { minPicks: 0, maxPicks: 0 };
    }

    const pickValues = Array.from(pickData.values());
    return {
      minPicks: Math.min(...pickValues),
      maxPicks: Math.max(...pickValues),
    };
  }, [pickData]);

  // Use container dimensions instead of fixed canvas dimensions
  const [containerSize, setContainerSize] = useState({ width: canvasWidth, height: canvasHeight });

  // Update container size when containerRef is available
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Fit view to show all elements with padding
  const fitToElements = useCallback(() => {
    if (elements.length === 0) {
      // No elements, reset to default view
      setStageScale(1);
      setStagePosition({ x: 0, y: 0 });
      return;
    }

    // Calculate bounding box around all elements
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elements.forEach(el => {
      const x = Number(el.x_coordinate);
      const y = Number(el.y_coordinate);
      const width = Number(el.width);
      const height = Number(el.height);

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    // Add padding around the bounding box
    const padding = 100; // Increased padding
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    // Calculate scale to fit content in canvas using container size
    const scaleX = containerSize.width / contentWidth;
    const scaleY = containerSize.height / contentHeight;
    const newScale = Math.min(scaleX, scaleY, 2); // Cap at 2x zoom to avoid too much zoom on few elements

    // Calculate position to center the content
    const contentCenterX = minX + (maxX - minX) / 2;
    const contentCenterY = minY + (maxY - minY) / 2;

    const newPosition = {
      x: containerSize.width / 2 - contentCenterX * newScale,
      y: containerSize.height / 2 - contentCenterY * newScale,
    };

    setStageScale(newScale);
    setStagePosition(newPosition);
  }, [elements, containerSize]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    exportAsPNG: () => {
      if (stageRef.current) {
        exportStageAsPNG(stageRef.current);
      }
    },
    exportAsPDF: () => {
      if (stageRef.current) {
        exportStageAsPDF(stageRef.current);
      }
    },
    fitToElements: () => {
      fitToElements();
    },
  }), [fitToElements]);

  // Update transformer when selection changes (only for single selection)
  useEffect(() => {
    if (transformerRef.current && selectedShapeRef.current && selectedElementIds.length === 1) {
      transformerRef.current.nodes([selectedShapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedElementIds]);

  // Track if initial fit has been done (only fit once on first load)
  const hasInitialFit = useRef(false);

  // Fit to elements ONLY on initial load, not when adding new elements
  useEffect(() => {
    if (elements.length > 0 && !hasInitialFit.current) {
      // Small delay to ensure canvas is mounted
      const timer = setTimeout(() => {
        fitToElements();
        hasInitialFit.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [elements.length, fitToElements]);

  // Keyboard listener for spacebar pan mode (disabled in read-only mode)
  useEffect(() => {
    if (isReadOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isPanning) {
        e.preventDefault();
        setIsPanning(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPanning) {
        e.preventDefault();
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPanning, isReadOnly]);

  // Coordinate conversion utility: screen coordinates → canvas coordinates
  // Accounts for zoom (scale) and pan (position offset)
  const getRelativePointerPosition = () => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return null;

    // Get the transform matrix and invert it to convert screen → canvas
    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point(pointerPosition);
  };

  // Mouse move handler for ghost snapping
  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Track cursor position for ghost preview
    const pos = getRelativePointerPosition();
    if (pos) {
      // If placing a new element, apply snapping to the ghost position
      if (selectedType && !isReadOnly) {
        const isRouteMarker = ['start_point', 'stop_point', 'cart_parking'].includes(selectedType);

        if (isRouteMarker) {
          // Apply intelligent snapping for route markers if enabled
          if (snappingEnabled && selectedType === 'cart_parking') {
            const markerConfig = ROUTE_MARKER_CONFIGS[selectedType as RouteMarkerType];
            const ghostMarker = {
              x: pos.x - markerConfig.width / 2,
              y: pos.y - markerConfig.height / 2,
              width: markerConfig.width,
              height: markerConfig.height,
              type: selectedType as RouteMarkerType
            };

            const snapResult = findRouteMarkerSnapPoints(ghostMarker, routeMarkers, elements);

            const snappedX = snapResult.snapX !== null ? snapResult.snapX + markerConfig.width / 2 : pos.x;
            const snappedY = snapResult.snapY !== null ? snapResult.snapY + markerConfig.height / 2 : pos.y;

            setCursorCanvasPos({ x: snappedX, y: snappedY });
            setSnapPreviewLines(snapResult.snapLines);
            setSnappedElementIds(snapResult.snappedElementIds);
          } else {
            setCursorCanvasPos(pos);
            setSnapPreviewLines([]);
            setSnappedElementIds([]);
          }
        } else {
          const config = ELEMENT_CONFIGS[selectedType as ElementType];

          // Guard: only process if config exists
          if (config) {
            // Calculate potential snap points
            const ghostElement = {
              x: pos.x - Number(config.width) / 2,
              y: pos.y - Number(config.height) / 2,
              width: Number(config.width),
              height: Number(config.height),
              rotation: 0,
            };

            const snapResult = findSnapPoints(ghostElement, elements);

            const snappedX = snapResult.snapX !== null ? snapResult.snapX + Number(config.width) / 2 : pos.x;
            const snappedY = snapResult.snapY !== null ? snapResult.snapY + Number(config.height) / 2 : pos.y;

            setCursorCanvasPos({ x: snappedX, y: snappedY });
            // For warehouse elements, findSnapPoints doesn't return snappedElementIds, so clear it
            setSnapPreviewLines([]);
            setSnappedElementIds([]);
          } else {
            setCursorCanvasPos(pos);
            setSnapPreviewLines([]);
            setSnappedElementIds([]);
          }
        }
      } else {
        setCursorCanvasPos(pos);
        setSnapPreviewLines([]);
        setSnappedElementIds([]);
      }

      onCursorMove?.(pos.x, pos.y);
    }
  };

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Check if clicked on empty space (Stage, Layer, background Rect, or grid lines)
    const targetType = e.target.getType();
    const clickedOnEmpty =
      e.target === stage ||
      e.target === stage.getLayers()[0] as any ||
      e.target.name() === 'background' || // Background Rect
      targetType === 'Line'; // Grid lines

    if (clickedOnEmpty) {
      // If placement mode is active and not read-only
      if (selectedType && !isReadOnly) {
        const canvasPosition = cursorCanvasPos || getRelativePointerPosition();
        if (!canvasPosition) return;

        // Check if it's a route marker type
        const isRouteMarker = ['start_point', 'stop_point', 'cart_parking'].includes(selectedType);

        if (isRouteMarker) {
          // Create route marker
          const markerConfig = ROUTE_MARKER_CONFIGS[selectedType as RouteMarkerType];
          if (!markerConfig || !onMarkerCreate) return;

          const placeX = canvasPosition.x - markerConfig.width / 2;
          const placeY = canvasPosition.y - markerConfig.height / 2;

          onMarkerCreate(placeX, placeY, selectedType as RouteMarkerType);
        } else {
          // Create warehouse element
          const config = ELEMENT_CONFIGS[selectedType as ElementType];
          if (!config) return;

          const placeX = canvasPosition.x - Number(config.width) / 2;
          const placeY = canvasPosition.y - Number(config.height) / 2;

          onElementCreate(placeX, placeY);
        }

        // Clear any element selection after placing
        if (selectedElementIds.length > 0) {
          onCanvasClick();
        }
        setSnapPreviewLines([]);
        setSnappedElementIds([]);
      } else {
        // No placement mode, just deselect any selected elements
        onCanvasClick();
        setSnapPreviewLines([]);
        setSnappedElementIds([]);
      }
    }
  };

  // Mouse wheel zoom handler - zoom centered on cursor position
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.1; // Zoom factor per wheel step
    const oldScale = stageScale;

    // Determine zoom direction
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Clamp zoom between 0.1x and 3x
    const clampedScale = Math.max(0.1, Math.min(3, newScale));

    // Get pointer position relative to stage
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Calculate new position to zoom toward cursor
    const mousePointTo = {
      x: (pointer.x - stagePosition.x) / oldScale,
      y: (pointer.y - stagePosition.y) / oldScale,
    };

    const newPosition = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    setStageScale(clampedScale);
    setStagePosition(newPosition);
    onZoomChange?.(clampedScale);
  };

  // Expose zoom methods to parent via ref (would need forwardRef, but for now we'll just rely on props or internal state)
  // Actually, let's update the parent when zoom changes
  useEffect(() => {
    onZoomChange?.(stageScale);
  }, [stageScale, onZoomChange]);

  // Stage drag end handler - update pan position
  const handleStageDragEnd = (e: KonvaEventObject<DragEvent>) => {
    // Only update position if we're actually dragging the stage (not a child element)
    if (e.target === stageRef.current) {
      setStagePosition({
        x: e.target.x(),
        y: e.target.y(),
      });
    }
  };

  const handleElementDragStart = (element: WarehouseElement, e: KonvaEventObject<DragEvent>) => {
    if (isReadOnly) return;

    // If dragging a selected element in a multi-selection, initialize group drag
    if (selectedElementIds.length > 1 && selectedElementIds.includes(element.id)) {
      const node = e.target;
      setIsGroupDragging(true);
      setGroupDragStart({
        x: node.x(),
        y: node.y(),
      });
    }
  };

  const handleElementDragMove = (element: WarehouseElement, e: KonvaEventObject<DragEvent>) => {
    if (isReadOnly) return;

    const node = e.target;

    // Multi-select group drag
    if (isGroupDragging && groupDragStart && selectedElementIds.length > 1 && selectedElementIds.includes(element.id)) {
      // Calculate the delta from the drag start position
      const deltaX = node.x() - groupDragStart.x;
      const deltaY = node.y() - groupDragStart.y;

      // Move all other selected elements by the same delta
      const stage = stageRef.current;
      if (!stage) return;

      const layer = stage.getLayers()[0];
      if (!layer) return;

      // Find and update all selected element nodes
      selectedElementIds.forEach((selectedId) => {
        if (selectedId === element.id) return; // Skip the currently dragging element

        const selectedElement = elements.find(el => el.id === selectedId);
        if (!selectedElement) return;

        // Find the Konva node for this element
        const selectedNode = layer.findOne((node: any) => {
          return node.getType() === 'Group' &&
            node.x() === Number(selectedElement.x_coordinate) + Number(selectedElement.width) / 2 &&
            node.y() === Number(selectedElement.y_coordinate) + Number(selectedElement.height) / 2;
        });

        if (selectedNode) {
          // Calculate new position for this element
          const originalX = Number(selectedElement.x_coordinate) + Number(selectedElement.width) / 2;
          const originalY = Number(selectedElement.y_coordinate) + Number(selectedElement.height) / 2;
          selectedNode.x(originalX + deltaX);
          selectedNode.y(originalY + deltaY);
        }
      });

      layer.batchDraw();
      return;
    }

    // Single element drag with snapping
    // Get other elements (exclude current element being dragged)
    const otherElements = elements.filter(el => el.id !== element.id);

    // Convert center position to top-left for snap calculations
    const halfWidth = Number(element.width) / 2;
    const halfHeight = Number(element.height) / 2;
    const topLeftX = node.x() - halfWidth;
    const topLeftY = node.y() - halfHeight;

    // Find snap points for current position (using top-left coordinates)
    const snapResult = findSnapPoints(
      {
        x: topLeftX,
        y: topLeftY,
        width: Number(element.width),
        height: Number(element.height),
        rotation: node.rotation(),
      },
      otherElements
    );

    // Apply snap if found (converting back to center coordinates)
    const newTopLeftX = snapResult.snapX !== null ? snapResult.snapX : topLeftX;
    const newTopLeftY = snapResult.snapY !== null ? snapResult.snapY : topLeftY;

    // No canvas bounds clamping - elements can be placed anywhere on infinite grid
    // Convert back to center coordinates for node position
    node.x(newTopLeftX + halfWidth);
    node.y(newTopLeftY + halfHeight);
  };

  const handleElementDragEnd = (element: WarehouseElement, e: KonvaEventObject<DragEvent>) => {
    if (isReadOnly) return;

    const node = e.target;

    // Multi-select group drag end
    if (isGroupDragging && groupDragStart && selectedElementIds.length > 1) {
      // Calculate the final delta
      const deltaX = node.x() - groupDragStart.x;
      const deltaY = node.y() - groupDragStart.y;

      // Update all selected elements in the backend
      selectedElementIds.forEach((selectedId) => {
        const selectedElement = elements.find(el => el.id === selectedId);
        if (!selectedElement) return;

        const newX = Number(selectedElement.x_coordinate) + deltaX;
        const newY = Number(selectedElement.y_coordinate) + deltaY;

        onElementUpdate(selectedId, {
          x_coordinate: newX,
          y_coordinate: newY,
        });
      });

      // Reset group drag state
      setIsGroupDragging(false);
      setGroupDragStart(null);
      return;
    }

    // Single element drag end
    // Subtract offset to get top-left corner coordinates for storage
    onElementUpdate(element.id, {
      x_coordinate: node.x() - Number(element.width) / 2,
      y_coordinate: node.y() - Number(element.height) / 2,
    });
  };

  const handleElementTransform = (element: WarehouseElement, e: KonvaEventObject<Event>) => {
    if (isReadOnly) return;

    const node = e.target as Konva.Group;

    // Get current rotation and apply snap
    const currentRotation = node.rotation();
    const snappedRotation = snapRotation(currentRotation);

    // Apply snapped rotation in real-time
    node.rotation(snappedRotation);

    // Handle resizing - allow Konva to scale the group visually
    // We will calculate and apply the final dimensions in handleElementTransformEnd
    // This ensures complex shapes like Arrows scale correctly during the interaction
  };

  const handleElementTransformEnd = (element: WarehouseElement, e: KonvaEventObject<Event>) => {
    if (isReadOnly) return;

    const node = e.target as Konva.Group;

    // Get the current dimensions from the node (may have been updated during transform)
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const updates: any = {
      rotation: node.rotation(),
    };

    // If scale was applied, calculate new dimensions
    if (scaleX !== 1 || scaleY !== 1) {
      updates.width = Math.max(5, Number(element.width) * scaleX);
      updates.height = Math.max(1, Number(element.height) * scaleY);

      // Reset scale after capturing dimensions
      node.scaleX(1);
      node.scaleY(1);
    }

    onElementUpdate(element.id, updates);
  };

  // Convert canvas coordinates to screen coordinates (accounting for zoom and pan)
  const canvasToScreenCoords = (canvasX: number, canvasY: number) => {
    const stage = stageRef.current;
    const container = containerRef.current;
    if (!stage || !container) return null;

    // Apply stage transform (scale and position)
    const screenX = canvasX * stageScale + stagePosition.x;
    const screenY = canvasY * stageScale + stagePosition.y;

    return { x: screenX, y: screenY };
  };

  const handleElementDoubleClick = (elementId: string) => {
    if (isReadOnly) return;

    const element = elements.find((el) => el.id === elementId);
    if (!element) return;

    // Calculate screen position for the input overlay
    // Position at the top-left corner of the element (plus center offset)
    const canvasX = Number(element.x_coordinate) + Number(element.width) / 2;
    const canvasY = Number(element.y_coordinate) + Number(element.height) / 2 - 10; // Slightly above center

    const screenPos = canvasToScreenCoords(canvasX, canvasY);
    if (!screenPos) return;

    setEditingLabel(elementId);
    setEditingValue(element.label);
    setEditingPosition(screenPos);
    setValidationError(null);
  };

  const handleLabelChange = (elementId: string, newLabel: string) => {
    // Validate: check for duplicate names (excluding current element)
    const trimmedLabel = newLabel.trim();

    if (!trimmedLabel) {
      setValidationError('Label cannot be empty');
      return;
    }

    const isDuplicate = elements.some(
      (el) => el.id !== elementId && el.label.toLowerCase() === trimmedLabel.toLowerCase()
    );

    if (isDuplicate) {
      setValidationError(`Name "${trimmedLabel}" already exists`);
      return;
    }

    // Valid - save changes
    onElementUpdate(elementId, { label: trimmedLabel });
    setEditingLabel(null);
    setEditingValue('');
    setEditingPosition(null);
    setValidationError(null);
  };

  const handleCancelEdit = () => {
    setEditingLabel(null);
    setEditingValue('');
    setEditingPosition(null);
    setValidationError(null);
  };



  // Helper: Snap value to nearest grid line
  const snapToGrid = (value: number, gridSize: number = 50): number => {
    return Math.floor(value / gridSize) * gridSize;
  };

  // Generate infinite viewport-based grid lines
  const gridSpacing = 50; // 50px grid spacing (constant at all zoom levels)

  const { gridLines, viewportBounds } = useMemo(() => {
    const lines = [];
    // Increase padding significantly to ensure grid covers everything during pans
    const padding = Math.max(containerSize.width, containerSize.height) * 2;

    // Calculate visible viewport bounds based on zoom and pan
    // We want to cover a huge area around the visible viewport
    const viewportWidth = containerSize.width / stageScale;
    const viewportHeight = containerSize.height / stageScale;

    const startX = (-stagePosition.x / stageScale) - padding;
    const endX = startX + viewportWidth + (padding * 2);
    const startY = (-stagePosition.y / stageScale) - padding;
    const endY = startY + viewportHeight + (padding * 2);

    // Snap bounds to grid for alignment
    const gridStartX = snapToGrid(startX, gridSpacing);
    const gridEndX = Math.ceil(endX / gridSpacing) * gridSpacing;
    const gridStartY = snapToGrid(startY, gridSpacing);
    const gridEndY = Math.ceil(endY / gridSpacing) * gridSpacing;

    // Generate vertical lines
    for (let x = gridStartX; x <= gridEndX; x += gridSpacing) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[x, gridStartY, x, gridEndY]}
          stroke={x % 100 === 0 ? '#1e293b' : '#0f172a'}
          strokeWidth={x % 100 === 0 ? 1 : 0.5}
          listening={false}
        />
      );
    }

    // Generate horizontal lines
    for (let y = gridStartY; y <= gridEndY; y += gridSpacing) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[gridStartX, y, gridEndX, y]}
          stroke={y % 100 === 0 ? '#1e293b' : '#0f172a'}
          strokeWidth={y % 100 === 0 ? 1 : 0.5}
          listening={false}
        />
      );
    }

    return {
      gridLines: lines,
      viewportBounds: { startX: gridStartX, endX: gridEndX, startY: gridStartY, endY: gridEndY },
    };
  }, [stageScale, stagePosition.x, stagePosition.y, containerSize]);

  // Track stage drag state for cursor styling
  const [isStageDragging, setIsStageDragging] = useState(false);

  // Snap preview lines for cart alignment
  const [snapPreviewLines, setSnapPreviewLines] = useState<Array<{ points: number[], orientation: 'horizontal' | 'vertical' }>>([]);
  const [snappedElementIds, setSnappedElementIds] = useState<string[]>([]);

  return (
    <div className="relative w-full h-full">
      {/* Canvas Container with Blueprint Styling */}
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(to bottom, #020617, #0f172a)',
          // Cursor logic:
          // 1. If dragging stage -> grabbing
          // 2. If hovering element -> default (let element handle it) or pointer
          // 3. Default (empty space) -> grab
          cursor: isStageDragging ? 'grabbing' : (hoveredElementId ? 'default' : 'grab'),
        }}
      >
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          scaleX={stageScale}
          onMouseMove={handleStageMouseMove}
          onMouseLeave={() => {
            setCursorCanvasPos(null);
            setSnapPreviewLines([]);
            setSnappedElementIds([]);
          }}
          scaleY={stageScale}
          x={stagePosition.x}
          y={stagePosition.y}
          // Enable panning by default (unless placing an element, though Konva handles click vs drag well)
          // We allow panning even in read-only mode
          draggable={true}
          onDragStart={(e) => {
            if (e.target === stageRef.current) {
              setIsStageDragging(true);
            }
          }}
          onClick={handleStageClick}
          onWheel={handleWheel}
          onDragEnd={(e) => {
            handleStageDragEnd(e);
            setIsStageDragging(false);
          }}
        >
          <Layer>
            {/* Infinite Grid Background */}
            <Rect
              name="background"
              x={viewportBounds.startX}
              y={viewportBounds.startY}
              width={viewportBounds.endX - viewportBounds.startX}
              height={viewportBounds.endY - viewportBounds.startY}
              fill="#0a0f1e"
              listening={true}
            />
            {gridLines}

            {/* Snap Preview Lines for Cart Alignment */}
            {snapPreviewLines.map((line, index) => (
              <Line
                key={`snap-preview-${index}`}
                points={line.points}
                stroke="#ef4444"
                strokeWidth={1}
                dash={[3, 3]}
                opacity={0.7}
                listening={false}
              />
            ))}

            {/* Highlight Snapped Elements */}
            {snappedElementIds.map((id) => {
              const element = elements.find(e => e.id === id);
              if (!element) return null;
              const config = ELEMENT_CONFIGS[element.element_type];
              return (
                <Rect
                  key={`snap-highlight-${id}`}
                  x={Number(element.x_coordinate)}
                  y={Number(element.y_coordinate)}
                  width={Number(element.width)}
                  height={Number(element.height)}
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="transparent"
                  listening={false}
                  opacity={0.5}
                />
              );
            })}

            {/* Render all elements */}
            {elements.map((element) => {
              const config = ELEMENT_CONFIGS[element.element_type];
              const isSelected = selectedElementIds.includes(element.id);
              const isHovered = element.id === hoveredElementId;
              const isSingleSelection = isSelected && selectedElementIds.length === 1;

              // Calculate heatmap color if pick data exists for this element
              let heatmapColor: string | undefined;
              if (pickData && pickData.has(element.id)) {
                const picks = pickData.get(element.id)!;
                heatmapColor = getHeatmapColor(picks, minPicks, maxPicks);
              }

              return (
                <ElementShape
                  key={element.id}
                  element={element}
                  config={config}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  labelDisplayMode={labelDisplayMode}
                  ref={isSingleSelection ? selectedShapeRef : null}
                  onClick={(e) => onElementClick(element.id, e.evt.ctrlKey, e.evt.metaKey)}
                  onDoubleClick={() => handleElementDoubleClick(element.id)}
                  onDragStart={isReadOnly ? undefined : (e) => handleElementDragStart(element, e)}
                  onDragMove={isReadOnly ? undefined : (e) => handleElementDragMove(element, e)}
                  onDragEnd={isReadOnly ? undefined : (e) => handleElementDragEnd(element, e)}
                  onTransform={isReadOnly ? undefined : (e) => handleElementTransform(element, e)}
                  onTransformEnd={isReadOnly ? undefined : (e) => handleElementTransformEnd(element, e)}
                  onLabelChange={(newLabel) => handleLabelChange(element.id, newLabel)}
                  onMouseEnter={(e) => {
                    setHoveredElementId(element.id);
                    const stage = stageRef.current;
                    if (stage) {
                      const pointerPos = stage.getPointerPosition();
                      if (pointerPos) {
                        setTooltipPosition({ x: pointerPos.x, y: pointerPos.y });
                      }
                    }
                  }}
                  onMouseMove={(e) => {
                    const stage = stageRef.current;
                    if (stage) {
                      const pointerPos = getRelativePointerPosition();
                      if (pointerPos) {
                        onCursorMove?.(pointerPos.x, pointerPos.y);

                        // Tooltip logic
                        if (hoveredElementId === element.id) {
                          const rawPointer = stage.getPointerPosition();
                          if (rawPointer) setTooltipPosition({ x: rawPointer.x, y: rawPointer.y });
                        }
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredElementId(null);
                    setTooltipPosition(null);
                  }}
                  heatmapColor={heatmapColor}
                  isHeatmap={isHeatmap}
                  draggable={!isReadOnly}
                />
              );
            })}

            {/* Route Markers */}
            {showRouteMarkers && routeMarkers.map((marker) => {
              const config = ROUTE_MARKER_CONFIGS[marker.marker_type];
              const isSelected = selectedMarkerId === marker.id;
              const x = Number(marker.x_coordinate);
              const y = Number(marker.y_coordinate);

              return (
                <Group
                  key={marker.id}
                  x={x + config.width / 2}
                  y={y + config.height / 2}
                  draggable={!isReadOnly}
                  onClick={() => onMarkerClick?.(marker.id)}
                  onDragMove={marker.marker_type === 'cart_parking' && snappingEnabled ? (e) => {
                    // Show snap preview lines for cart parking
                    const node = e.target;
                    const currentX = node.x() - config.width / 2;
                    const currentY = node.y() - config.height / 2;

                    const snapResult = findRouteMarkerSnapPoints(
                      {
                        x: currentX,
                        y: currentY,
                        width: config.width,
                        height: config.height,
                        type: marker.marker_type
                      },
                      routeMarkers.filter(m => m.id !== marker.id),
                      elements
                    );

                    // Apply magnetic snap to the node
                    if (snapResult.snapX !== null) {
                      node.x(snapResult.snapX + config.width / 2);
                    }
                    if (snapResult.snapY !== null) {
                      node.y(snapResult.snapY + config.height / 2);
                    }

                    setSnapPreviewLines(snapResult.snapLines);
                    setSnappedElementIds(snapResult.snappedElementIds);
                  } : undefined}
                  onDragStart={() => {
                    // Clear any existing snap preview lines when starting drag
                    setSnapPreviewLines([]);
                    setSnappedElementIds([]);
                  }}
                  onDragEnd={(e) => {
                    // Clear snap preview lines when drag ends
                    setSnapPreviewLines([]);
                    setSnappedElementIds([]);

                    let newX = e.target.x() - config.width / 2;
                    let newY = e.target.y() - config.height / 2;

                    // Apply intelligent snapping if enabled
                    if (snappingEnabled) {
                      const snapResult = findRouteMarkerSnapPoints(
                        {
                          x: newX,
                          y: newY,
                          width: config.width,
                          height: config.height,
                          type: marker.marker_type
                        },
                        routeMarkers.filter(m => m.id !== marker.id),
                        elements
                      );

                      if (snapResult.snapX !== null) {
                        newX = snapResult.snapX;
                      }
                      if (snapResult.snapY !== null) {
                        newY = snapResult.snapY;
                      }
                    }

                    onMarkerUpdate?.(marker.id, { x_coordinate: newX, y_coordinate: newY });
                  }}
                >
                  {marker.marker_type === 'cart_parking' ? (
                    // Cart parking - dashed outline (no fill)
                    <>
                      <Rect
                        x={-config.width / 2}
                        y={-config.height / 2}
                        width={config.width}
                        height={config.height}
                        fill="transparent"
                        stroke={isSelected ? '#fff' : config.color}
                        strokeWidth={isSelected ? 3 : 2}
                        dash={[8, 4]}
                        cornerRadius={4}
                        shadowColor={config.color}
                        shadowBlur={isSelected ? 15 : 8}
                        shadowOpacity={0.6}
                      />
                      <Text
                        x={-config.width / 2}
                        y={-config.height / 2}
                        width={config.width}
                        height={config.height}
                        text={marker.sequence_order?.toString() || '🛒'}
                        fontSize={12}
                        fontFamily="monospace"
                        fontStyle="bold"
                        fill={config.color}
                        align="center"
                        verticalAlign="middle"
                      />
                    </>
                  ) : (
                    // Start/Stop point - circle
                    <>
                      <Rect
                        x={-config.width / 2}
                        y={-config.height / 2}
                        width={config.width}
                        height={config.height}
                        fill={config.color}
                        stroke={isSelected ? '#fff' : config.color}
                        strokeWidth={isSelected ? 3 : 2}
                        cornerRadius={config.width / 2}
                        shadowColor={config.color}
                        shadowBlur={isSelected ? 15 : 8}
                        shadowOpacity={0.6}
                      />
                      <Text
                        x={-config.width / 2}
                        y={-config.height / 2}
                        width={config.width}
                        height={config.height}
                        text={marker.marker_type === 'start_point' ? '▶' : '■'}
                        fontSize={14}
                        fontFamily="monospace"
                        fontStyle="bold"
                        fill="#fff"
                        align="center"
                        verticalAlign="middle"
                      />
                    </>
                  )}
                  {/* Label below marker */}
                  <Text
                    x={-50}
                    y={config.height / 2 + 4}
                    width={100}
                    text={marker.label}
                    fontSize={10}
                    fontFamily="monospace"
                    fill="#94a3b8"
                    align="center"
                  />
                </Group>
              );
            })}

            {/* Bounding box for multi-select */}
            {selectedElementIds.length > 1 && (() => {
              // Calculate bounding box around all selected elements
              const selectedElements = elements.filter(el => selectedElementIds.includes(el.id));
              if (selectedElements.length === 0) return null;

              // Find min/max coordinates
              let minX = Infinity;
              let minY = Infinity;
              let maxX = -Infinity;
              let maxY = -Infinity;

              selectedElements.forEach(el => {
                const x = Number(el.x_coordinate);
                const y = Number(el.y_coordinate);
                const width = Number(el.width);
                const height = Number(el.height);

                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + width);
                maxY = Math.max(maxY, y + height);
              });

              const padding = 10; // Padding around the bounding box
              const boundingWidth = maxX - minX + padding * 2;
              const boundingHeight = maxY - minY + padding * 2;

              return (
                <Rect
                  x={minX - padding}
                  y={minY - padding}
                  width={boundingWidth}
                  height={boundingHeight}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dash={[10, 5]}
                  fill="transparent"
                  listening={false}
                  opacity={isGroupDragging ? 1 : 0.6}
                />
              );
            })()}

            {/* Ghost/Preview element when drawing */}
            {selectedType && !isReadOnly && cursorCanvasPos && (() => {
              const isRouteMarker = ['start_point', 'stop_point', 'cart_parking'].includes(selectedType);

              if (isRouteMarker) {
                const markerConfig = ROUTE_MARKER_CONFIGS[selectedType as RouteMarkerType];
                if (!markerConfig) return null;

                // Route marker ghost
                if (selectedType === 'cart_parking') {
                  // Cart parking - dashed outline (no fill, matches actual marker)
                  return (
                    <Rect
                      x={cursorCanvasPos.x - markerConfig.width / 2}
                      y={cursorCanvasPos.y - markerConfig.height / 2}
                      width={markerConfig.width}
                      height={markerConfig.height}
                      fill="transparent"
                      opacity={0.6}
                      stroke={markerConfig.color}
                      strokeWidth={2}
                      dash={[8, 4]}
                      cornerRadius={4}
                      listening={false}
                    />
                  );
                } else {
                  // Start/Stop point - circle
                  return (
                    <Group x={cursorCanvasPos.x} y={cursorCanvasPos.y} listening={false}>
                      <Rect
                        x={-markerConfig.width / 2}
                        y={-markerConfig.height / 2}
                        width={markerConfig.width}
                        height={markerConfig.height}
                        fill={markerConfig.color}
                        opacity={0.4}
                        stroke={markerConfig.color}
                        strokeWidth={2}
                        dash={[4, 4]}
                        cornerRadius={markerConfig.width / 2}
                        listening={false}
                      />
                    </Group>
                  );
                }
              }

              const config = ELEMENT_CONFIGS[selectedType as ElementType];
              if (!config) return null;
              return (
                <Rect
                  x={cursorCanvasPos.x - Number(config.width) / 2}
                  y={cursorCanvasPos.y - Number(config.height) / 2}
                  width={Number(config.width)}
                  height={Number(config.height)}
                  fill={config.color}
                  opacity={0.3}
                  stroke={config.color}
                  strokeWidth={2}
                  dash={[5, 5]}
                  listening={false}
                  shadowColor={config.color}
                  shadowBlur={10}
                  shadowOpacity={0.5}
                />
              );
            })()}

            {/* Transformer for selected element (rotation handles) - only for single selection */}
            {selectedElementIds.length === 1 && (() => {
              const selectedElement = elements.find(el => el.id === selectedElementIds[0]);
              if (!selectedElement) return null;

              // Determine which anchors to enable based on element type
              let enabledAnchors: string[] = [];

              if (selectedElement.element_type === 'line' || selectedElement.element_type === 'arrow') {
                // For lines and arrows, only allow horizontal resizing (left-right)
                enabledAnchors = ['middle-left', 'middle-right'];
              } else if (selectedElement.element_type === 'text') {
                // For text, allow all corner resizing
                enabledAnchors = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
              }
              // For bay, flow_rack, full_pallet: keep empty array (rotation only)

              return (
                <Transformer
                  ref={transformerRef}
                  rotateEnabled={true}
                  enabledAnchors={enabledAnchors}
                  borderStroke="#3b82f6"
                  borderStrokeWidth={2}
                  rotateAnchorOffset={30}
                  anchorStroke="#3b82f6"
                  anchorFill="#60a5fa"
                  anchorSize={8}
                  keepRatio={false}
                  boundBoxFunc={(oldBox, newBox) => {
                    // Prevent negative or zero dimensions
                    if (newBox.width < 5 || newBox.height < 1) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                />
              );
            })()}
          </Layer>
        </Stage>

        {/* Inline Label Editing Overlay */}
        {editingLabel && editingPosition && (
          <div
            className="absolute z-50"
            style={{
              left: `${editingPosition.x}px`,
              top: `${editingPosition.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyDown={(e) => {
                  // Prevent event from bubbling to prevent global keyboard shortcuts
                  e.stopPropagation();

                  if (e.key === 'Enter') {
                    handleLabelChange(editingLabel, editingValue);
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                onBlur={() => {
                  if (!validationError) {
                    handleLabelChange(editingLabel, editingValue);
                  }
                }}
                autoFocus
                maxLength={100}
                className={`px-3 py-2 bg-slate-900 text-white font-mono text-sm rounded-lg shadow-2xl min-w-[150px] focus:outline-none focus:ring-2 ${validationError
                  ? 'border-2 border-red-500 focus:ring-red-500'
                  : 'border-2 border-blue-500 focus:ring-blue-500'
                  }`}
                placeholder="Enter label..."
              />
              {validationError && (
                <div className="px-2 py-1 bg-red-600 text-white text-xs font-mono rounded shadow-lg">
                  {validationError}
                </div>
              )}
              <div className="text-xs text-slate-400 font-mono text-center">
                Enter to save • Esc to cancel
              </div>
            </div>
          </div>
        )}

        {/* Pick Count Tooltip */}
        {hoveredElementId && tooltipPosition && pickData?.has(hoveredElementId) && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              left: `${tooltipPosition.x + 15}px`,
              top: `${tooltipPosition.y - 15}px`,
            }}
          >
            <div className="bg-slate-900 border-2 border-blue-500 rounded-lg px-3 py-2 shadow-2xl">
              <div className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider mb-1">
                {elements.find(e => e.id === hoveredElementId)?.label}
              </div>
              <div className="text-sm font-mono font-bold text-white">
                {pickData.get(hoveredElementId)?.toLocaleString()} picks
              </div>
            </div>
          </div>
        )}

        {/* Canvas Control Buttons - Floating bottom-right */}
        <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-2">
          {/* Route Markers Toggle Button */}
          {onRouteMarkersToggle && routeMarkers.length > 0 && (
            <button
              onClick={onRouteMarkersToggle}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg shadow-lg backdrop-blur-sm transition-all group ${showRouteMarkers
                ? 'bg-purple-600/90 hover:bg-purple-500 border-purple-500 hover:border-purple-400'
                : 'bg-slate-800/90 hover:bg-slate-700 border-slate-600 hover:border-slate-500'
                }`}
              title={`${showRouteMarkers ? 'Hide' : 'Show'} start/stop/cart parking markers`}
            >
              <svg className={`w-4 h-4 ${showRouteMarkers ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className={`text-xs font-medium ${showRouteMarkers ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                {showRouteMarkers ? 'Hide Markers' : 'Show Markers'}
              </span>
            </button>
          )}

          {/* Snapping Toggle Button */}
          {onSnappingToggle && (
            <button
              onClick={onSnappingToggle}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg shadow-lg backdrop-blur-sm transition-all group ${snappingEnabled
                ? 'bg-emerald-600/90 hover:bg-emerald-500 border-emerald-500 hover:border-emerald-400'
                : 'bg-slate-800/90 hover:bg-slate-700 border-slate-600 hover:border-slate-500'
                }`}
              title={`${snappingEnabled ? 'Disable' : 'Enable'} smart snapping for element placement`}
            >
              <svg className={`w-4 h-4 ${snappingEnabled ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className={`text-xs font-medium ${snappingEnabled ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                {snappingEnabled ? 'Snap On' : 'Snap Off'}
              </span>
            </button>
          )}

          {/* Fit All Button */}
          {elements.length > 0 && (
            <button
              onClick={fitToElements}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 hover:bg-blue-600 border border-slate-600 hover:border-blue-500 rounded-lg shadow-lg backdrop-blur-sm transition-all group"
              title="Fit all elements in view (show entire layout)"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span className="text-xs font-medium text-slate-300 group-hover:text-white">Fit All</span>
            </button>
          )}
        </div>
      </div>

      {/* Canvas Info Panel */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* Dimensions */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Canvas Size</div>
          </div>
          <div className="text-xl font-mono font-bold text-white">
            {canvasWidth} × {canvasHeight}
          </div>
          <div className="text-xs font-mono text-slate-500 mt-1">pixels (1:1 scale)</div>
        </div>

        {/* Element Count */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Elements</div>
          </div>
          <div className="text-xl font-mono font-bold text-white">{elements.length}</div>
          <div className="text-xs font-mono text-slate-500 mt-1">
            {elements.filter(e => e.element_type === 'bay').length} bays, {' '}
            {elements.filter(e => e.element_type === 'flow_rack').length} flow racks, {' '}
            {elements.filter(e => e.element_type === 'full_pallet').length} pallets
          </div>
        </div>

        {/* Selected Element Info */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${selectedElementIds.length > 0 ? 'bg-amber-500' : 'bg-slate-600'}`}></div>
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Selection</div>
          </div>
          {selectedElementIds.length > 0 ? (
            <>
              <div className="text-xl font-mono font-bold text-white">
                {selectedElementIds.length === 1
                  ? elements.find(e => e.id === selectedElementIds[0])?.label
                  : `${selectedElementIds.length} elements`}
              </div>
              <div className="text-xs font-mono text-slate-500 mt-1">
                {selectedElementIds.length === 1 ? (
                  (() => {
                    const elem = elements.find(e => e.id === selectedElementIds[0]);
                    if (!elem) return 'N/A';
                    return `${ELEMENT_CONFIGS[elem.element_type].displayName} @ ${Math.round(Number(elem.x_coordinate))}, ${Math.round(Number(elem.y_coordinate))}`;
                  })()
                ) : (
                  'Multi-select active (Ctrl+click)'
                )}
              </div>
            </>
          ) : (
            <>
              <div className="text-xl font-mono font-bold text-slate-600">None</div>
              <div className="text-xs font-mono text-slate-600 mt-1">Click to select • Ctrl+click to multi-select</div>
            </>
          )}
        </div>
      </div>
    </div >
  );
}
);

// Sub-component for individual element rendering
interface ElementShapeProps {
  element: WarehouseElement;
  config: { width: number; height: number; color: string; displayName: string; description: string };
  isSelected: boolean;
  isHovered: boolean;

  labelDisplayMode: LabelDisplayMode;
  onClick: (e: KonvaEventObject<MouseEvent>) => void;
  onDoubleClick: () => void;
  onDragStart?: (e: KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
  onTransform?: (e: KonvaEventObject<Event>) => void;
  onTransformEnd?: (e: KonvaEventObject<Event>) => void;
  onLabelChange: (newLabel: string) => void;
  onMouseEnter: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseMove?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseLeave: () => void;
  heatmapColor?: string;

  isHeatmap?: boolean;
  draggable?: boolean;
}

const ElementShape = React.forwardRef<Konva.Group, ElementShapeProps>(
  (
    {
      element,
      config,
      isSelected,
      isHovered,

      labelDisplayMode,
      onClick,
      onDoubleClick,
      onDragStart,
      onDragMove,
      onDragEnd,
      onTransform,
      onTransformEnd,
      onLabelChange,
      onMouseEnter,
      onMouseMove,
      onMouseLeave,
      heatmapColor,

      isHeatmap,
      draggable,
    },
    ref
  ) => {
    const [labelInput, setLabelInput] = useState(element.label);

    useEffect(() => {
      setLabelInput(element.label);
    }, [element.label]);

    const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onLabelChange(labelInput);
      } else if (e.key === 'Escape') {
        setLabelInput(element.label);
        onLabelChange(element.label);
      }
    };

    // Calculate if label should be visible based on display mode
    const shouldShowLabel = (() => {
      if (labelDisplayMode === 'none') return false;
      if (labelDisplayMode === 'all') return true;
      if (labelDisplayMode === 'selected') return isSelected;
      if (labelDisplayMode === 'hover') return isHovered;
      return false;
    })();

    // Calculate proportional font size based on element width
    // Small elements (24px) get ~8px font, large elements (120px) get ~12px font
    const fontSize = Math.max(8, Math.min(12, Number(element.width) / 8));

    // Determine fill color
    // 1. Heatmap color if available
    // 2. For text/arrows/lines in heatmap mode: use vibrant white (they won't have heatmap data)
    // 3. For other elements in heatmap mode: use neutral gray
    // 4. Configured element color (designer mode)
    const fillColor = heatmapColor || (isHeatmap
      ? (element.element_type === 'text' || element.element_type === 'arrow' || element.element_type === 'line'
        ? '#f1f5f9'  // Vibrant white for text/arrows/lines
        : '#334155') // Muted gray for other elements without data
      : config.color);

    return (
      <Group
        ref={ref}
        x={Number(element.x_coordinate) + Number(element.width) / 2}
        y={Number(element.y_coordinate) + Number(element.height) / 2}
        rotation={Number(element.rotation)}
        draggable={draggable}
        onClick={onClick}
        onDblClick={onDoubleClick}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onTransform={onTransform}
        onTransformEnd={onTransformEnd}
        onMouseEnter={onMouseEnter}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {/* Render based on element type */}
        {element.element_type === 'text' ? (
          <Text
            x={-Number(element.width) / 2}
            y={-Number(element.height) / 2}
            text={element.label}
            fontSize={Number(element.height)}
            width={Number(element.width)}
            fontFamily="monospace"
            fontStyle="bold"
            fill={fillColor}
            align="left"
            verticalAlign="middle"
            opacity={isSelected ? 1 : 0.9}
            shadowColor={isSelected ? '#3b82f6' : 'transparent'}
            shadowBlur={isSelected ? 10 : 0}
          />
        ) : element.element_type === 'line' ? (
          <Line
            points={[-Number(element.width) / 2, 0, Number(element.width) / 2, 0]}
            stroke={fillColor}
            strokeWidth={Number(element.height)}
            lineCap="round"
            lineJoin="round"
            opacity={isSelected ? 1 : 0.9}
            shadowColor={isSelected ? '#3b82f6' : 'transparent'}
            shadowBlur={isSelected ? 10 : 0}
          />
        ) : element.element_type === 'arrow' ? (
          <Arrow
            points={[-Number(element.width) / 2, 0, Number(element.width) / 2, 0]}
            pointerLength={Number(element.height) * 3}
            pointerWidth={Number(element.height) * 3}
            fill={fillColor}
            stroke={fillColor}
            strokeWidth={Number(element.height)}
            lineCap="round"
            lineJoin="round"
            opacity={isSelected ? 1 : 0.9}
            shadowColor={isSelected ? '#3b82f6' : 'transparent'}
            shadowBlur={isSelected ? 10 : 0}
          />
        ) : (
          <>
            {/* Default Rectangle Shape for bays, racks, pallets */}
            <Rect
              x={-Number(element.width) / 2}
              y={-Number(element.height) / 2}
              width={Number(element.width)}
              height={Number(element.height)}
              fill={fillColor}
              opacity={isSelected ? 0.9 : 0.7}
              stroke={isSelected ? '#3b82f6' : '#1e293b'}
              strokeWidth={isSelected ? 3 : 1}
              shadowColor={isSelected ? (heatmapColor || config.color) : 'transparent'}
              shadowBlur={isSelected ? 20 : 0}
              shadowOpacity={0.6}
            />

            {/* Element Label - conditionally rendered based on display mode */}
            {/* For bay elements, rotate text 90 degrees for vertical orientation */}
            {shouldShowLabel && (
              <Text
                x={element.element_type === 'bay' ? -Number(element.width) / 2 + Number(element.width) / 2 + fontSize / 2 : -Number(element.width) / 2 + 4}
                y={element.element_type === 'bay' ? -Number(element.height) / 2 + 4 : -Number(element.height) / 2 + 4}
                text={element.label}
                fontSize={fontSize}
                fontFamily="monospace"
                fontStyle="bold"
                fill={isSelected ? '#ffffff' : '#e2e8f0'}
                listening={false}
                shadowColor="#000000"
                shadowBlur={4}
                shadowOpacity={0.8}
                rotation={element.element_type === 'bay' ? 90 : 0}
              />
            )}
          </>
        )}

        {/* Selection Border for non-rect shapes (optional, but good for UX) */}
        {isSelected && (element.element_type === 'text' || element.element_type === 'line' || element.element_type === 'arrow') && (
          <Rect
            x={-Number(element.width) / 2 - 5}
            y={-Number(element.height) / 2 - 5}
            width={Number(element.width) + 10}
            height={Number(element.height) + 10}
            stroke="#3b82f6"
            strokeWidth={1}
            dash={[5, 5]}
            listening={false}
          />
        )}
      </Group>
    );
  }
);

ElementShape.displayName = 'ElementShape';

export default WarehouseCanvas;
