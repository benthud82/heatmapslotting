'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { VelocityAnalysis } from '@/lib/dashboardUtils';
import { PickTransaction, AggregatedItemPickData } from '@/lib/types';
import { picksApi } from '@/lib/api';

interface ElementDetailModalProps {
    element: VelocityAnalysis | null;
    layoutId: string | null;
    onClose: () => void;
}

export default function ElementDetailModal({
    element,
    layoutId,
    onClose,
}: ElementDetailModalProps) {
    // Tab state
    const [activeTab, setActiveTab] = useState<'items' | 'history'>('items');

    // History data state
    const [transactions, setTransactions] = useState<PickTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Item data state
    const [itemData, setItemData] = useState<AggregatedItemPickData[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [mostRecentDate, setMostRecentDate] = useState<string | null>(null);

    // Sort state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Reset sort when tab changes
    useEffect(() => {
        setSortConfig(null);
    }, [activeTab]);

    // Fetch pick transactions when modal opens
    useEffect(() => {
        if (element && layoutId) {
            fetchTransactions();
            fetchItemData();
        }
        return () => {
            setTransactions([]);
            setItemData([]);
            setError(null);
            setActiveTab('items');
            setSortConfig(null);
        };
    }, [element, layoutId]);

    const fetchTransactions = async () => {
        if (!layoutId || !element) return;

        try {
            setLoading(true);
            setError(null);
            const allTransactions = await picksApi.getTransactions(layoutId);
            // Filter to only this element's transactions
            const filtered = allTransactions.filter(t => t.element_id === element.elementId);
            // Sort by date descending (most recent first) default
            filtered.sort((a, b) => b.pick_date.localeCompare(a.pick_date));
            setTransactions(filtered);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const fetchItemData = async () => {
        if (!layoutId || !element) return;

        try {
            setItemsLoading(true);
            // First get available dates to find most recent
            const dates = await picksApi.getItemsDates(layoutId);
            if (dates.length > 0) {
                // Dates are sorted ascending, so last is most recent
                const recentDate = dates[dates.length - 1];
                setMostRecentDate(recentDate);

                // Fetch item data for that date
                const allItems = await picksApi.getItemsAggregated(layoutId, recentDate, recentDate);
                const elementItems = allItems.filter(item => item.element_id === element.elementId);
                // Default sort by picks descending
                elementItems.sort((a, b) => b.total_picks - a.total_picks);
                setItemData(elementItems);
            } else {
                setItemData([]);
                setMostRecentDate(null);
            }
        } catch (err) {
            console.error('Failed to load item data:', err);
            setItemData([]);
        } finally {
            setItemsLoading(false);
        }
    };

    // Handle sort click
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Sort items
    const sortedItemData = useMemo(() => {
        if (!sortConfig) return itemData;
        const sorted = [...itemData];
        sorted.sort((a, b) => {
            const { key, direction } = sortConfig;
            let valA, valB;

            switch (key) {
                case 'itemId':
                    valA = a.external_item_id;
                    valB = b.external_item_id;
                    break;
                case 'description':
                    valA = a.item_description || '';
                    valB = b.item_description || '';
                    break;
                case 'location':
                    valA = a.external_location_id;
                    valB = b.external_location_id;
                    break;
                case 'picks':
                    valA = a.total_picks;
                    valB = b.total_picks;
                    break;
                default:
                    return 0;
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [itemData, sortConfig]);

    // Sort transactions
    const sortedTransactions = useMemo(() => {
        if (!sortConfig) return transactions;
        const sorted = [...transactions];
        sorted.sort((a, b) => {
            const { key, direction } = sortConfig;
            let valA, valB;

            switch (key) {
                case 'date':
                    valA = a.pick_date;
                    valB = b.pick_date;
                    break;
                case 'picks':
                    valA = a.pick_count;
                    valB = b.pick_count;
                    break;
                default:
                    return 0;
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [transactions, sortConfig]);


    // Calculate stats from transactions
    const stats = useMemo(() => {
        if (transactions.length === 0) return null;

        const pickCounts = transactions.map(t => t.pick_count);
        const total = pickCounts.reduce((a, b) => a + b, 0);
        const avg = total / transactions.length;
        const max = Math.max(...pickCounts);
        const min = Math.min(...pickCounts);

        return { total, avg, max, min, days: transactions.length };
    }, [transactions]);

    // Calculate item stats
    const itemStats = useMemo(() => {
        if (itemData.length === 0) return null;

        const totalPicks = itemData.reduce((sum, item) => sum + item.total_picks, 0);
        return { totalItems: itemData.length, totalPicks };
    }, [itemData]);

    if (!element) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 pb-0 border-b border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-white">{element.elementName}</h2>
                            <p className="text-sm text-slate-400 mt-1">Element Details</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* View on Heatmap button */}
                            <Link
                                href={`/heatmap?layout=${layoutId}&select=${element.elementId}`}
                                target="_blank"
                                className="px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 text-sm font-mono rounded-lg transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                View on Heatmap
                            </Link>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('items')}
                            className={`px-4 py-2.5 text-sm font-mono rounded-t-lg transition-colors ${activeTab === 'items'
                                ? 'bg-slate-800 text-white border-t border-l border-r border-slate-700'
                                : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            Items {itemData.length > 0 && `(${itemData.length})`}
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2.5 text-sm font-mono rounded-t-lg transition-colors ${activeTab === 'history'
                                ? 'bg-slate-800 text-white border-t border-l border-r border-slate-700'
                                : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            Pick History
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-slate-800/30">
                    {activeTab === 'items' ? (
                        /* Items Tab */
                        <div className="p-6">
                            {/* Items Stats Row */}
                            {itemStats && (
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-2xl font-bold text-white font-mono">{itemStats.totalPicks.toLocaleString()}</div>
                                        <div className="text-xs text-slate-400">Total Picks</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-2xl font-bold text-cyan-400 font-mono">{itemStats.totalItems}</div>
                                        <div className="text-xs text-slate-400">Unique Items</div>
                                    </div>
                                </div>
                            )}

                            {/* Date indicator */}
                            {mostRecentDate && (
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs text-slate-400 uppercase tracking-wider">Items for date:</span>
                                    <span className="text-sm font-mono text-white">{mostRecentDate}</span>
                                </div>
                            )}

                            {itemsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : itemData.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    <p>No item-level data available</p>
                                    <p className="text-xs mt-2">Upload item-level CSV to see details</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {/* Table Header */}
                                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-mono text-slate-400 uppercase tracking-wider sticky top-0 bg-slate-900/90 z-10 backdrop-blur-sm border-b border-slate-700">
                                        <span className="col-span-1">#</span>
                                        <div
                                            className="col-span-3 cursor-pointer hover:text-white flex items-center gap-1"
                                            onClick={() => handleSort('itemId')}
                                        >
                                            Item ID
                                            {sortConfig?.key === 'itemId' && (
                                                <span className="text-cyan-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                        <div
                                            className="col-span-4 cursor-pointer hover:text-white flex items-center gap-1"
                                            onClick={() => handleSort('description')}
                                        >
                                            Description
                                            {sortConfig?.key === 'description' && (
                                                <span className="text-cyan-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                        <div
                                            className="col-span-2 cursor-pointer hover:text-white flex items-center gap-1"
                                            onClick={() => handleSort('location')}
                                        >
                                            Location
                                            {sortConfig?.key === 'location' && (
                                                <span className="text-cyan-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                        <div
                                            className="col-span-2 text-right cursor-pointer hover:text-white flex items-center justify-end gap-1"
                                            onClick={() => handleSort('picks')}
                                        >
                                            Picks
                                            {sortConfig?.key === 'picks' && (
                                                <span className="text-cyan-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Item rows */}
                                    {sortedItemData.map((item, idx) => (
                                        <div
                                            key={item.item_id}
                                            className="grid grid-cols-12 gap-4 px-4 py-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                                        >
                                            <span className="col-span-1 text-sm font-mono text-slate-500">
                                                {idx + 1}
                                            </span>
                                            <span className="col-span-3 text-sm font-mono text-white truncate" title={item.external_item_id}>
                                                {item.external_item_id}
                                            </span>
                                            <span className="col-span-4 text-sm text-slate-300 truncate" title={item.item_description || '-'}>
                                                {item.item_description || '-'}
                                            </span>
                                            <span className="col-span-2 text-sm text-slate-400 font-mono truncate" title={item.external_location_id}>
                                                {item.external_location_id}
                                            </span>
                                            <span className="col-span-2 text-sm font-mono font-bold text-right text-white">
                                                {item.total_picks.toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* History Tab */
                        <div className="p-6">
                            {/* Stats Row */}
                            {stats && (
                                <div className="grid grid-cols-4 gap-3 mb-6">
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-2xl font-bold text-white font-mono">{stats.total.toLocaleString()}</div>
                                        <div className="text-xs text-slate-400">Total Picks</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-2xl font-bold text-cyan-400 font-mono">{stats.avg.toFixed(1)}</div>
                                        <div className="text-xs text-slate-400">Avg/Day</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-2xl font-bold text-emerald-400 font-mono">{stats.max}</div>
                                        <div className="text-xs text-slate-400">Max Day</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-2xl font-bold text-amber-400 font-mono">{stats.min}</div>
                                        <div className="text-xs text-slate-400">Min Day</div>
                                    </div>
                                </div>
                            )}

                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : error ? (
                                <div className="text-center py-12 text-red-400">
                                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p>{error}</p>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    <p>No pick transactions found</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {/* Table Header */}
                                    <div className="grid grid-cols-2 gap-4 px-4 py-2 text-xs font-mono text-slate-400 uppercase tracking-wider sticky top-0 bg-slate-900/90 z-10 backdrop-blur-sm border-b border-slate-700">
                                        <div
                                            className="cursor-pointer hover:text-white flex items-center gap-1"
                                            onClick={() => handleSort('date')}
                                        >
                                            Date
                                            {sortConfig?.key === 'date' && (
                                                <span className="text-cyan-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                        <div
                                            className="text-right cursor-pointer hover:text-white flex items-center justify-end gap-1"
                                            onClick={() => handleSort('picks')}
                                        >
                                            Picks
                                            {sortConfig?.key === 'picks' && (
                                                <span className="text-cyan-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Transaction rows */}
                                    {sortedTransactions.map((t, idx) => (
                                        <div
                                            key={`${t.pick_date}-${idx}`}
                                            className="grid grid-cols-2 gap-4 px-4 py-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                                        >
                                            <span className="text-sm font-mono text-white">
                                                {new Date(t.pick_date + 'T12:00:00').toLocaleDateString(undefined, {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                            <span className="text-sm font-mono font-bold text-right text-white">
                                                {t.pick_count.toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-800/30">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                            {activeTab === 'items'
                                ? `${itemData.length} item${itemData.length !== 1 ? 's' : ''}`
                                : `${transactions.length} day${transactions.length !== 1 ? 's' : ''} of data`
                            }
                        </span>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-mono rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
