'use client';

import React from 'react';

interface StatusBarProps {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    saving: boolean;
    elementCount: number;
    selectionCount: number;
    cursorPos?: { x: number; y: number };
    elementLimit?: number;
    userTier?: string;
    showGrid: boolean;
    onToggleGrid: () => void;
    snapToGrid: boolean;
    onToggleSnap: () => void;
}

export default function StatusBar({
    zoom,
    onZoomIn,
    onZoomOut,
    onFit,
    saving,
    elementCount,
    selectionCount,
    cursorPos,
    elementLimit = 50,
    userTier = 'free',
    showGrid,
    onToggleGrid,
    snapToGrid,
    onToggleSnap
}: StatusBarProps) {
    const isNearLimit = elementLimit < Infinity && elementCount >= elementLimit * 0.8;
    const isAtLimit = elementCount >= elementLimit;

    return (
        <footer className="h-7 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-3 text-[11px] font-mono text-slate-300 select-none z-40">
            {/* Left: Status & Counts */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">ELEMENTS:</span>
                    <span className="font-semibold text-white">{elementCount}</span>
                </div>

                {/* Usage Indicator */}
                <div className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1.5 ${
                    isAtLimit ? 'bg-red-900/40 text-red-300 border border-red-800/50' :
                    isNearLimit ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-800/50' :
                    'bg-slate-800/50 text-slate-400 border border-slate-700/50'
                }`}>
                    <span>{elementCount}/{elementLimit === Infinity ? '∞' : elementLimit}</span>
                    {isAtLimit && (
                        <a href="/pricing" className="text-red-400 hover:text-red-300 underline">
                            UPGRADE
                        </a>
                    )}
                </div>

                <div className="w-px h-3 bg-slate-700"></div>

                <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">SELECTED:</span>
                    <span className="font-semibold text-white">{selectionCount}</span>
                </div>

                {cursorPos && (
                    <>
                        <div className="w-px h-3 bg-slate-700"></div>
                        <div className="flex items-center gap-1.5 min-w-[90px] text-slate-400">
                            <span className="text-slate-500">X:</span>
                            <span>{Math.round(cursorPos.x)}</span>
                            <span className="text-slate-500 ml-1">Y:</span>
                            <span>{Math.round(cursorPos.y)}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Center: Grid & Snap Toggles */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleGrid}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        showGrid
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:text-slate-400'
                    }`}
                    title="Toggle Grid (G)"
                >
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16M6 4v16M12 4v16M18 4v16" />
                        </svg>
                        Grid
                    </span>
                </button>
                <button
                    onClick={onToggleSnap}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        snapToGrid
                            ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                            : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:text-slate-400'
                    }`}
                    title="Toggle Snap (S)"
                >
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                        </svg>
                        Snap
                    </span>
                </button>
            </div>

            {/* Right: Sync Status & Zoom */}
            <div className="flex items-center gap-3">
                {saving ? (
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <div className="w-1.5 h-1.5 border border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[10px]">SYNCING</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        <span className="text-[10px] text-green-400">READY</span>
                    </div>
                )}

                <div className="w-px h-3 bg-slate-700"></div>

                <div className="flex items-center gap-0.5">
                    <button
                        onClick={onZoomOut}
                        className="hover:bg-slate-800 text-slate-400 hover:text-white px-1.5 py-0.5 rounded transition-colors"
                        title="Zoom Out (-)"
                    >
                        −
                    </button>
                    <span className="min-w-[36px] text-center text-slate-300">{Math.round(zoom * 100)}%</span>
                    <button
                        onClick={onZoomIn}
                        className="hover:bg-slate-800 text-slate-400 hover:text-white px-1.5 py-0.5 rounded transition-colors"
                        title="Zoom In (+)"
                    >
                        +
                    </button>
                    <button
                        onClick={onFit}
                        className="hover:bg-slate-800 text-slate-400 hover:text-white px-1.5 py-0.5 rounded transition-colors ml-1 text-[10px] font-medium"
                        title="Fit to Screen (F)"
                    >
                        FIT
                    </button>
                </div>
            </div>
        </footer>
    );
}
