'use client';

import React, { useState, useEffect } from 'react';
import { CorrectionPlan, ElementCorrection } from '@/lib/autoAlign';

interface AutoAlignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (corrections: ElementCorrection[]) => Promise<void>;
  correctionPlan: CorrectionPlan | null;
}

export default function AutoAlignModal({
  isOpen,
  onClose,
  onApply,
  correctionPlan,
}: AutoAlignModalProps) {
  const [applying, setApplying] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize selection with all corrections when plan changes
  useEffect(() => {
    if (correctionPlan) {
      setSelectedIds(new Set(correctionPlan.corrections.map(c => c.elementId)));
    }
  }, [correctionPlan]);

  if (!isOpen || !correctionPlan) return null;

  const handleApply = async () => {
    const selectedCorrections = correctionPlan.corrections.filter(
      c => selectedIds.has(c.elementId)
    );
    if (selectedCorrections.length === 0) return;

    setApplying(true);
    try {
      await onApply(selectedCorrections);
      onClose();
    } catch (error) {
      console.error('Failed to apply auto-align:', error);
    } finally {
      setApplying(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    setSelectedIds(new Set(correctionPlan.corrections.map(c => c.elementId)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const hasCorrections = correctionPlan.totalMisaligned > 0;
  const selectedCount = selectedIds.size;

  // Get movement direction indicator
  const getDirectionIndicator = (deltaX: number, deltaY: number) => {
    if (deltaX !== 0 && deltaY !== 0) return '↗';
    if (deltaX > 0) return '→';
    if (deltaX < 0) return '←';
    if (deltaY > 0) return '↓';
    if (deltaY < 0) return '↑';
    return '•';
  };

  // Get severity color based on movement size
  const getSeverityColor = (deltaX: number, deltaY: number) => {
    const maxDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    if (maxDelta <= 5) return 'text-green-400';
    if (maxDelta <= 15) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            Auto-Align Layout
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Pattern Summary */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-sm text-slate-400 mb-2">Pattern Analysis</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Rows detected:</span>
                <span className="text-white font-medium">{correctionPlan.rowCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Columns detected:</span>
                <span className="text-white font-medium">{correctionPlan.columnCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total elements:</span>
                <span className="text-white font-medium">{correctionPlan.totalElements}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max deviation:</span>
                <span className="text-white font-medium">{correctionPlan.estimatedMaxDeviation}px</span>
              </div>
            </div>
          </div>

          {/* Misalignment Info */}
          {hasCorrections ? (
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <div className="text-amber-300 font-medium">
                    {correctionPlan.totalMisaligned} element{correctionPlan.totalMisaligned !== 1 ? 's' : ''} need alignment
                  </div>
                  <div className="text-amber-400/70 text-sm mt-1">
                    Select which items to align below.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <div className="text-green-300 font-medium">All elements are properly aligned</div>
                  <div className="text-green-400/70 text-sm mt-1">
                    No corrections needed. Your layout looks great!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Correction Selection List */}
          {hasCorrections && (
            <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
              {/* Selection Controls */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-slate-400">
                  Select items to align ({selectedCount} of {correctionPlan.corrections.length})
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    onClick={selectNone}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Select None
                  </button>
                </div>
              </div>

              {/* Correction Items */}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {correctionPlan.corrections.map((c) => (
                  <label
                    key={c.elementId}
                    className={`flex items-center gap-3 text-sm p-2 rounded-md cursor-pointer transition-colors ${
                      selectedIds.has(c.elementId)
                        ? 'bg-blue-900/30 border border-blue-700/50'
                        : 'bg-slate-800/50 border border-transparent hover:bg-slate-700/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.elementId)}
                      onChange={() => toggleSelection(c.elementId)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />

                    {/* Element type indicator */}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      c.itemType === 'marker'
                        ? 'bg-amber-900/50 text-amber-300'
                        : 'bg-blue-900/50 text-blue-300'
                    }`}>
                      {c.itemType === 'marker' ? 'M' : 'E'}
                    </span>

                    {/* Element label */}
                    <span className="text-slate-200 font-mono flex-1">{c.elementLabel}</span>

                    {/* Direction indicator */}
                    <span className={`text-lg ${getSeverityColor(c.deltaX, c.deltaY)}`}>
                      {getDirectionIndicator(c.deltaX, c.deltaY)}
                    </span>

                    {/* Movement details */}
                    <span className={`text-xs font-mono ${getSeverityColor(c.deltaX, c.deltaY)}`}>
                      {c.deltaX !== 0 && `x${c.deltaX > 0 ? '+' : ''}${c.deltaX}`}
                      {c.deltaX !== 0 && c.deltaY !== 0 && ' '}
                      {c.deltaY !== 0 && `y${c.deltaY > 0 ? '+' : ''}${c.deltaY}`}
                    </span>
                  </label>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="text-green-400">●</span> ≤5px
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-amber-400">●</span> 6-15px
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-red-400">●</span> &gt;15px
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="bg-blue-900/50 text-blue-300 px-1 rounded text-xs">E</span> Element
                  <span className="bg-amber-900/50 text-amber-300 px-1 rounded text-xs">M</span> Marker
                </span>
              </div>
            </div>
          )}

          {/* Undo Note */}
          {hasCorrections && selectedCount > 0 && (
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Press Ctrl+Z to undo after applying
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-700 bg-slate-800/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {hasCorrections && (
            <button
              onClick={handleApply}
              disabled={applying || selectedCount === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              {applying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Applying...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Apply {selectedCount} Correction{selectedCount !== 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
