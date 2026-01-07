'use client';

import { useState, useEffect, useCallback } from 'react';
import { templates, WarehouseTemplate, getTemplatesByCategory } from '@/lib/templates';
import { ELEMENT_CONFIGS } from '@/lib/types';

interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: WarehouseTemplate) => void;
  currentElementCount: number;
  elementLimit: number;
}

// SVG thumbnail generators for each template type
const TemplateThumbnail = ({ template }: { template: WarehouseTemplate }) => {
  const svgWidth = 200;
  const svgHeight = 120;

  // Scale factor to fit template in thumbnail
  const scaleX = (svgWidth - 20) / template.canvasWidth;
  const scaleY = (svgHeight - 20) / template.canvasHeight;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (svgWidth - template.canvasWidth * scale) / 2;
  const offsetY = (svgHeight - template.canvasHeight * scale) / 2;

  return (
    <svg width={svgWidth} height={svgHeight} className="bg-slate-900 rounded">
      <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
        {/* Render elements */}
        {template.elements.map((el, i) => {
          const config = ELEMENT_CONFIGS[el.element_type];
          if (el.element_type === 'text') {
            return (
              <text
                key={i}
                x={el.x_coordinate}
                y={el.y_coordinate + 12}
                fontSize={8 / scale}
                fill="#64748b"
                fontFamily="monospace"
              >
                {el.label}
              </text>
            );
          }
          return (
            <rect
              key={i}
              x={el.x_coordinate}
              y={el.y_coordinate}
              width={el.width}
              height={el.height}
              fill={config?.color || '#3b82f6'}
              opacity={0.7}
              rx={2}
            />
          );
        })}

        {/* Render route markers */}
        {template.routeMarkers.map((marker, i) => {
          const colors: Record<string, string> = {
            start_point: '#10b981',
            stop_point: '#ef4444',
            cart_parking: '#f59e0b',
          };
          return (
            <circle
              key={`marker-${i}`}
              cx={marker.x_coordinate}
              cy={marker.y_coordinate}
              r={12}
              fill={colors[marker.marker_type] || '#888'}
              opacity={0.8}
            />
          );
        })}
      </g>
    </svg>
  );
};

export default function TemplateLibrary({
  isOpen,
  onClose,
  onSelectTemplate,
  currentElementCount,
  elementLimit,
}: TemplateLibraryProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WarehouseTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'full-warehouse' | 'zone'>('all');

  // Handle applying template (extracted for reuse)
  const handleApplyTemplate = useCallback(() => {
    if (!selectedTemplate) return;

    // Check element limit
    const newTotal = currentElementCount + selectedTemplate.elements.length;
    if (newTotal > elementLimit && elementLimit !== Infinity) {
      alert(`This template would add ${selectedTemplate.elements.length} elements, exceeding your limit of ${elementLimit}. Please upgrade your plan or select a smaller template.`);
      return;
    }

    onSelectTemplate(selectedTemplate);
    onClose();
  }, [selectedTemplate, currentElementCount, elementLimit, onSelectTemplate, onClose]);

  // Tour Event Listeners - auto-select Quick Grid template
  useEffect(() => {
    if (!isOpen) return;

    const handleSelectQuickGrid = () => {
      // Find the Quick Grid template
      const quickGridTemplate = templates.find(t => t.id === 'quick-grid');
      if (quickGridTemplate) {
        setSelectedTemplate(quickGridTemplate);
      }
    };

    const handleApplyTemplateEvent = () => {
      // Auto-apply the currently selected template
      if (selectedTemplate) {
        handleApplyTemplate();
      }
    };

    window.addEventListener('tour:select-quick-grid', handleSelectQuickGrid);
    window.addEventListener('tour:apply-template', handleApplyTemplateEvent);

    return () => {
      window.removeEventListener('tour:select-quick-grid', handleSelectQuickGrid);
      window.removeEventListener('tour:apply-template', handleApplyTemplateEvent);
    };
  }, [isOpen, selectedTemplate, handleApplyTemplate]);

  if (!isOpen) return null;

  const filteredTemplates = activeCategory === 'all'
    ? templates
    : getTemplatesByCategory(activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[900px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Template Library</h2>
            <p className="text-sm text-slate-400 mt-1">
              Start with a pre-built warehouse layout to speed up your design
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category tabs */}
        <div className="px-6 py-3 border-b border-slate-800 flex gap-2">
          {[
            { id: 'all', label: 'All Templates' },
            { id: 'full-warehouse', label: 'Full Warehouse' },
            { id: 'zone', label: 'Zone Modules' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as typeof activeCategory)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                data-tour={template.id === 'quick-grid' ? 'template-quick-grid' : undefined}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                }`}
              >
                <TemplateThumbnail template={template} />
                <h3 className="font-semibold text-white mt-3">{template.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex gap-3 mt-2 text-xs text-slate-500">
                  <span>{template.elements.length} elements</span>
                  <span>{template.routeMarkers.length} markers</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between bg-slate-900/80">
          <div className="text-sm text-slate-400">
            {selectedTemplate ? (
              <span>
                Selected: <span className="text-white font-medium">{selectedTemplate.name}</span>
                {' '}({selectedTemplate.elements.length} elements)
              </span>
            ) : (
              <span>Select a template to preview</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                selectedTemplate
                  ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Apply Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
