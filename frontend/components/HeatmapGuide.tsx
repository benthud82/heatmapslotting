'use client';

import React from 'react';
import { getHeatmapGradientCSS } from '@/lib/heatmapColors';

interface HeatmapGuideProps {
    onUploadClick: () => void;
}

export default function HeatmapGuide({ onUploadClick }: HeatmapGuideProps) {
    return (
        <div
            className="flex flex-col items-start animate-in fade-in slide-in-from-right-4 duration-500 min-w-[280px]"
            role="figure"
            aria-label="Heatmap guide"
        >
            {/* Title */}
            <div className="mb-6 pl-1">
                <h3 className="text-sm font-light tracking-widest text-slate-400 uppercase flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Visualization Ready
                </h3>
            </div>

            {/* Guide Card */}
            <div className="relative w-full bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm shadow-xl">
                {/* Gradient Preview */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative h-32 w-3 rounded-full overflow-hidden shadow-lg ring-1 ring-white/10">
                        <div
                            className="absolute inset-0"
                            style={{ background: getHeatmapGradientCSS() }}
                        />
                    </div>
                    <div className="flex flex-col justify-between h-32 py-1">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">High Traffic</span>
                            <span className="text-[10px] text-slate-500">Frequent picks</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Medium</span>
                            <span className="text-[10px] text-slate-500">Regular activity</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Low Traffic</span>
                            <span className="text-[10px] text-slate-500">Rarely visited</span>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-3 mb-6">
                    <h4 className="text-lg font-medium text-white">Unlock Your Data</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Upload your pick history to visualize traffic patterns. Identify congestion points and optimize your warehouse slotting strategy.
                    </p>
                </div>

                {/* Action Button */}
                <button
                    onClick={onUploadClick}
                    className="w-full group relative px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-mono text-sm font-bold rounded-lg transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                    <span className="relative flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        UPLOAD CSV DATA
                    </span>
                </button>

                {/* Helper Text */}
                <div className="mt-4 text-center">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider">
                        Supported format: .csv
                    </p>
                </div>
            </div>
        </div>
    );
}
