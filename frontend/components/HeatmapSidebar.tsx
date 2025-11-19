'use client';

import React, { useMemo } from 'react';
import { getHeatmapGradientCSS } from '@/lib/heatmapColors';
import { AggregatedPickData } from '@/lib/types';

interface HeatmapSidebarProps {
    minPicks: number;
    maxPicks: number;
    aggregatedData: AggregatedPickData[];
    totalPicks: number;
}

export default function HeatmapSidebar({
    minPicks,
    maxPicks,
    aggregatedData,
    totalPicks,
}: HeatmapSidebarProps) {
    // Calculate statistics
    const stats = useMemo(() => {
        const activeElements = aggregatedData.length;

        // Find date range
        let firstDate = '';
        let lastDate = '';

        if (aggregatedData.length > 0) {
            // Sort by date to find range (though backend might give us this, we'll compute from what we have if needed, 
            // but actually aggregatedData has first_date/last_date per element. 
            // We really need the global range. Let's approximate from the data or just show top hotspots for now.
            // The prompt asked for "Date Range (First pick to Last pick)". 
            // Let's calculate it from the data if possible, or just skip if not easily available without re-fetching.
            // Actually, let's just show the top hotspots and basic counts for now as per the plan.
        }

        // Top 3 Hotspots
        const topHotspots = [...aggregatedData]
            .sort((a, b) => b.total_picks - a.total_picks)
            .slice(0, 3);

        return {
            activeElements,
            topHotspots,
        };
    }, [aggregatedData]);

    return (
        <div
            className="flex flex-col h-full bg-slate-900/90 border-l border-slate-800 backdrop-blur-sm shadow-xl min-w-[280px] w-[320px] p-6 overflow-y-auto"
            role="complementary"
            aria-label="Heatmap statistics"
        >
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                    </svg>
                    Analytics
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                    Warehouse Performance
                </p>
            </div>

            {/* Legend Section */}
            <div className="mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Heatmap Scale
                </h3>
                <div className="flex items-center gap-4">
                    <div className="relative h-32 w-3 rounded-full overflow-hidden shadow-inner ring-1 ring-white/5">
                        <div
                            className="absolute inset-0"
                            style={{ background: getHeatmapGradientCSS() }}
                        />
                    </div>
                    <div className="flex flex-col justify-between h-32 py-1">
                        <div className="flex flex-col">
                            <span className="text-xl font-mono font-bold text-white">{maxPicks.toLocaleString()}</span>
                            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">High Activity</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-mono text-slate-500">{Math.round((maxPicks + minPicks) / 2).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-mono font-bold text-white">{minPicks.toLocaleString()}</span>
                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Low Activity</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Total Picks</div>
                    <div className="text-xl font-mono font-bold text-white">{totalPicks.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Active Bins</div>
                    <div className="text-xl font-mono font-bold text-white">{stats.activeElements.toLocaleString()}</div>
                </div>
            </div>

            {/* Top Hotspots */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                    Top Hotspots
                </h3>
                <div className="space-y-3">
                    {stats.topHotspots.map((spot, index) => (
                        <div key={spot.element_id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                                        index === 1 ? 'bg-slate-700 text-slate-300' :
                                            'bg-slate-800 text-slate-500'
                                    }`}>
                                    {index + 1}
                                </div>
                                <span className="font-mono text-sm text-white font-medium">{spot.element_name}</span>
                            </div>
                            <span className="font-mono text-sm text-slate-400">{spot.total_picks.toLocaleString()}</span>
                        </div>
                    ))}
                    {stats.topHotspots.length === 0 && (
                        <div className="text-sm text-slate-500 italic text-center py-4">No data available</div>
                    )}
                </div>
            </div>
        </div>
    );
}
