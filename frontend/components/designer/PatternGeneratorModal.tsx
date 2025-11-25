'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  PatternConfig,
  PatternType,
  NumberingDirection,
  GeneratedPosition,
  generatePositions,
  generateLabels,
  validateLabels,
  detectNamingPattern,
  DIRECTION_INFO,
} from '@/lib/patternGenerator';
import { WarehouseElement, ElementType, ELEMENT_CONFIGS } from '@/lib/types';

interface PatternGeneratorModalProps {
  templateElement: WarehouseElement;
  existingLabels: string[];
  elementLimit: number;
  currentElementCount: number;
  onGenerate: (elements: GeneratedElementData[]) => void;
  onCancel: () => void;
}

export interface GeneratedElementData {
  element_type: ElementType;
  label: string;
  x_coordinate: number;
  y_coordinate: number;
  width: number;
  height: number;
  rotation: number;
}

const DIRECTIONS: NumberingDirection[] = ['serpentine', 'sequential_rows', 'sequential_cols', 'cross_aisle'];

export default function PatternGeneratorModal({
  templateElement,
  existingLabels,
  elementLimit,
  currentElementCount,
  onGenerate,
  onCancel,
}: PatternGeneratorModalProps) {
  // Detect initial pattern from template element
  const detectedPattern = useMemo(
    () => detectNamingPattern(templateElement.label),
    [templateElement.label]
  );

  // Grid spacing constant (matches canvas grid)
  const GRID_SPACING = 50;

  // State - default spacing to grid spacing for alignment
  const [patternType, setPatternType] = useState<PatternType>('grid');
  const [rows, setRows] = useState(5);
  const [columns, setColumns] = useState(5);
  const [horizontalSpacing, setHorizontalSpacing] = useState(
    GRID_SPACING - Number(templateElement.width) // Space between elements aligns to grid
  );
  const [verticalSpacing, setVerticalSpacing] = useState(
    GRID_SPACING - Number(templateElement.height) // Space between elements aligns to grid
  );
  const [namingPattern, setNamingPattern] = useState(detectedPattern.pattern);
  const [numberingDirection, setNumberingDirection] = useState<NumberingDirection>('serpentine');
  const [startRow, setStartRow] = useState(1);
  const [startCol, setStartCol] = useState(detectedPattern.startNumber);

  // Calculate effective rows/columns based on pattern type
  const effectiveRows = patternType === 'row' ? 1 : rows;
  const effectiveCols = patternType === 'column' ? 1 : columns;
  const totalElements = effectiveRows * effectiveCols;

  // Check element limit
  const remainingCapacity = elementLimit - currentElementCount;
  const exceedsLimit = totalElements > remainingCapacity;

  // Generate preview
  const { positions, labels, validation } = useMemo(() => {
    const config: PatternConfig = {
      type: patternType,
      rows: effectiveRows,
      columns: effectiveCols,
      horizontalSpacing,
      verticalSpacing,
      namingPattern,
      numberingDirection,
      startRow,
      startCol,
    };

    const template = {
      x: Number(templateElement.x_coordinate),
      y: Number(templateElement.y_coordinate),
      width: Number(templateElement.width),
      height: Number(templateElement.height),
    };

    const positions = generatePositions(template, config);
    const labels = generateLabels(namingPattern, positions, config);
    const validation = validateLabels(labels, existingLabels);

    return { positions, labels, validation };
  }, [
    patternType,
    effectiveRows,
    effectiveCols,
    horizontalSpacing,
    verticalSpacing,
    namingPattern,
    numberingDirection,
    startRow,
    startCol,
    templateElement,
    existingLabels,
  ]);

  // Handle generate
  const handleGenerate = () => {
    if (exceedsLimit || !validation.valid) return;

    const elements: GeneratedElementData[] = positions.map((pos, index) => ({
      element_type: templateElement.element_type,
      label: labels[index],
      x_coordinate: pos.x,
      y_coordinate: pos.y,
      width: Number(templateElement.width),
      height: Number(templateElement.height),
      rotation: Number(templateElement.rotation),
    }));

    onGenerate(elements);
  };

  // Render direction selector card
  const renderDirectionCard = (direction: NumberingDirection) => {
    const info = DIRECTION_INFO[direction];
    const isSelected = numberingDirection === direction;

    return (
      <button
        key={direction}
        onClick={() => setNumberingDirection(direction)}
        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
          isSelected
            ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20'
            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
        }`}
      >
        {/* Visual Grid */}
        <div className="grid gap-0.5 mb-2 font-mono text-xs">
          {info.example.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-0.5">
              {row.map((cell, cellIndex) => (
                <div
                  key={cellIndex}
                  className={`w-5 h-5 flex items-center justify-center rounded text-[10px] ${
                    cell === '→' || cell === '←' || cell === '↓'
                      ? 'text-slate-500'
                      : isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
        <span className={`text-xs font-bold ${isSelected ? 'text-blue-400' : 'text-slate-400'}`}>
          {info.name}
        </span>
      </button>
    );
  };

  // Render preview grid
  const renderPreviewGrid = () => {
    // Create a 2D array for display
    const grid: { label: string; conflict: boolean }[][] = [];
    let index = 0;

    for (let r = 0; r < Math.min(effectiveRows, 8); r++) {
      const row: { label: string; conflict: boolean }[] = [];
      for (let c = 0; c < Math.min(effectiveCols, 8); c++) {
        if (index < labels.length) {
          const label = labels[index];
          row.push({
            label,
            conflict: validation.conflicts.includes(label),
          });
          index++;
        }
      }
      grid.push(row);
    }

    const hasMore = totalElements > 64;

    return (
      <div className="space-y-1">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 items-center">
            {/* Direction indicator for serpentine */}
            {numberingDirection === 'serpentine' && (
              <span className="text-slate-600 text-xs w-4">
                {rowIndex % 2 === 0 ? '→' : '←'}
              </span>
            )}
            {row.map((cell, cellIndex) => (
              <div
                key={cellIndex}
                className={`px-2 py-1 rounded text-xs font-mono truncate max-w-[80px] ${
                  cell.conflict
                    ? 'bg-red-900/50 text-red-400 border border-red-500'
                    : 'bg-slate-800 text-slate-300'
                }`}
                title={cell.label}
              >
                {cell.label}
              </div>
            ))}
            {effectiveCols > 8 && rowIndex === 0 && (
              <span className="text-slate-500 text-xs">...+{effectiveCols - 8} more</span>
            )}
          </div>
        ))}
        {hasMore && (
          <div className="text-slate-500 text-xs text-center pt-2">
            ...and {totalElements - 64} more elements
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Generate Pattern</h2>
            <p className="text-sm text-slate-400 mt-1">
              Template: <span className="text-blue-400 font-mono">{templateElement.label}</span>
              {' • '}
              <span className="text-slate-500">
                {ELEMENT_CONFIGS[templateElement.element_type].displayName}
              </span>
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Layout Type */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Layout Type
            </label>
            <div className="flex gap-2">
              {(['row', 'column', 'grid'] as PatternType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setPatternType(type)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                    patternType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {type === 'row' && '↔ Row'}
                  {type === 'column' && '↕ Column'}
                  {type === 'grid' && '▦ Grid'}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions & Spacing */}
          <div className="grid grid-cols-2 gap-6">
            {/* Dimensions */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Dimensions
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Rows</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={rows}
                    onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={patternType === 'row'}
                    className={`w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500 focus:outline-none ${
                      patternType === 'row' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Columns</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={columns}
                    onChange={(e) => setColumns(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={patternType === 'column'}
                    className={`w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500 focus:outline-none ${
                      patternType === 'column' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Spacing */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Spacing (px)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Horizontal</label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={horizontalSpacing}
                    onChange={(e) => setHorizontalSpacing(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Vertical</label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={verticalSpacing}
                    onChange={(e) => setVerticalSpacing(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-700"></div>

          {/* Numbering Direction */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Numbering Direction
            </label>
            <div className="grid grid-cols-4 gap-3">
              {DIRECTIONS.map(renderDirectionCard)}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {DIRECTION_INFO[numberingDirection].description}
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-700"></div>

          {/* Naming Pattern */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Naming Pattern
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Pattern</label>
                <input
                  type="text"
                  value={namingPattern}
                  onChange={(e) => setNamingPattern(e.target.value)}
                  placeholder="e.g., A-{##} or {A}-{ROW}-{COL}"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Start #</label>
                <input
                  type="number"
                  min={1}
                  value={startCol}
                  onChange={(e) => setStartCol(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="text-slate-500">Syntax:</span>
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-400">{'{#}'}</code>
              <span className="text-slate-500">=1,2,3</span>
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-400">{'{##}'}</code>
              <span className="text-slate-500">=01,02</span>
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-400">{'{A}'}</code>
              <span className="text-slate-500">=A,B,C</span>
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-green-400">{'{ROW}'}</code>
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-green-400">{'{COL}'}</code>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-700"></div>

          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Preview ({totalElements} elements)
              </label>
              {exceedsLimit && (
                <span className="text-xs text-red-400 font-medium">
                  Exceeds limit! Max {remainingCapacity} more elements allowed.
                </span>
              )}
            </div>
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 overflow-x-auto">
              {renderPreviewGrid()}
            </div>

            {/* Validation Status */}
            <div className="mt-3 flex items-center gap-2">
              {validation.valid ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs text-green-400">All {totalElements} names are unique</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="text-xs text-red-400">
                    {validation.conflicts.length} name{validation.conflicts.length > 1 ? 's' : ''} conflict with existing elements
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-700 bg-slate-950">
          <div className="text-sm text-slate-500">
            {currentElementCount} existing + {totalElements} new = {currentElementCount + totalElements} total
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 rounded-lg font-medium text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={exceedsLimit || !validation.valid || totalElements === 0}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
                exceedsLimit || !validation.valid || totalElements === 0
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/50'
              }`}
            >
              Generate {totalElements} Elements
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

