'use client';

import React from 'react';
import { WarehouseElement } from '@/lib/types';

interface PropertiesPanelProps {
    element: WarehouseElement | null;
    selectedCount: number;
    onUpdate: (id: string, updates: any) => void;
    onGeneratePattern?: () => void;
    onResequence?: () => void;
}

export default function PropertiesPanel({ element, selectedCount, onUpdate, onGeneratePattern, onResequence }: PropertiesPanelProps) {
    if (selectedCount === 0) {
        return (
            <div className="h-full bg-slate-900 border-l border-slate-800 p-4 flex flex-col items-center justify-center text-slate-500">
                <svg className="w-12 h-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-sm font-mono">No selection</p>
            </div>
        );
    }

    if (selectedCount > 1) {
        return (
            <div className="h-full bg-slate-900 border-l border-slate-800 p-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Selection</h3>
                <div className="bg-slate-800 rounded p-3 border border-slate-700">
                    <p className="text-white font-mono text-sm">{selectedCount} items selected</p>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Actions</h4>

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
                            <span className="ml-auto text-xs text-slate-600 group-hover:text-blue-300 font-mono">G</span>
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
                            <span className="ml-auto text-xs text-slate-600 group-hover:text-green-300 font-mono">R</span>
                        </button>
                    )}
                </div>
            </div>
        );
    }

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
                                    onChange={(e) => onUpdate(element.id, { width: Number(e.target.value) })} // Note: This requires onUpdate to support width/height which it currently might not in page.tsx
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-blue-500 focus:outline-none pl-6"
                                />
                                <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-mono">W</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-1">
                                {element.element_type === 'text' ? 'Font Size' :
                                    element.element_type === 'line' || element.element_type === 'arrow' ? 'Thickness' :
                                        'Height'}
                            </label>
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
                    </div>
                </div>

                {/* Quick Actions for single element */}
                {onGeneratePattern && (
                    <>
                        <div className="h-px bg-slate-800"></div>
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase">Quick Actions</label>
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
                                    <div className="text-xs text-slate-500 group-hover:text-blue-200">Create row/grid from this element</div>
                                </div>
                                <span className="ml-auto text-xs text-slate-600 group-hover:text-blue-300 font-mono">G</span>
                            </button>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
