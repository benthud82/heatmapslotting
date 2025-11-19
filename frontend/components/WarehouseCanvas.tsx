'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Transformer, Line, Group } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import { WarehouseElement, ElementType, ELEMENT_CONFIGS, LabelDisplayMode } from '@/lib/types';
import { findSnapPoints, snapRotation } from '@/lib/snapping';
import { getHeatmapColor } from '@/lib/heatmapColors';

interface WarehouseCanvasProps {
  elements: WarehouseElement[];
  selectedType: ElementType | null;
  selectedElementIds: string[];
  labelDisplayMode: LabelDisplayMode;
  onElementClick: (id: string, ctrlKey: boolean, metaKey: boolean) => void;
  onElementCreate: (x: number, y: number) => void;
  onElementUpdate: (id: string, updates: { x_coordinate?: number; y_coordinate?: number; rotation?: number; label?: string }) => void;
  onCanvasClick: () => void;
  canvasWidth?: number;
  canvasHeight?: number;
  isReadOnly?: boolean;
  pickData?: Map<string, number>;
  onZoomChange?: (zoom: number) => void;
  onCursorMove?: (x: number, y: number) => void;
  isHeatmap?: boolean;
}

export default function WarehouseCanvas({
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
}: WarehouseCanvasProps) {
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

  // Zoom and pan state
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Multi-select drag state
  const [isGroupDragging, setIsGroupDragging] = useState(false);
  const [groupDragStart, setGroupDragStart] = useState<{ x: number; y: number } | null>(null);

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

  // Fit to elements on initial load
  useEffect(() => {
    if (elements.length > 0) {
      // Small delay to ensure canvas is mounted
      const timer = setTimeout(() => {
        fitToElements();
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
      // If placement mode is active and not read-only, place new element at click position
      if (selectedType && !isReadOnly) {
        // Get pointer position accounting for zoom and pan
        const canvasPosition = getRelativePointerPosition();
        if (!canvasPosition) return;

        console.log('Placing element at:', canvasPosition); // Debug log

        onElementCreate(canvasPosition.x, canvasPosition.y);

        // Clear any element selection after placing
        if (selectedElementIds.length > 0) {
          onCanvasClick();
        }
      } else {
        // No placement mode, just deselect any selected elements
        onCanvasClick();
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
  };

  const handleElementTransformEnd = (element: WarehouseElement, e: KonvaEventObject<Event>) => {
    if (isReadOnly) return;

    const node = e.target as Konva.Group;
    onElementUpdate(element.id, {
      rotation: node.rotation(),
    });
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

  // Zoom control handlers
  const handleZoomIn = () => {
    const newScale = Math.min(3, stageScale * 1.2);
    setStageScale(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(0.1, stageScale / 1.2);
    setStageScale(newScale);
  };

  const handleResetZoom = () => {
    setStageScale(1);
    setStagePosition({ x: 0, y: 0 });
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

  return (
    <div className="relative w-full h-full">
      {/* Canvas Container with Blueprint Styling */}
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(to bottom, #020617, #0f172a)',
          cursor: isPanning ? 'grab' : 'default',
        }}
      >
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePosition.x}
          y={stagePosition.y}
          draggable={isPanning}
          onClick={handleStageClick}
          onWheel={handleWheel}
          onDragEnd={handleStageDragEnd}
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
                  isEditing={editingLabel === element.id}
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
                />
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

            {/* Transformer for selected element (rotation handles) - only for single selection */}
            {selectedElementIds.length === 1 && (
              <Transformer
                ref={transformerRef}
                rotateEnabled={true}
                enabledAnchors={[]} // Disable resize, only allow rotation
                borderStroke="#3b82f6"
                borderStrokeWidth={2}
                rotateAnchorOffset={30}
                anchorStroke="#3b82f6"
                anchorFill="#60a5fa"
                anchorSize={8}
              />
            )}
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
    </div>
  );
}

// Sub-component for individual element rendering
interface ElementShapeProps {
  element: WarehouseElement;
  config: { width: number; height: number; color: string; displayName: string; description: string };
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
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
  heatmapColor?: string; // Optional heatmap color override
  pickCount?: number;
  isHeatmap?: boolean;
}

const ElementShape = React.forwardRef<Konva.Group, ElementShapeProps>(
  (
    {
      element,
      config,
      isSelected,
      isHovered,
      isEditing,
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
      pickCount,
      isHeatmap,
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
    // 2. Neutral color if in heatmap mode (but no data for this element)
    // 3. Configured element color (designer mode)
    const fillColor = heatmapColor || (isHeatmap ? '#334155' : config.color);

    return (
      <Group
        ref={ref}
        x={Number(element.x_coordinate) + Number(element.width) / 2}
        y={Number(element.y_coordinate) + Number(element.height) / 2}
        rotation={Number(element.rotation)}
        draggable={!onDragMove ? false : true}
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
        {/* Main Element Rectangle */}
        <Rect
          x={0}
          y={0}
          width={Number(element.width)}
          height={Number(element.height)}
          offsetX={Number(element.width) / 2}
          offsetY={Number(element.height) / 2}
          fill={fillColor}
          opacity={isSelected ? 0.9 : 0.7}
          stroke={isSelected ? '#3b82f6' : '#1e293b'}
          strokeWidth={isSelected ? 3 : 1}
          shadowColor={isSelected ? (heatmapColor || config.color) : 'transparent'}
          shadowBlur={isSelected ? 20 : 0}
          shadowOpacity={0.6}
        />

        {/* Element Label - conditionally rendered based on display mode */}
        {shouldShowLabel && (
          <Text
            x={-Number(element.width) / 2 + 4}
            y={-Number(element.height) / 2 + 4}
            text={element.label}
            fontSize={fontSize}
            fontFamily="monospace"
            fontStyle="bold"
            fill={isSelected ? '#ffffff' : '#e2e8f0'}
            listening={false}
            shadowColor="#000000"
            shadowBlur={4}
            shadowOpacity={0.8}
          />
        )}
      </Group>
    );
  }
);

ElementShape.displayName = 'ElementShape';
