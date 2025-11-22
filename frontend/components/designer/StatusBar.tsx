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
    userTier = 'free'
}: StatusBarProps) {
    const isNearLimit = elementLimit < Infinity && elementCount >= elementLimit * 0.8;
    const isAtLimit = elementCount >= elementLimit;

    return (
        <footer className="h-8 bg-blue-600 flex items-center justify-between px-3 text-[11px] font-mono text-white select-none z-40">
            {/* Left: Status & Counts */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="opacity-70">ELEMENTS:</span>
                    <span className="font-bold">{elementCount}</span>
                </div>

                {/* Usage Indicator */}
                <div className={`px-2 py-0.5 rounded flex items-center gap-2 ${isAtLimit ? 'bg-red-900/50 text-red-100' :
                        isNearLimit ? 'bg-yellow-900/50 text-yellow-100' :
                            'bg-blue-700/50 text-blue-100'
                    }`}>
                    <span>{elementCount}/{elementLimit === Infinity ? '∞' : elementLimit}</span>
                    {isAtLimit && (
                        <a href="/pricing" className="underline hover:text-white ml-1">
                            UPGRADE
                        </a>
                    )}
                </div>

                <div className="w-px h-3 bg-blue-400/50"></div>
                <div className="flex items-center gap-2">
                    <span className="opacity-70">SELECTED:</span>
                    <span className="font-bold">{selectionCount}</span>
                </div>
                {cursorPos && (
                    <>
                        <div className="w-px h-3 bg-blue-400/50"></div>
                        <div className="flex items-center gap-2 min-w-[100px]">
                            <span className="opacity-70">X:</span>
                            <span>{Math.round(cursorPos.x)}</span>
                            <span className="opacity-70 ml-1">Y:</span>
                            <span>{Math.round(cursorPos.y)}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Right: Zoom & System Status */}
            <div className="flex items-center gap-4">
                {saving ? (
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-bold">SYNCING...</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="font-bold">READY</span>
                    </div>
                )}

                <div className="w-px h-3 bg-blue-400/50"></div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={onZoomOut}
                        className="hover:bg-blue-500 px-1.5 rounded transition-colors"
                        title="Zoom Out"
                    >
                        -
                    </button>
                    <span className="min-w-[40px] text-center font-bold">{Math.round(zoom * 100)}%</span>
                    <button
                        onClick={onZoomIn}
                        className="hover:bg-blue-500 px-1.5 rounded transition-colors"
                        title="Zoom In"
                    >
                        +
                    </button>
                    <button
                        onClick={onFit}
                        className="hover:bg-blue-500 px-1.5 rounded transition-colors ml-1"
                        title="Fit to Screen"
                    >
                        FIT
                    </button>
                </div>
            </div>
        </footer>
    );
}
