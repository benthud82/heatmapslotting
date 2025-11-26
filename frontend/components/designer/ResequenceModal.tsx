'use client';

import React, { useState, useMemo } from 'react';
import {
  NumberingDirection,
  sortElementsByPosition,
  detectGridStructure,
  detectNamingPattern,
  DIRECTION_INFO,
} from '@/lib/patternGenerator';
import { WarehouseElement } from '@/lib/types';

interface ResequenceModalProps {
  selectedElements: WarehouseElement[];
  allElements: WarehouseElement[];
  onApply: (renames: { id: string; newLabel: string }[]) => void;
  onCancel: () => void;
}

interface RenamePreview {
  id: string;
  oldLabel: string;
  newLabel: string;
  conflict: boolean;
}

const DIRECTIONS: NumberingDirection[] = ['serpentine', 'sequential_rows', 'sequential_cols', 'cross_aisle'];

export default function ResequenceModal({
  selectedElements,
  allElements,
  onApply,
  onCancel,
}: ResequenceModalProps) {
  // Detect grid structure from selected elements
  const gridStructure = useMemo(
    () => detectGridStructure(selectedElements),
    [selectedElements]
  );

  // Detect initial pattern from first element
  const detectedPattern = useMemo(() => {
    if (selectedElements.length > 0) {
      return detectNamingPattern(selectedElements[0].label);
    }
    return { pattern: '{##}', startNumber: 1, prefix: '', suffix: '' };
  }, [selectedElements]);

  // State
  const [numberingDirection, setNumberingDirection] = useState<NumberingDirection>('serpentine');
  const [namingPattern, setNamingPattern] = useState(detectedPattern.pattern);
  const [startNumber, setStartNumber] = useState(detectedPattern.startNumber);

  // Get labels of elements NOT being renamed (for conflict checking)
  const otherLabels = useMemo(() => {
    const selectedIds = new Set(selectedElements.map((e) => e.id));
    return allElements.filter((e) => !selectedIds.has(e.id)).map((e) => e.label);
  }, [selectedElements, allElements]);

  // Generate preview
  const preview = useMemo((): RenamePreview[] => {
    // Sort elements by position based on direction
    const sorted = sortElementsByPosition(selectedElements, numberingDirection);

    const previews: RenamePreview[] = [];
    const usedLabels = new Set(otherLabels.map((l) => l.toLowerCase()));

    sorted.forEach((element, index) => {
      // Generate new label
      let newLabel = namingPattern;
      const num = startNumber + index;

      // Replace {ROW} - use row based on grid structure
      const row = Math.floor(index / gridStructure.columns) + 1;
      const col = (index % gridStructure.columns) + 1;

      newLabel = newLabel.replace(/\{ROW(#+)?\}/gi, (_, hashes) => {
        const padding = hashes ? hashes.length : 0;
        return padding > 0 ? String(row).padStart(padding, '0') : String(row);
      });

      newLabel = newLabel.replace(/\{COL(#+)?\}/gi, (_, hashes) => {
        const padding = hashes ? hashes.length : 0;
        return padding > 0 ? String(col).padStart(padding, '0') : String(col);
      });

      // Replace {A}, {AA} with letters
      newLabel = newLabel.replace(/\{(A+)\}/g, () => {
        let result = '';
        let n = num;
        while (n > 0) {
          n--;
          result = String.fromCharCode(65 + (n % 26)) + result;
          n = Math.floor(n / 26);
        }
        return result || 'A';
      });

      // Replace {#}, {##}, {###} with numbers
      newLabel = newLabel.replace(/\{(#+)\}/g, (_, hashes) => {
        const padding = hashes.length;
        return padding > 1 ? String(num).padStart(padding, '0') : String(num);
      });

      // Check for conflicts
      const conflict = usedLabels.has(newLabel.toLowerCase());
      usedLabels.add(newLabel.toLowerCase());

      previews.push({
        id: element.id,
        oldLabel: element.label,
        newLabel,
        conflict,
      });
    });

    return previews;
  }, [selectedElements, numberingDirection, namingPattern, startNumber, otherLabels, gridStructure]);

  const hasConflicts = preview.some((p) => p.conflict);
  const changeCount = preview.filter((p) => p.oldLabel !== p.newLabel).length;

  // Handle apply
  const handleApply = () => {
    if (hasConflicts) return;

    const renames = preview
      .filter((p) => p.oldLabel !== p.newLabel)
      .map((p) => ({
        id: p.id,
        newLabel: p.newLabel,
      }));

    onApply(renames);
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Re-sequence Selection</h2>
            <p className="text-sm text-slate-400 mt-1">
              Rename {selectedElements.length} elements based on their positions
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
          {/* Detected Layout */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-sm text-slate-300">
                Detected Layout:{' '}
                <span className="font-mono font-bold text-white">
                  {gridStructure.rows} rows × {gridStructure.columns} columns
                </span>
              </span>
            </div>
          </div>

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
                  value={startNumber}
                  onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
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
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Preview ({changeCount} changes)
            </label>
            <div className="bg-slate-950 border border-slate-700 rounded-lg max-h-64 overflow-y-auto">
              <div className="divide-y divide-slate-800">
                {preview.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-4 py-2.5 ${
                      item.conflict ? 'bg-red-950/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-slate-400 font-mono text-sm truncate">
                        {item.oldLabel}
                      </span>
                      <span className="text-slate-600 flex-shrink-0">→</span>
                      <span
                        className={`font-mono text-sm font-bold truncate ${
                          item.conflict
                            ? 'text-red-400'
                            : item.oldLabel === item.newLabel
                            ? 'text-slate-500'
                            : 'text-green-400'
                        }`}
                      >
                        {item.newLabel}
                      </span>
                    </div>
                    {item.conflict && (
                      <span className="text-xs text-red-400 font-mono bg-red-950 px-2 py-1 rounded flex-shrink-0 ml-2">
                        Conflict
                      </span>
                    )}
                    {item.oldLabel === item.newLabel && !item.conflict && (
                      <span className="text-xs text-slate-600 font-mono flex-shrink-0 ml-2">
                        No change
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Status */}
            <div className="mt-3 flex items-center gap-2">
              {hasConflicts ? (
                <>
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="text-xs text-red-400">
                    {preview.filter((p) => p.conflict).length} name conflicts detected
                  </span>
                </>
              ) : changeCount > 0 ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs text-green-400">
                    {changeCount} element{changeCount > 1 ? 's' : ''} will be renamed
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
                  <span className="text-xs text-slate-400">No changes to apply</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-700 bg-slate-950">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg font-medium text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={hasConflicts || changeCount === 0}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
              hasConflicts || changeCount === 0
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/50'
            }`}
          >
            Rename {changeCount} Element{changeCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}


