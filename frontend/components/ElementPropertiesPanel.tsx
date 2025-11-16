'use client';

import React, { useState, useEffect } from 'react';
import { WarehouseElement, ELEMENT_CONFIGS } from '@/lib/types';

interface ElementPropertiesPanelProps {
  element: WarehouseElement | null;
  allElements: WarehouseElement[];
  onUpdate: (id: string, updates: { label?: string }) => void;
  onClose: () => void;
}

export default function ElementPropertiesPanel({
  element,
  allElements,
  onUpdate,
  onClose,
}: ElementPropertiesPanelProps) {
  const [labelValue, setLabelValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when element changes
  useEffect(() => {
    if (element) {
      setLabelValue(element.label);
      setValidationError(null);
    }
  }, [element]);

  const handleLabelSave = async () => {
    if (!element) return;

    const trimmedLabel = labelValue.trim();

    // Validation: empty check
    if (!trimmedLabel) {
      setValidationError('Label cannot be empty');
      return;
    }

    // Validation: duplicate check (case-insensitive)
    const isDuplicate = allElements.some(
      (el) => el.id !== element.id && el.label.toLowerCase() === trimmedLabel.toLowerCase()
    );

    if (isDuplicate) {
      setValidationError(`Name "${trimmedLabel}" already exists`);
      return;
    }

    // Valid - save changes
    setIsSaving(true);
    setValidationError(null);

    try {
      await onUpdate(element.id, { label: trimmedLabel });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent event from bubbling up to prevent global keyboard shortcuts
    e.stopPropagation();

    if (e.key === 'Enter') {
      handleLabelSave();
    } else if (e.key === 'Escape') {
      if (element) {
        setLabelValue(element.label); // Reset to original
        setValidationError(null);
      }
    }
  };

  // Show empty state if no element is selected
  if (!element) {
    return (
      <div className="h-full bg-slate-900 border-l-2 border-slate-700 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-mono font-bold text-white">Element Properties</h2>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-mono font-bold text-slate-400 mb-2">No Element Selected</h3>
            <p className="text-sm text-slate-500 font-mono max-w-xs mx-auto">
              Click on an element in the canvas to view and edit its properties
            </p>
          </div>
        </div>
      </div>
    );
  }

  const config = ELEMENT_CONFIGS[element.element_type];

  return (
    <div className="h-full bg-slate-900 border-l-2 border-slate-700 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="text-lg font-mono font-bold text-white">Element Properties</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Element Type */}
        <div>
          <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
            Type
          </label>
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded"
              style={{ backgroundColor: config.color }}
            />
            <div>
              <div className="text-white font-mono font-bold">{config.displayName}</div>
              <div className="text-xs text-slate-500 font-mono">{config.description}</div>
            </div>
          </div>
        </div>

        {/* Label Input */}
        <div>
          <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
            Label
          </label>
          <input
            type="text"
            value={labelValue}
            onChange={(e) => setLabelValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleLabelSave}
            maxLength={100}
            disabled={isSaving}
            className={`w-full px-3 py-2 bg-slate-800 text-white font-mono text-sm rounded-lg focus:outline-none focus:ring-2 transition-all ${
              validationError
                ? 'border-2 border-red-500 focus:ring-red-500'
                : 'border-2 border-slate-600 focus:border-blue-500 focus:ring-blue-500'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            placeholder="Enter label..."
          />
          {validationError && (
            <div className="mt-2 px-2 py-1 bg-red-600/20 border border-red-500 text-red-400 text-xs font-mono rounded">
              {validationError}
            </div>
          )}
          <div className="mt-1 text-xs text-slate-500 font-mono">
            {labelValue.length}/100 characters
          </div>
        </div>

        {/* Position (Read-Only) */}
        <div>
          <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
            Position
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="text-xs text-slate-500 font-mono mb-1">X</div>
              <div className="text-white font-mono font-bold">
                {Math.round(Number(element.x_coordinate))}px
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="text-xs text-slate-500 font-mono mb-1">Y</div>
              <div className="text-white font-mono font-bold">
                {Math.round(Number(element.y_coordinate))}px
              </div>
            </div>
          </div>
        </div>

        {/* Dimensions (Read-Only) */}
        <div>
          <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
            Dimensions
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="text-xs text-slate-500 font-mono mb-1">Width</div>
              <div className="text-white font-mono font-bold">
                {Number(element.width)}"
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="text-xs text-slate-500 font-mono mb-1">Height</div>
              <div className="text-white font-mono font-bold">
                {Number(element.height)}"
              </div>
            </div>
          </div>
        </div>

        {/* Rotation (Read-Only) */}
        <div>
          <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
            Rotation
          </label>
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="text-white font-mono font-bold">
                {Math.round(Number(element.rotation))}°
              </div>
              <div
                className="w-8 h-8 border-2 border-slate-600 rounded"
                style={{
                  transform: `rotate(${element.rotation}deg)`,
                  background: 'linear-gradient(to right, transparent 50%, #3b82f6 50%)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Element ID (for debugging) */}
        <div>
          <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
            Element ID
          </label>
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-500 font-mono break-all">
              {element.id}
            </div>
          </div>
        </div>
      </div>

      {/* Footer with hints */}
      <div className="p-4 border-t border-slate-700 bg-slate-950">
        <div className="text-xs text-slate-500 font-mono space-y-1">
          <div>• Press <span className="text-blue-400 font-bold">Enter</span> to save label</div>
          <div>• Press <span className="text-blue-400 font-bold">Esc</span> to cancel changes</div>
          <div>• Double-click element on canvas for inline edit</div>
        </div>
      </div>
    </div>
  );
}
