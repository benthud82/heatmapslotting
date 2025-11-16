'use client';

import React, { useState, useEffect } from 'react';
import { WarehouseElement } from '@/lib/types';

interface BulkRenameModalProps {
  selectedElements: WarehouseElement[];
  allElements: WarehouseElement[];
  onApply: (renames: { id: string; newLabel: string }[]) => void;
  onCancel: () => void;
}

export default function BulkRenameModal({
  selectedElements,
  allElements,
  onApply,
  onCancel,
}: BulkRenameModalProps) {
  const [pattern, setPattern] = useState('');
  const [startNumber, setStartNumber] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Generate preview of renames
  const generatePreview = () => {
    if (!pattern) return [];

    const preview: { id: string; oldLabel: string; newLabel: string; error?: string }[] = [];
    const usedNames = new Set(
      allElements
        .filter((el) => !selectedElements.find((sel) => sel.id === el.id))
        .map((el) => el.label.toLowerCase())
    );

    selectedElements.forEach((element, index) => {
      const number = startNumber + index;

      // Replace {##} with zero-padded number, {#} with regular number
      let newLabel = pattern;

      // Count number of # in {##} pattern to determine padding
      const paddingMatch = pattern.match(/\{(#+)\}/);
      if (paddingMatch) {
        const padding = paddingMatch[1].length;
        const paddedNumber = String(number).padStart(padding, '0');
        newLabel = pattern.replace(/\{#+\}/, paddedNumber);
      }

      // Check for duplicates
      const isDuplicate = usedNames.has(newLabel.toLowerCase());
      if (isDuplicate) {
        preview.push({
          id: element.id,
          oldLabel: element.label,
          newLabel,
          error: 'Duplicate name',
        });
      } else {
        preview.push({
          id: element.id,
          oldLabel: element.label,
          newLabel,
        });
        usedNames.add(newLabel.toLowerCase());
      }
    });

    return preview;
  };

  const preview = generatePreview();
  const hasErrors = preview.some((item) => item.error);

  const handleApply = () => {
    if (!pattern) {
      setValidationError('Pattern cannot be empty');
      return;
    }

    if (hasErrors) {
      setValidationError('Cannot apply: duplicate names detected');
      return;
    }

    const renames = preview.map((item) => ({
      id: item.id,
      newLabel: item.newLabel,
    }));

    onApply(renames);
  };

  // Initialize pattern with smart default based on first element
  useEffect(() => {
    if (selectedElements.length > 0 && !pattern) {
      const firstLabel = selectedElements[0].label;
      // Try to detect existing pattern (e.g., "B1" → "B{#}")
      const match = firstLabel.match(/^([A-Za-z]+)(\d+)$/);
      if (match) {
        const [, prefix, number] = match;
        const digitCount = number.length;
        const placeholder = digitCount > 1 ? '{##}' : '{#}';
        setPattern(`${prefix}${placeholder}`);
        setStartNumber(parseInt(number, 10));
      } else {
        setPattern(`{##}`);
      }
    }
  }, [selectedElements]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-mono font-bold text-white">Bulk Rename Elements</h2>
            <p className="text-sm text-slate-400 font-mono mt-1">
              Renaming {selectedElements.length} elements
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Pattern Input */}
          <div>
            <label className="block text-sm font-mono font-bold text-slate-300 mb-2">
              Naming Pattern
            </label>
            <input
              type="text"
              value={pattern}
              onChange={(e) => {
                setPattern(e.target.value);
                setValidationError(null);
              }}
              placeholder="e.g., A{##} or LOC{###}"
              className="w-full px-4 py-3 bg-slate-800 text-white font-mono text-sm rounded-lg border-2 border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <p className="text-xs text-slate-500 font-mono mt-2">
              Use <span className="text-blue-400 font-bold">{'{#}'}</span> for number,
              <span className="text-blue-400 font-bold"> {'{##}'}</span> for zero-padded (01, 02, ...),
              <span className="text-blue-400 font-bold"> {'{###}'}</span> for three digits (001, 002, ...)
            </p>
          </div>

          {/* Starting Number */}
          <div>
            <label className="block text-sm font-mono font-bold text-slate-300 mb-2">
              Starting Number
            </label>
            <input
              type="number"
              value={startNumber}
              onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
              min="1"
              className="w-32 px-4 py-3 bg-slate-800 text-white font-mono text-sm rounded-lg border-2 border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="px-4 py-3 bg-red-600/20 border-2 border-red-500 text-red-400 text-sm font-mono rounded-lg">
              {validationError}
            </div>
          )}

          {/* Preview */}
          <div>
            <label className="block text-sm font-mono font-bold text-slate-300 mb-3">
              Preview ({preview.length} renames)
            </label>
            <div className="bg-slate-950 border border-slate-700 rounded-lg max-h-64 overflow-y-auto">
              {preview.length === 0 ? (
                <div className="p-4 text-center text-slate-500 font-mono text-sm">
                  Enter a pattern to see preview
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {preview.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between px-4 py-3 ${
                        item.error ? 'bg-red-950/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-slate-400 font-mono text-sm">
                          {item.oldLabel}
                        </span>
                        <span className="text-slate-600">→</span>
                        <span
                          className={`font-mono text-sm font-bold ${
                            item.error ? 'text-red-400' : 'text-green-400'
                          }`}
                        >
                          {item.newLabel}
                        </span>
                      </div>
                      {item.error && (
                        <span className="text-xs text-red-400 font-mono bg-red-950 px-2 py-1 rounded">
                          {item.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-950">
          <div className="text-sm font-mono text-slate-400">
            {hasErrors && (
              <span className="text-red-400">⚠ Fix errors before applying</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-3 rounded-lg font-bold text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={hasErrors || !pattern || preview.length === 0}
              className={`px-6 py-3 rounded-lg font-bold text-sm transition-all ${
                hasErrors || !pattern || preview.length === 0
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/50'
              }`}
            >
              Apply Renames
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
