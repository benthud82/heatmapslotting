'use client';

import { useState, useCallback } from 'react';
import { parseDxfFile, validateDxfFile, DxfImportResult, ImportedElement } from '@/lib/dxfImporter';

interface DxfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (elements: ImportedElement[]) => void;
  currentElementCount: number;
  elementLimit: number;
}

export default function DxfImportModal({
  isOpen,
  onClose,
  onImport,
  currentElementCount,
  elementLimit,
}: DxfImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DxfImportResult | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setIsProcessing(true);

    try {
      // Read file content
      const content = await file.text();

      // Validate it's a DXF file
      if (!validateDxfFile(content)) {
        throw new Error('Invalid DXF file format. Please select a valid AutoCAD DXF file.');
      }

      // Parse the DXF
      const importResult = parseDxfFile(content);
      setResult(importResult);

      // Check element limit
      const newTotal = currentElementCount + importResult.elements.length;
      if (newTotal > elementLimit && elementLimit !== Infinity) {
        importResult.warnings.push(
          `Warning: Importing ${importResult.elements.length} elements would exceed your limit of ${elementLimit}.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process DXF file');
    } finally {
      setIsProcessing(false);
    }
  }, [currentElementCount, elementLimit]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.dxf') || file.name.endsWith('.DXF'))) {
      handleFile(file);
    } else {
      setError('Please drop a .dxf file');
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    e.target.value = '';
  }, [handleFile]);

  const handleImport = useCallback(() => {
    if (result && result.elements.length > 0) {
      onImport(result.elements);
      onClose();
      setResult(null);
    }
  }, [result, onImport, onClose]);

  const handleClose = useCallback(() => {
    setResult(null);
    setError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Import DXF/CAD File</h2>
            <p className="text-sm text-slate-400 mt-1">
              Import warehouse layouts from AutoCAD DXF files
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!result ? (
            /* Upload Zone */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-slate-400">Processing DXF file...</p>
                </div>
              ) : (
                <>
                  <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg text-white mb-2">Drop your DXF file here</p>
                  <p className="text-sm text-slate-400 mb-4">or</p>
                  <label className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-500 transition-colors">
                    Browse Files
                    <input
                      type="file"
                      accept=".dxf"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-4">Supports AutoCAD DXF format</p>
                </>
              )}
            </div>
          ) : (
            /* Result Preview */
            <div>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{result.stats.totalEntities}</div>
                  <div className="text-xs text-slate-400">Total Entities</div>
                </div>
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{result.stats.convertedEntities}</div>
                  <div className="text-xs text-slate-400">Converted</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-400">{result.stats.skippedEntities}</div>
                  <div className="text-xs text-slate-400">Skipped</div>
                </div>
              </div>

              {/* Element Preview */}
              {result.elements.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-white mb-3">Elements to Import</h3>
                  <div className="bg-slate-800 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                      {result.elements.slice(0, 20).map((el, i) => (
                        <div key={i} className="flex items-center gap-1 text-slate-300">
                          <span className="w-2 h-2 rounded-full" style={{
                            backgroundColor: el.element_type === 'bay' ? '#3b82f6' :
                              el.element_type === 'flow_rack' ? '#10b981' :
                              el.element_type === 'full_pallet' ? '#f59e0b' : '#e2e8f0'
                          }} />
                          {el.label}
                        </div>
                      ))}
                      {result.elements.length > 20 && (
                        <div className="text-slate-500">+{result.elements.length - 20} more...</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-2">Warnings</h3>
                  <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                    {result.warnings.map((warning, i) => (
                      <p key={i} className="text-xs text-yellow-300">{warning}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Try Another */}
              <button
                onClick={() => setResult(null)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Try another file
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-900/30 border border-red-700 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between bg-slate-900/80">
          <div className="text-sm text-slate-400">
            {result && result.elements.length > 0 ? (
              <span>
                Ready to import <span className="text-white font-medium">{result.elements.length}</span> elements
              </span>
            ) : (
              <span>Select a DXF file to preview</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!result || result.elements.length === 0}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                result && result.elements.length > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Import Elements
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
