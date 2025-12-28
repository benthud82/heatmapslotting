'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { templates, WarehouseTemplate } from '@/lib/templates';
import { layoutApi, elementsApi, routeMarkersApi } from '@/lib/api';

interface TemplateSelectorProps {
  onClose: () => void;
}

export function TemplateSelector({ onClose }: TemplateSelectorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectTemplate = async (template: WarehouseTemplate) => {
    setLoading(template.id);
    setError(null);

    try {
      // Create new layout with template dimensions
      const layout = await layoutApi.createLayout({
        name: `${template.name} Layout`,
        canvas_width: template.canvasWidth,
        canvas_height: template.canvasHeight,
      });

      // Create all elements from template
      for (const element of template.elements) {
        await elementsApi.create({
          layout_id: layout.id,
          element_type: element.element_type,
          label: element.label,
          x_coordinate: element.x_coordinate,
          y_coordinate: element.y_coordinate,
          width: element.width,
          height: element.height,
          rotation: element.rotation,
        });
      }

      // Create route markers if any
      for (const marker of template.routeMarkers) {
        await routeMarkersApi.create(layout.id, {
          marker_type: marker.marker_type,
          label: marker.label,
          x_coordinate: marker.x_coordinate,
          y_coordinate: marker.y_coordinate,
          sequence_order: marker.sequence_order,
        });
      }

      // Navigate to designer with the new layout
      router.push(`/designer?layout=${layout.id}`);
    } catch (err) {
      console.error('Failed to create from template:', err);
      setError('Failed to create layout. Please try again.');
      setLoading(null);
    }
  };

  const handleStartFromScratch = () => {
    router.push('/designer');
  };

  // Group templates by category
  const quickStartTemplates = templates.filter(t => t.category === 'quick-start');
  const warehouseTemplates = templates.filter(t => t.category === 'full-warehouse');
  const zoneTemplates = templates.filter(t => t.category === 'zone');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">Choose a Template</h2>
            <p className="text-sm text-slate-400 mt-1">
              Start with a pre-built layout or create from scratch
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
          {/* Quick Start - Featured */}
          {quickStartTemplates.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-mono text-cyan-400 uppercase tracking-wider mb-4">
                Recommended
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickStartTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    disabled={loading !== null}
                    className="p-5 border-2 border-cyan-500/50 rounded-xl hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{template.icon || '📦'}</div>
                      <div className="flex-1">
                        <h4 className="text-white font-semibold text-lg group-hover:text-cyan-400 transition-colors">
                          {template.name}
                        </h4>
                        <p className="text-slate-400 text-sm mt-1">{template.description}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                          <span>{template.elements.length} elements</span>
                          <span>•</span>
                          <span>{template.canvasWidth}x{template.canvasHeight}</span>
                        </div>
                      </div>
                      {loading === template.id && (
                        <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Full Warehouse Templates */}
          {warehouseTemplates.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-mono text-slate-500 uppercase tracking-wider mb-4">
                Full Warehouse Layouts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {warehouseTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    disabled={loading !== null}
                    className="p-4 border border-slate-700 rounded-xl hover:border-slate-500 bg-slate-800/50 hover:bg-slate-800 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-2xl mb-2">{template.icon || '🏭'}</div>
                    <h4 className="text-white font-medium">{template.name}</h4>
                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{template.description}</p>
                    {loading === template.id && (
                      <div className="mt-2 w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Zone Templates */}
          {zoneTemplates.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-mono text-slate-500 uppercase tracking-wider mb-4">
                Zone Templates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {zoneTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    disabled={loading !== null}
                    className="p-4 border border-slate-700 rounded-xl hover:border-slate-500 bg-slate-800/50 hover:bg-slate-800 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-2xl mb-2">{template.icon || '📦'}</div>
                    <h4 className="text-white font-medium">{template.name}</h4>
                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{template.description}</p>
                    {loading === template.id && (
                      <div className="mt-2 w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Start from Scratch */}
          <div className="border-t border-slate-800 pt-6">
            <button
              onClick={handleStartFromScratch}
              disabled={loading !== null}
              className="w-full p-4 border border-dashed border-slate-600 rounded-xl hover:border-slate-400 hover:bg-slate-800/30 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-slate-300 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-slate-300 font-medium group-hover:text-white transition-colors">
                    Start from Scratch
                  </h4>
                  <p className="text-slate-500 text-sm">Design your own custom warehouse layout</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
