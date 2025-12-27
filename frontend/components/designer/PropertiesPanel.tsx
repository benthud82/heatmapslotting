'use client';

import React from 'react';
import { WarehouseElement, RouteMarker, ROUTE_MARKER_CONFIGS, LabelDisplayMode } from '@/lib/types';
import { AlignmentType } from '@/lib/alignment';

interface PropertiesPanelProps {
    element: WarehouseElement | null;
    selectedCount: number;
    onUpdate: (id: string, updates: any) => void;
    onGeneratePattern?: () => void;
    onResequence?: () => void;
    // Route marker props
    selectedMarker?: RouteMarker | null;
    onMarkerUpdate?: (id: string, updates: any) => void;
    onMarkerDelete?: (id: string) => void;
    // New props for enhanced empty state
    elements?: WarehouseElement[];
    routeMarkers?: RouteMarker[];
    labelDisplayMode?: LabelDisplayMode;
    onLabelDisplayModeChange?: (mode: LabelDisplayMode) => void;
    // Alignment
    onAlign?: (type: AlignmentType) => void;
}

export default function PropertiesPanel({
    element,
    selectedCount,
    onUpdate,
    onGeneratePattern,
    onResequence,
    selectedMarker,
    onMarkerUpdate,
    onMarkerDelete,
    elements = [],
    routeMarkers = [],
    labelDisplayMode = 'all',
    onLabelDisplayModeChange,
    onAlign
}: PropertiesPanelProps) {
    // Route marker is selected
    if (selectedMarker) {
        const config = ROUTE_MARKER_CONFIGS[selectedMarker.marker_type];

        return (
            <div className="h-full bg-slate-900 border-l border-slate-800 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Route Marker</h3>
                    <div className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: config.color }}
                        ></div>
                        <span className="text-sm font-mono text-white font-bold truncate">{selectedMarker.label}</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Identity Section */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase">Identity</label>
                        <div className="grid grid-cols-1 gap-2">
                            <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Label</label>
                                <input
                                    type="text"
                                    value={selectedMarker.label}
                                    onChange={(e) => onMarkerUpdate?.(selectedMarker.id, { label: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Type</label>
                                <div
                                    className="w-full border rounded px-2 py-1 text-sm font-mono capitalize flex items-center gap-2"
                                    style={{
                                        backgroundColor: `${config.color}20`,
                                        borderColor: config.color,
                                        color: config.color
                                    }}
                                >
                                    {selectedMarker.marker_type === 'start_point' && '▶'}
                                    {selectedMarker.marker_type === 'stop_point' && '■'}
                                    {selectedMarker.marker_type === 'cart_parking' && '🛒'}
                                    <span>{selectedMarker.marker_type.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-800"></div>

                    {/* Position Section */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase">Position</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-slate-400 block mb-1">X Position</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={Math.round(selectedMarker.x_coordinate)}
                                        onChange={(e) => onMarkerUpdate?.(selectedMarker.id, { x_coordinate: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-blue-500 focus:outline-none pl-6"
                                    />
                                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-mono">X</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Y Position</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={Math.round(selectedMarker.y_coordinate)}
                                        onChange={(e) => onMarkerUpdate?.(selectedMarker.id, { y_coordinate: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-blue-500 focus:outline-none pl-6"
                                    />
                                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-mono">Y</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sequence Order for Cart Parking */}
                    {selectedMarker.marker_type === 'cart_parking' && (
                        <>
                            <div className="h-px bg-slate-800"></div>
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase">Pick Path</label>
                                <div>
                                    <label className="text-[10px] text-slate-400 block mb-1">Sequence Order</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={selectedMarker.sequence_order || 1}
                                        onChange={(e) => onMarkerUpdate?.(selectedMarker.id, { sequence_order: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Order in the pick path (1 = first)</p>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="h-px bg-slate-800"></div>

                    {/* Delete Button */}
                    <div className="pt-2">
                        <button
                            onClick={() => onMarkerDelete?.(selectedMarker.id)}
                            className="w-full px-3 py-2 bg-red-900/30 hover:bg-red-600 border border-red-800 hover:border-red-500 rounded text-sm font-medium text-red-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete Marker
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // No selection - Show Canvas Summary
    if (selectedCount === 0) {
        // Calculate element counts by type
        const bayCount = elements.filter(e => e.element_type === 'bay').length;
        const flowRackCount = elements.filter(e => e.element_type === 'flow_rack').length;
        const palletCount = elements.filter(e => e.element_type === 'full_pallet').length;
        const textCount = elements.filter(e => e.element_type === 'text').length;
        const lineCount = elements.filter(e => e.element_type === 'line').length;
        const arrowCount = elements.filter(e => e.element_type === 'arrow').length;
        const markerCount = routeMarkers.length;

        return (
            <div className="h-full bg-slate-900 border-l border-slate-800 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Canvas</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Canvas Summary */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase">Summary</label>
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Bays</span>
                                    <span className="text-white font-mono">{bayCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Flow Racks</span>
                                    <span className="text-white font-mono">{flowRackCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Pallets</span>
                                    <span className="text-white font-mono">{palletCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Annotations</span>
                                    <span className="text-white font-mono">{textCount + lineCount + arrowCount}</span>
                                </div>
                            </div>
                            <div className="h-px bg-slate-800 my-2"></div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Route Markers</span>
                                <span className="text-white font-mono">{markerCount}</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-slate-400">Total Elements</span>
                                <span className="text-blue-400 font-mono">{elements.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-800"></div>

                    {/* Display Options */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase">Display Options</label>
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-2">Label Mode</label>
                            <div className="flex gap-1">
                                {(['all', 'selected', 'none'] as LabelDisplayMode[]).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => onLabelDisplayModeChange?.(mode)}
                                        className={`flex-1 px-2 py-1.5 text-[10px] font-medium rounded transition-colors capitalize ${labelDisplayMode === mode
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                            }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-800"></div>

                    {/* Keyboard Shortcuts */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase">Shortcuts</label>
                        <div className="space-y-1.5 text-[11px]">
                            {[
                                { key: 'V', action: 'Select tool' },
                                { key: 'B', action: 'Bay tool' },
                                { key: 'Del', action: 'Delete selected' },
                                { key: 'Ctrl+C', action: 'Copy' },
                                { key: 'Ctrl+V', action: 'Paste' },
                                { key: 'Ctrl+Z', action: 'Undo' },
                                { key: 'Ctrl+A', action: 'Select all' },
                            ].map(({ key, action }) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-slate-500">{action}</span>
                                    <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-mono rounded border border-slate-700">
                                        {key}
                                    </kbd>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Multiple elements selected
    if (selectedCount > 1) {
        return (
            <div className="h-full bg-slate-900 border-l border-slate-800 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Selection</h3>
                    <div className="bg-blue-600/20 border border-blue-500/30 rounded px-2 py-1">
                        <span className="text-sm font-mono text-blue-400">{selectedCount} items selected</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Alignment Tools */}
                    {onAlign && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase">Align</label>
                            <div className="grid grid-cols-3 gap-1">
                                {[
                                    { type: 'left' as AlignmentType, icon: '⬅', title: 'Align Left' },
                                    { type: 'centerH' as AlignmentType, icon: '↔', title: 'Center Horizontal' },
                                    { type: 'right' as AlignmentType, icon: '➡', title: 'Align Right' },
                                    { type: 'top' as AlignmentType, icon: '⬆', title: 'Align Top' },
                                    { type: 'centerV' as AlignmentType, icon: '↕', title: 'Center Vertical' },
                                    { type: 'bottom' as AlignmentType, icon: '⬇', title: 'Align Bottom' },
                                ].map(({ type, icon, title }) => (
                                    <button
                                        key={type}
                                        onClick={() => onAlign(type)}
                                        className="p-2 bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 rounded text-slate-400 hover:text-white transition-colors text-sm"
                                        title={title}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                <button
                                    onClick={() => onAlign('distributeH')}
                                    className="p-2 bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 rounded text-slate-400 hover:text-white transition-colors text-[10px] font-medium"
                                    title="Distribute Horizontally"
                                >
                                    Distribute H
                                </button>
                                <button
                                    onClick={() => onAlign('distributeV')}
                                    className="p-2 bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 rounded text-slate-400 hover:text-white transition-colors text-[10px] font-medium"
                                    title="Distribute Vertically"
                                >
                                    Distribute V
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="h-px bg-slate-800"></div>

                    {/* Quick Actions */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase">Quick Actions</label>

                        {onGeneratePattern && (
                            <button
                                onClick={onGeneratePattern}
                                className="w-full flex items-center gap-3 px-3 py-2.5 bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 rounded-lg transition-all group"
                            >
                                <div className="w-8 h-8 bg-slate-700 group-hover:bg-blue-500 rounded flex items-center justify-center">
                                    <svg className="w-4 h-4 text-slate-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-medium text-slate-300 group-hover:text-white">Generate Pattern</div>
                                    <div className="text-xs text-slate-500 group-hover:text-blue-200">Create grid from selection</div>
                                </div>
                                <kbd className="ml-auto px-1.5 py-0.5 bg-slate-900 text-slate-500 group-hover:text-blue-300 text-[10px] font-mono rounded">G</kbd>
                            </button>
                        )}

                        {onResequence && (
                            <button
                                onClick={onResequence}
                                className="w-full flex items-center gap-3 px-3 py-2.5 bg-slate-800 hover:bg-green-600 border border-slate-700 hover:border-green-500 rounded-lg transition-all group"
                            >
                                <div className="w-8 h-8 bg-slate-700 group-hover:bg-green-500 rounded flex items-center justify-center">
                                    <svg className="w-4 h-4 text-slate-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-medium text-slate-300 group-hover:text-white">Re-sequence</div>
                                    <div className="text-xs text-slate-500 group-hover:text-green-200">Rename by position</div>
                                </div>
                                <kbd className="ml-auto px-1.5 py-0.5 bg-slate-900 text-slate-500 group-hover:text-green-300 text-[10px] font-mono rounded">R</kbd>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Single element selected
    if (!element) return null;

    return (
        <div className="h-full bg-slate-900 border-l border-slate-800 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Properties</h3>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-mono text-white font-bold truncate">{element.label}</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Identity Section */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase">Identity</label>
                    <div className="grid grid-cols-1 gap-2">
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Label</label>
                            <input
                                type="text"
                                value={element.label}
                                onChange={(e) => onUpdate(element.id, { label: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Type</label>
                            <div className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-300 font-mono capitalize opacity-50 cursor-not-allowed">
                                {element.element_type.replace('_', ' ')}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-800"></div>

                {/* Transform Section */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase">Transform</label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-1">X Position</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={Math.round(element.x_coordinate)}
                                    onChange={(e) => onUpdate(element.id, { x_coordinate: Number(e.target.value) })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-blue-500 focus:outline-none pl-6"
                                />
                                <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-mono">X</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Y Position</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={Math.round(element.y_coordinate)}
                                    onChange={(e) => onUpdate(element.id, { y_coordinate: Number(e.target.value) })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-blue-500 focus:outline-none pl-6"
                                />
                                <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-mono">Y</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Rotation</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={Math.round(element.rotation)}
                                    onChange={(e) => onUpdate(element.id, { rotation: Number(e.target.value) })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-blue-500 focus:outline-none pl-6"
                                />
                                <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-mono">°</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-800"></div>

                {/* Dimensions Section */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase">Dimensions</label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-1">
                                {element.element_type === 'text' ? 'Width' :
                                    element.element_type === 'line' || element.element_type === 'arrow' ? 'Length' :
                                        'Width'}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={Math.round(element.width)}
                                    onChange={(e) => onUpdate(element.id, { width: Number(e.target.value) })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-blue-500 focus:outline-none pl-6"
                                />
                                <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-mono">W</span>
                            </div>
                        </div>
                        {element.element_type !== 'line' && element.element_type !== 'arrow' && (
                            <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Height</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={Math.round(element.height)}
                                        onChange={(e) => onUpdate(element.id, { height: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-blue-500 focus:outline-none pl-6"
                                    />
                                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-mono">H</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ID Section (for reference) */}
                <div className="h-px bg-slate-800"></div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Reference</label>
                    <div className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5">
                        <code className="text-[10px] text-slate-500 font-mono break-all">{element.id}</code>
                    </div>
                </div>
            </div>
        </div>
    );
}
