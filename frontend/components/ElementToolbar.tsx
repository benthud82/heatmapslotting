'use client';

import { ElementType, ELEMENT_CONFIGS } from '@/lib/types';

interface ElementToolbarProps {
  selectedType: ElementType | null;
  onSelectType: (type: ElementType) => void;
  onDelete: () => void;
  hasSelection: boolean;
}

export default function ElementToolbar({
  selectedType,
  onSelectType,
  onDelete,
  hasSelection,
}: ElementToolbarProps) {
  const elementTypes: ElementType[] = ['bay', 'flow_rack', 'full_pallet'];

  return (
    <div className="border-b-2 border-slate-800 bg-slate-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-start justify-between gap-6">
          {/* Element Type Selector */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-blue-500 rotate-45"></div>
              <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                Element Palette
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {elementTypes.map((type) => {
                const config = ELEMENT_CONFIGS[type];
                const isSelected = selectedType === type;

                // Scale factor for preview (fit in 80px container)
                const maxDimension = Math.max(config.width, config.height);
                const scale = 60 / maxDimension;
                const previewWidth = config.width * scale;
                const previewHeight = config.height * scale;

                return (
                  <button
                    key={type}
                    onClick={() => onSelectType(type)}
                    className={`relative group overflow-hidden rounded-lg border-2 transition-all duration-300 ${
                      isSelected
                        ? 'border-white bg-slate-800 shadow-xl shadow-white/10 scale-105'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    <div className="p-4">
                      {/* Visual Size Preview */}
                      <div className="flex items-center justify-center h-20 mb-3">
                        <div
                          className="rounded transition-transform duration-300 group-hover:scale-110"
                          style={{
                            width: `${previewWidth}px`,
                            height: `${previewHeight}px`,
                            backgroundColor: config.color,
                            boxShadow: `0 0 20px ${config.color}40`,
                          }}
                        ></div>
                      </div>

                      {/* Label */}
                      <div className="text-center">
                        <div className="text-sm font-bold text-white mb-1">
                          {config.displayName}
                        </div>
                        <div className="text-xs font-mono text-slate-400">
                          {config.description}
                        </div>
                      </div>

                      {/* Actual Dimensions Badge */}
                      <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <div className="text-[10px] font-mono text-slate-500 text-center">
                          {config.width} × {config.height} px
                        </div>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[30px] border-r-[30px] border-t-blue-500 border-r-transparent">
                        <div className="absolute -top-7 -right-1 text-white text-xs">✓</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Instructions */}
            <div className="mt-4 p-3 bg-slate-800/50 rounded border border-slate-700/50">
              <p className="text-xs font-mono text-slate-400 leading-relaxed">
                {selectedType ? (
                  <>
                    <span className="text-white font-bold">PLACEMENT MODE:</span> Click canvas to place {ELEMENT_CONFIGS[selectedType].displayName.toLowerCase()} ({ELEMENT_CONFIGS[selectedType].description})
                  </>
                ) : (
                  <>
                    <span className="text-white font-bold">INSTRUCTIONS:</span> Select element → Click canvas to place → Drag to move → Select & rotate
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Panel */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-red-500 rotate-45"></div>
              <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                Actions
              </h2>
            </div>

            <button
              onClick={onDelete}
              disabled={!hasSelection}
              className={`px-6 py-3 rounded-lg font-bold text-sm tracking-wide transition-all duration-300 ${
                hasSelection
                  ? 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-900/50 hover:scale-105'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              {hasSelection ? '✕ DELETE' : 'NO SELECTION'}
            </button>

            {selectedType && (
              <button
                onClick={() => onSelectType(selectedType)}
                className="px-6 py-3 rounded-lg font-bold text-sm tracking-wide bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-300"
              >
                ⟲ DESELECT
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
