'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text, Transformer, Line } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import { WarehouseElement, ElementType, ELEMENT_CONFIGS } from '@/lib/types';
import { findSnapPoints, clampToCanvas, snapRotation } from '@/lib/snapping';

interface WarehouseCanvasProps {
  elements: WarehouseElement[];
  selectedType: ElementType | null;
  selectedElementId: string | null;
  onElementClick: (id: string) => void;
  onElementCreate: (x: number, y: number) => void;
  onElementUpdate: (id: string, updates: { x_coordinate?: number; y_coordinate?: number; rotation?: number; label?: string }) => void;
  onCanvasClick: () => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

export default function WarehouseCanvas({
  elements,
  selectedType,
  selectedElementId,
  onElementClick,
  onElementCreate,
  onElementUpdate,
  onCanvasClick,
  canvasWidth = 1200,
  canvasHeight = 800,
}: WarehouseCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedShapeRef = useRef<Konva.Rect>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current && selectedShapeRef.current && selectedElementId) {
      transformerRef.current.nodes([selectedShapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedElementId]);

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Check if clicked on empty space (Stage, Layer, background Rect, or grid lines)
    const targetType = e.target.getType();
    const clickedOnEmpty =
      e.target === stage ||
      e.target === stage.getLayers()[0] ||
      e.target.name() === 'background' || // Background Rect
      targetType === 'Line'; // Grid lines

    if (clickedOnEmpty) {
      // If placement mode is active, place new element at click position
      if (selectedType) {
        // Get pointer position relative to the Stage
        const pointerPosition = stage.getPointerPosition();
        if (!pointerPosition) return;

        // Use exact click coordinates relative to Stage canvas
        const x = pointerPosition.x;
        const y = pointerPosition.y;

        console.log('Placing element at:', { x, y }); // Debug log

        onElementCreate(x, y);

        // Clear any element selection after placing
        if (selectedElementId) {
          onCanvasClick();
        }
      } else {
        // No placement mode, just deselect any selected element
        onCanvasClick();
      }
    }
  };

  const handleElementDragMove = (element: WarehouseElement, e: KonvaEventObject<DragEvent>) => {
    const node = e.target;

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
      },
      otherElements
    );

    // Apply snap if found (converting back to center coordinates)
    let newTopLeftX = snapResult.snapX !== null ? snapResult.snapX : topLeftX;
    let newTopLeftY = snapResult.snapY !== null ? snapResult.snapY : topLeftY;

    // Clamp to canvas bounds (using top-left coordinates)
    const clamped = clampToCanvas(
      newTopLeftX,
      newTopLeftY,
      Number(element.width),
      Number(element.height),
      canvasWidth,
      canvasHeight
    );

    // Convert back to center coordinates for node position
    node.x(clamped.x + halfWidth);
    node.y(clamped.y + halfHeight);
  };

  const handleElementDragEnd = (element: WarehouseElement, e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    // Subtract offset to get top-left corner coordinates for storage
    onElementUpdate(element.id, {
      x_coordinate: node.x() - Number(element.width) / 2,
      y_coordinate: node.y() - Number(element.height) / 2,
    });
  };

  const handleElementTransform = (element: WarehouseElement, e: KonvaEventObject<Event>) => {
    const node = e.target as Konva.Rect;

    // Get current rotation and apply snap
    const currentRotation = node.rotation();
    const snappedRotation = snapRotation(currentRotation);

    // Apply snapped rotation in real-time
    node.rotation(snappedRotation);
  };

  const handleElementTransformEnd = (element: WarehouseElement, e: KonvaEventObject<Event>) => {
    const node = e.target as Konva.Rect;
    onElementUpdate(element.id, {
      rotation: node.rotation(),
    });
  };

  const handleElementDoubleClick = (elementId: string) => {
    setEditingLabel(elementId);
  };

  const handleLabelChange = (elementId: string, newLabel: string) => {
    onElementUpdate(elementId, { label: newLabel });
    setEditingLabel(null);
  };

  // Generate grid lines
  const gridSpacing = 50; // 50px grid
  const gridLines = [];

  // Vertical lines
  for (let i = 0; i <= canvasWidth; i += gridSpacing) {
    gridLines.push(
      <Line
        key={`v-${i}`}
        points={[i, 0, i, canvasHeight]}
        stroke={i % 100 === 0 ? '#1e293b' : '#0f172a'}
        strokeWidth={i % 100 === 0 ? 1 : 0.5}
        listening={false}
      />
    );
  }

  // Horizontal lines
  for (let i = 0; i <= canvasHeight; i += gridSpacing) {
    gridLines.push(
      <Line
        key={`h-${i}`}
        points={[0, i, canvasWidth, i]}
        stroke={i % 100 === 0 ? '#1e293b' : '#0f172a'}
        strokeWidth={i % 100 === 0 ? 1 : 0.5}
        listening={false}
      />
    );
  }

  return (
    <div className="relative">
      {/* Canvas Container with Blueprint Styling */}
      <div
        ref={containerRef}
        className="relative border-2 border-slate-700 rounded-lg overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(to bottom, #020617, #0f172a)',
        }}
      >
        <Stage
          ref={stageRef}
          width={canvasWidth}
          height={canvasHeight}
          onClick={handleStageClick}
        >
          <Layer>
            {/* Grid Background */}
            <Rect
              name="background"
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              fill="#0a0f1e"
              listening={true}
            />
            {gridLines}

            {/* Render all elements */}
            {elements.map((element) => {
              const config = ELEMENT_CONFIGS[element.element_type];
              const isSelected = element.id === selectedElementId;

              return (
                <ElementShape
                  key={element.id}
                  element={element}
                  config={config}
                  isSelected={isSelected}
                  isEditing={editingLabel === element.id}
                  ref={isSelected ? selectedShapeRef : null}
                  onClick={() => onElementClick(element.id)}
                  onDoubleClick={() => handleElementDoubleClick(element.id)}
                  onDragMove={(e) => handleElementDragMove(element, e)}
                  onDragEnd={(e) => handleElementDragEnd(element, e)}
                  onTransform={(e) => handleElementTransform(element, e)}
                  onTransformEnd={(e) => handleElementTransformEnd(element, e)}
                  onLabelChange={(newLabel) => handleLabelChange(element.id, newLabel)}
                />
              );
            })}

            {/* Transformer for selected element (rotation handles) */}
            {selectedElementId && (
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

        {/* Crosshair Cursor Indicator when placing */}
        {selectedType && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-600 text-white text-sm font-mono font-bold rounded-full shadow-lg border-2 border-blue-400 animate-pulse">
            PLACEMENT MODE: {ELEMENT_CONFIGS[selectedType].displayName.toUpperCase()}
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
            <div className={`w-2 h-2 rounded-full ${selectedElementId ? 'bg-amber-500' : 'bg-slate-600'}`}></div>
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Selection</div>
          </div>
          {selectedElementId ? (
            <>
              <div className="text-xl font-mono font-bold text-white">
                {elements.find(e => e.id === selectedElementId)?.label}
              </div>
              <div className="text-xs font-mono text-slate-500 mt-1">
                {(() => {
                  const elem = elements.find(e => e.id === selectedElementId);
                  if (!elem) return 'N/A';
                  return `${ELEMENT_CONFIGS[elem.element_type].displayName} @ ${Math.round(Number(elem.x_coordinate))}, ${Math.round(Number(elem.y_coordinate))}`;
                })()}
              </div>
            </>
          ) : (
            <>
              <div className="text-xl font-mono font-bold text-slate-600">None</div>
              <div className="text-xs font-mono text-slate-600 mt-1">Click element to select</div>
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
  isEditing: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onDragMove: (e: KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onTransform: (e: KonvaEventObject<Event>) => void;
  onTransformEnd: (e: KonvaEventObject<Event>) => void;
  onLabelChange: (newLabel: string) => void;
}

const ElementShape = React.forwardRef<Konva.Rect, ElementShapeProps>(
  (
    {
      element,
      config,
      isSelected,
      isEditing,
      onClick,
      onDoubleClick,
      onDragMove,
      onDragEnd,
      onTransform,
      onTransformEnd,
      onLabelChange,
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

    return (
      <>
        {/* Main Element Rectangle */}
        <Rect
          ref={ref}
          x={Number(element.x_coordinate) + Number(element.width) / 2}
          y={Number(element.y_coordinate) + Number(element.height) / 2}
          width={Number(element.width)}
          height={Number(element.height)}
          offsetX={Number(element.width) / 2}
          offsetY={Number(element.height) / 2}
          rotation={Number(element.rotation)}
          fill={config.color}
          opacity={isSelected ? 0.9 : 0.7}
          stroke={isSelected ? '#3b82f6' : '#1e293b'}
          strokeWidth={isSelected ? 3 : 1}
          draggable={true}
          onClick={onClick}
          onDblClick={onDoubleClick}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
          onTransform={onTransform}
          onTransformEnd={onTransformEnd}
          shadowColor={isSelected ? config.color : 'transparent'}
          shadowBlur={isSelected ? 20 : 0}
          shadowOpacity={0.6}
        />

        {/* Element Label */}
        <Text
          x={Number(element.x_coordinate) + 4}
          y={Number(element.y_coordinate) + 4}
          text={element.label}
          fontSize={11}
          fontFamily="monospace"
          fontStyle="bold"
          fill={isSelected ? '#ffffff' : '#e2e8f0'}
          listening={false}
          shadowColor="#000000"
          shadowBlur={4}
          shadowOpacity={0.8}
        />

        {/* Element Dimensions Label (shown on selection) */}
        {isSelected && (
          <Text
            x={Number(element.x_coordinate) + 4}
            y={Number(element.y_coordinate) + Number(element.height) - 16}
            text={`${element.width} × ${element.height} px`}
            fontSize={9}
            fontFamily="monospace"
            fill="#94a3b8"
            listening={false}
            shadowColor="#000000"
            shadowBlur={2}
            shadowOpacity={0.8}
          />
        )}
      </>
    );
  }
);

ElementShape.displayName = 'ElementShape';
