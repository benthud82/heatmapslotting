'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { getHeatmapGradientCSS } from '@/lib/heatmapColors';
import { AggregatedPickData, AggregatedItemPickData } from '@/lib/types';
import { picksApi } from '@/lib/api';


interface HeatmapSidebarProps {
    minPicks: number;
    maxPicks: number;
    aggregatedData: AggregatedPickData[];
    totalPicks: number;
    selectedElementId: string | null;
    layoutId: string | null;
    onClearSelection?: () => void;
    startDate?: string;
    endDate?: string;
    onViewDetails?: () => void;
    onSkuClick?: (item: AggregatedItemPickData, rank: number) => void;
}

export default function HeatmapSidebar({
    minPicks,
    maxPicks,
    aggregatedData,
    totalPicks,
    selectedElementId,
    layoutId,
    onClearSelection,
    startDate = '',
    endDate = '',
    onViewDetails,
    onSkuClick,
}: HeatmapSidebarProps) {
    // Item data state for selected element
    const [itemData, setItemData] = useState<AggregatedItemPickData[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [mostRecentDate, setMostRecentDate] = useState<string | null>(null);

    // Get selected element data from aggregatedData
    const selectedElement = useMemo(() => {
        if (!selectedElementId) return null;
        return aggregatedData.find(d => d.element_id === selectedElementId) || null;
    }, [selectedElementId, aggregatedData]);

    // Fetch item data when element is selected or dates change
    useEffect(() => {
        if (selectedElementId && layoutId) {
            fetchItemData();
        } else {
            setItemData([]);
            setMostRecentDate(null);
        }
    }, [selectedElementId, layoutId, startDate, endDate]);

    const fetchItemData = async () => {
        if (!layoutId || !selectedElementId) return;

        try {
            setItemsLoading(true);

            let start = startDate;
            let end = endDate;

            // If no date range provided, fallback to most recent date
            if (!start || !end) {
                const dates = await picksApi.getItemsDates(layoutId);
                if (dates.length > 0) {
                    // Dates are sorted ascending, so last is most recent
                    const recentDate = dates[dates.length - 1];
                    setMostRecentDate(recentDate);
                    start = recentDate;
                    end = recentDate;
                } else {
                    setItemData([]);
                    setMostRecentDate(null);
                    return;
                }
            } else {
                // If provided, ensure mostRecentDate reflects the end date or range hint
                setMostRecentDate(endDate === startDate ? startDate : `${startDate} → ${endDate}`);
            }

            // Fetch item data for that date/range
            const allItems = await picksApi.getItemsAggregated(layoutId, start, end);
            const elementItems = allItems.filter(item => item.element_id === selectedElementId);
            // Sort by picks descending
            elementItems.sort((a, b) => b.total_picks - a.total_picks);
            setItemData(elementItems);

        } catch (err) {
            console.error('Failed to load item data:', err);
            setItemData([]);
        } finally {
            setItemsLoading(false);
        }
    };

    // Calculate statistics
    const stats = useMemo(() => {
        const activeElements = aggregatedData.length;

        // Top 3 Hotspots
        const topHotspots = [...aggregatedData]
            .sort((a, b) => b.total_picks - a.total_picks)
            .slice(0, 3);

        return {
            activeElements,
            topHotspots,
        };
    }, [aggregatedData]);

    // Render element detail view when element is selected
    if (selectedElementId && selectedElement) {
        return (
            <div
                className="flex flex-col h-full bg-slate-900/90 border-l border-slate-800 backdrop-blur-sm shadow-xl min-w-[280px] w-[320px] overflow-hidden"
                role="complementary"
                aria-label="Element details"
            >
                {/* Header with back button */}
                <div className="p-4 border-b border-slate-800 bg-slate-800/30">
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={onClearSelection}
                            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Overview
                        </button>
                    </div>
                    <h2 className="text-lg font-bold text-white font-mono">{selectedElement.element_name}</h2>
                    <p className="text-xs text-slate-400 mt-1">Element Detail</p>
                </div>

                {/* Stats Row */}
                <div className="p-4 border-b border-slate-800">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xl font-bold text-white font-mono">{selectedElement.total_picks.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-400 uppercase">Total Picks</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xl font-bold text-cyan-400 font-mono">{itemData.length}</div>
                            <div className="text-[10px] text-slate-400 uppercase">Items</div>
                        </div>
                    </div>

                    {selectedElement.roundTripDistanceFeet !== undefined && (
                        <div className="mt-3 bg-slate-800/50 rounded-lg p-3 flex items-center justify-between border border-slate-700/50">
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Round Trip</div>
                                <div className="text-[10px] text-slate-500">To Parking & Back</div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-emerald-400 font-mono">
                                    {selectedElement.roundTripDistanceFeet.toLocaleString()} <span className="text-xs text-slate-500 font-sans font-normal">ft</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View Full Details Button */}
                    <button
                        onClick={onViewDetails}
                        className="w-full mt-3 px-4 py-2.5 bg-gradient-to-r from-cyan-600/20 to-cyan-500/10 hover:from-cyan-600/30 hover:to-cyan-500/20 text-cyan-400 text-sm font-medium rounded-lg transition-all ring-1 ring-cyan-500/30 hover:ring-cyan-500/50 flex items-center justify-center gap-2 group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        View Full Details
                    </button>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-auto p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Items in Location
                        </h3>
                        {mostRecentDate && (
                            <span className="text-[10px] text-slate-500 font-mono">
                                {mostRecentDate}
                            </span>
                        )}
                    </div>

                    {itemsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : itemData.length === 0 ? (
                        <div className="text-center py-8">
                            <svg className="w-10 h-10 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-sm text-slate-500">No item-level data</p>
                            <p className="text-xs text-slate-600 mt-1">Upload item-level CSV to see details</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {itemData.map((item, idx) => (
                                <div
                                    key={item.item_id}
                                    onClick={() => onSkuClick?.(item, idx + 1)}
                                    className="p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors border border-slate-700/30 cursor-pointer hover:border-cyan-500/30"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                                                <span className="font-mono text-sm text-white font-medium truncate">
                                                    {item.external_item_id}
                                                </span>
                                            </div>
                                            {item.item_description && (
                                                <p className="text-xs text-slate-400 mt-1 truncate" title={item.item_description}>
                                                    {item.item_description}
                                                </p>
                                            )}
                                            <div className="text-[10px] text-slate-500 mt-1 font-mono">
                                                Loc: {item.external_location_id}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-sm font-mono font-bold text-white">
                                                {item.total_picks}
                                            </div>
                                            <div className="text-[10px] text-slate-500">picks</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        );
    }

    // Default overview sidebar
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

            {/* Click hint */}
            <div className="mt-auto pt-6 border-t border-slate-800">
                <p className="text-xs text-slate-500 text-center">
                    Click an element on the map to view item details
                </p>
            </div>
        </div>
    );
}
