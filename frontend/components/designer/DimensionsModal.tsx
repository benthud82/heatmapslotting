'use client';

import React, { useState, useEffect, useCallback } from 'react';

type ElementType = 'bay' | 'flow_rack' | 'full_pallet';

interface DimensionsModalProps {
  mode: 'create' | 'edit';
  elementType: ElementType;
  initialWidth: number;
  initialHeight: number;
  sameTypeCount?: number;
  onApply: (dimensions: { width: number; height: number }, applyToAll: boolean) => void;
  onCancel: () => void;
}

const ELEMENT_COLORS: Record<ElementType, string> = {
  bay: '#3b82f6',
  flow_rack: '#10b981',
  full_pallet: '#f59e0b',
};

const ELEMENT_NAMES: Record<ElementType, string> = {
  bay: 'Bay',
  flow_rack: 'Flow Rack',
  full_pallet: 'Full Pallet',
};

const DEFAULT_DIMENSIONS: Record<ElementType, { width: number; height: number }> = {
  bay: { width: 24, height: 48 },
  flow_rack: { width: 120, height: 120 },
  full_pallet: { width: 48, height: 52 },
};

export default function DimensionsModal({
  mode,
  elementType,
  initialWidth,
  initialHeight,
  sameTypeCount = 0,
  onApply,
  onCancel,
}: DimensionsModalProps) {
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [applyToAll, setApplyToAll] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const elementColor = ELEMENT_COLORS[elementType];
  const elementName = ELEMENT_NAMES[elementType];
  const defaultDims = DEFAULT_DIMENSIONS[elementType];

  // Validate dimensions
  const validateDimensions = useCallback((w: number, h: number): string | null => {
    if (!Number.isInteger(w) || !Number.isInteger(h)) {
      return 'Dimensions must be whole numbers';
    }
    if (w < 1 || h < 1) {
      return 'Dimensions must be at least 1 inch';
    }
    if (w > 1000 || h > 1000) {
      return 'Dimensions cannot exceed 1000 inches';
    }
    return null;
  }, []);

  useEffect(() => {
    setValidationError(validateDimensions(width, height));
  }, [width, height, validateDimensions]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && !validationError) {
        onApply({ width, height }, applyToAll);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, onApply, width, height, applyToAll, validationError]);

  const handleWidthChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setWidth(num);
    } else if (value === '') {
      setWidth(0);
    }
  };

  const handleHeightChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setHeight(num);
    } else if (value === '') {
      setHeight(0);
    }
  };

  const handleApply = () => {
    if (validationError) return;
    onApply({ width, height }, applyToAll);
  };

  const handleReset = () => {
    setWidth(defaultDims.width);
    setHeight(defaultDims.height);
  };

  // Calculate preview dimensions (max 160px, maintain aspect ratio)
  const maxPreviewSize = 160;
  const aspectRatio = width / height;
  let previewWidth: number;
  let previewHeight: number;

  if (aspectRatio > 1) {
    previewWidth = maxPreviewSize;
    previewHeight = maxPreviewSize / aspectRatio;
  } else {
    previewHeight = maxPreviewSize;
    previewWidth = maxPreviewSize * aspectRatio;
  }

  // Ensure minimum preview size
  previewWidth = Math.max(previewWidth, 20);
  previewHeight = Math.max(previewHeight, 20);

  const hasChanges = width !== initialWidth || height !== initialHeight;
  const isDefault = width === defaultDims.width && height === defaultDims.height;

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="bg-slate-900 border-2 rounded-lg shadow-2xl w-full max-w-md overflow-hidden"
        style={{ borderColor: elementColor + '40' }}
      >
        {/* Header with element color accent */}
        <div
          className="relative px-6 py-5 border-b border-slate-800"
          style={{
            background: `linear-gradient(135deg, ${elementColor}15 0%, transparent 60%)`
          }}
        >
          {/* Color indicator bar */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: elementColor }}
          />

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-mono font-bold text-white flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: elementColor }}
                />
                {mode === 'create' ? 'Set' : 'Edit'} {elementName} Dimensions
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                {mode === 'create'
                  ? 'Configure size for this element type'
                  : `Editing ${sameTypeCount > 1 ? `1 of ${sameTypeCount}` : 'element'}`
                }
              </p>
            </div>
            <button
              onClick={onCancel}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Preview Section */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-center">
              {/* Grid background */}
              <div
                className="relative flex items-center justify-center"
                style={{
                  width: maxPreviewSize + 40,
                  height: maxPreviewSize + 40,
                  backgroundImage: `
                    linear-gradient(to right, rgba(71, 85, 105, 0.15) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(71, 85, 105, 0.15) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }}
              >
                {/* Element preview */}
                <div
                  className="relative transition-all duration-300 ease-out rounded-sm"
                  style={{
                    width: previewWidth,
                    height: previewHeight,
                    backgroundColor: elementColor + '30',
                    border: `2px solid ${elementColor}`,
                    boxShadow: `0 0 20px ${elementColor}30, inset 0 0 20px ${elementColor}10`
                  }}
                >
                  {/* Dimension labels on preview */}
                  <div
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-mono whitespace-nowrap"
                    style={{ color: elementColor }}
                  >
                    {width}"
                  </div>
                  <div
                    className="absolute -right-7 top-1/2 -translate-y-1/2 text-xs font-mono origin-center rotate-90 whitespace-nowrap"
                    style={{ color: elementColor }}
                  >
                    {height}"
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dimension Inputs */}
          <div className="grid grid-cols-2 gap-4">
            {/* Width Input */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                Width
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={width || ''}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  min="1"
                  max="1000"
                  className="w-full px-4 py-3 bg-slate-800 text-white font-mono text-lg rounded-lg border-2 border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-12 transition-all"
                  style={{
                    borderColor: validationError && (width < 1 || width > 1000) ? '#ef4444' : undefined
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-mono text-slate-500">
                  in
                </span>
              </div>
            </div>

            {/* Height Input */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                Height
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={height || ''}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  min="1"
                  max="1000"
                  className="w-full px-4 py-3 bg-slate-800 text-white font-mono text-lg rounded-lg border-2 border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-12 transition-all"
                  style={{
                    borderColor: validationError && (height < 1 || height > 1000) ? '#ef4444' : undefined
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-mono text-slate-500">
                  in
                </span>
              </div>
            </div>
          </div>

          {/* Default indicator / Reset button */}
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-slate-500">
              Default: {defaultDims.width}" × {defaultDims.height}"
            </div>
            {!isDefault && (
              <button
                onClick={handleReset}
                className="text-xs font-mono text-slate-400 hover:text-white transition-colors underline underline-offset-2"
              >
                Reset to default
              </button>
            )}
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="px-4 py-3 bg-red-950/50 border border-red-800 text-red-400 text-sm font-mono rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {validationError}
            </div>
          )}

          {/* Mode-specific content */}
          {mode === 'create' && (
            <div
              className="px-4 py-3 rounded-lg border text-sm font-mono flex items-start gap-3"
              style={{
                backgroundColor: elementColor + '10',
                borderColor: elementColor + '30',
                color: elementColor
              }}
            >
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-slate-300">
                This size will be used as the <span style={{ color: elementColor }}>default</span> for all future {elementName.toLowerCase()} elements you place.
              </span>
            </div>
          )}

          {mode === 'edit' && sameTypeCount > 1 && (
            <div className="space-y-3">
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Apply To
              </label>
              <div className="space-y-2">
                {/* This element only */}
                <label
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                    !applyToAll
                      ? 'bg-slate-800 border-blue-500'
                      : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="applyScope"
                    checked={!applyToAll}
                    onChange={() => setApplyToAll(false)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      !applyToAll ? 'border-blue-500' : 'border-slate-600'
                    }`}
                  >
                    {!applyToAll && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-mono text-white">This element only</div>
                    <div className="text-xs font-mono text-slate-500">Change dimensions for just the selected element</div>
                  </div>
                </label>

                {/* All elements of type */}
                <label
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                    applyToAll
                      ? 'bg-slate-800 border-blue-500'
                      : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="applyScope"
                    checked={applyToAll}
                    onChange={() => setApplyToAll(true)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      applyToAll ? 'border-blue-500' : 'border-slate-600'
                    }`}
                  >
                    {applyToAll && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-mono text-white flex items-center gap-2">
                      All {sameTypeCount} {elementName.toLowerCase()} elements
                      <span
                        className="px-1.5 py-0.5 text-xs rounded"
                        style={{
                          backgroundColor: elementColor + '20',
                          color: elementColor
                        }}
                      >
                        Batch
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-500">Apply to every {elementName.toLowerCase()} on the canvas</div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <div className="text-xs font-mono text-slate-500">
            {hasChanges && !validationError && (
              <span className="text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                Ready to apply
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 rounded-lg font-mono font-bold text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!!validationError}
              className={`px-5 py-2.5 rounded-lg font-mono font-bold text-sm transition-all ${
                validationError
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/50'
              }`}
            >
              {mode === 'create' ? 'Set Dimensions' : 'Apply Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
