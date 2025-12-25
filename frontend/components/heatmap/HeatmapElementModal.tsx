'use client';

import { useEffect, useState, useMemo } from 'react';
import { AggregatedPickData, AggregatedItemPickData, PickTransaction } from '@/lib/types';
import { picksApi } from '@/lib/api';

interface HeatmapElementModalProps {
    element: AggregatedPickData | null;
    layoutId: string | null;
    startDate: string;
    endDate: string;
    onClose: () => void;
}

type TabType = 'items' | 'history';
type SortField = 'rank' | 'item_id' | 'description' | 'location' | 'picks';
type HistorySortField = 'date' | 'picks';
type SortDirection = 'asc' | 'desc';

export default function HeatmapElementModal({
    element,
    layoutId,
    startDate,
    endDate,
    onClose,
}: HeatmapElementModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('items');

    // Data states
    const [transactions, setTransactions] = useState<PickTransaction[]>([]);
    const [itemData, setItemData] = useState<AggregatedItemPickData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Sort states
    const [itemSortField, setItemSortField] = useState<SortField>('picks');
    const [itemSortDir, setItemSortDir] = useState<SortDirection>('desc');
    const [historySortField, setHistorySortField] = useState<HistorySortField>('date');
    const [historySortDir, setHistorySortDir] = useState<SortDirection>('desc');

    // Fetch data when modal opens
    useEffect(() => {
        if (element && layoutId) {
            fetchAllData();
        }
        return () => {
            setTransactions([]);
            setItemData([]);
            setError(null);
        };
    }, [element, layoutId, startDate, endDate]);

    const fetchAllData = async () => {
        if (!layoutId || !element) return;

        try {
            setLoading(true);
            setError(null);

            // Fetch legacy transactions, items, and element daily picks from item data in parallel
            const [legacyTransactionsData, itemsData, elementDailyPicks] = await Promise.all([
                picksApi.getTransactions(layoutId, startDate || undefined, endDate || undefined),
                picksApi.getItemsAggregated(layoutId, startDate || undefined, endDate || undefined),
                picksApi.getElementDailyPicks(layoutId, element.element_id, startDate || undefined, endDate || undefined),
            ]);

            // Filter legacy transactions to this element
            const filteredLegacyTransactions = legacyTransactionsData.filter(t => t.element_id === element.element_id);

            // Use legacy transactions if available, otherwise use element daily picks from item data
            const finalTransactions = filteredLegacyTransactions.length > 0
                ? filteredLegacyTransactions
                : elementDailyPicks;

            finalTransactions.sort((a, b) => b.pick_date.localeCompare(a.pick_date));
            setTransactions(finalTransactions);

            const filteredItems = itemsData.filter(i => i.element_id === element.element_id);
            filteredItems.sort((a, b) => b.total_picks - a.total_picks);
            setItemData(filteredItems);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate comprehensive stats
    const stats = useMemo(() => {
        const totalPicks = element?.total_picks || 0;

        // Calculate date range span
        let totalDays = 1;
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        } else if (element?.first_date && element?.last_date) {
            const start = new Date(element.first_date);
            const end = new Date(element.last_date);
            totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }

        // Get active days from element or transactions
        const activeDays = transactions.length > 0
            ? transactions.length
            : (element?.days_count || 0);

        // Calculate average - use active days if available, otherwise total days
        const avgPerDay = activeDays > 0 ? totalPicks / activeDays : (totalDays > 0 ? totalPicks / totalDays : 0);

        // Find peak day from transactions if available
        let peakDay = { date: '-', picks: 0 };
        if (transactions.length > 0) {
            const peakTransaction = transactions.reduce((max, t) =>
                t.pick_count > max.pick_count ? t : max, transactions[0]);
            peakDay = { date: peakTransaction.pick_date, picks: peakTransaction.pick_count };
        }

        return {
            totalPicks,
            avgPerDay,
            peakDay,
            activeDays,
            totalDays,
        };
    }, [transactions, element, startDate, endDate]);

    // Calculate max picks for bar scaling
    const maxPicks = useMemo(() => {
        if (transactions.length === 0) return 1;
        return Math.max(...transactions.map(t => t.pick_count));
    }, [transactions]);

    // Calculate velocity tier
    const velocityTier = useMemo(() => {
        if (!stats.avgPerDay) return 'cold';
        if (stats.avgPerDay >= 50) return 'hot';
        if (stats.avgPerDay >= 20) return 'warm';
        return 'cold';
    }, [stats.avgPerDay]);

    // Item stats
    const itemStats = useMemo(() => {
        const totalPicks = itemData.reduce((sum, i) => sum + i.total_picks, 0);
        return { totalItems: itemData.length, totalPicks };
    }, [itemData]);

    // Max item picks for progress bar
    const maxItemPicks = useMemo(() => {
        if (itemData.length === 0) return 1;
        return Math.max(...itemData.map(i => i.total_picks));
    }, [itemData]);

    // Sorted item data
    const sortedItemData = useMemo(() => {
        const sorted = [...itemData];
        sorted.sort((a, b) => {
            let comparison = 0;
            switch (itemSortField) {
                case 'item_id':
                    comparison = a.external_item_id.localeCompare(b.external_item_id);
                    break;
                case 'description':
                    comparison = (a.item_description || '').localeCompare(b.item_description || '');
                    break;
                case 'location':
                    comparison = a.external_location_id.localeCompare(b.external_location_id);
                    break;
                case 'picks':
                    comparison = a.total_picks - b.total_picks;
                    break;
                case 'rank':
                default:
                    // Rank is based on original sort by picks desc
                    comparison = b.total_picks - a.total_picks;
                    break;
            }
            return itemSortDir === 'asc' ? comparison : -comparison;
        });
        return sorted;
    }, [itemData, itemSortField, itemSortDir]);

    // Sorted transaction data
    const sortedTransactions = useMemo(() => {
        const sorted = [...transactions];
        sorted.sort((a, b) => {
            let comparison = 0;
            switch (historySortField) {
                case 'date':
                    comparison = a.pick_date.localeCompare(b.pick_date);
                    break;
                case 'picks':
                    comparison = a.pick_count - b.pick_count;
                    break;
            }
            return historySortDir === 'asc' ? comparison : -comparison;
        });
        return sorted;
    }, [transactions, historySortField, historySortDir]);

    // Sort handlers
    const handleItemSort = (field: SortField) => {
        if (itemSortField === field) {
            setItemSortDir(itemSortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setItemSortField(field);
            setItemSortDir(field === 'picks' ? 'desc' : 'asc');
        }
    };

    const handleHistorySort = (field: HistorySortField) => {
        if (historySortField === field) {
            setHistorySortDir(historySortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setHistorySortField(field);
            setHistorySortDir(field === 'picks' ? 'desc' : 'asc');
        }
    };

    // Sort indicator component
    const SortIndicator = ({ active, direction }: { active: boolean; direction: SortDirection }) => (
        <span className={`ml-1 inline-block transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
            {direction === 'asc' ? '↑' : '↓'}
        </span>
    );

    if (!element) return null;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });
    };

    const formatFullDate = (dateStr: string) => {
        return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/50 rounded-2xl shadow-2xl shadow-cyan-900/20 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
                style={{
                    boxShadow: '0 0 60px rgba(6, 182, 212, 0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                }}
            >
                {/* Header */}
                <div className="relative p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-800/50 to-transparent">
                    {/* Glow effect */}
                    <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none" />

                    <div className="relative flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                {/* Velocity Badge */}
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    velocityTier === 'hot'
                                        ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                                        : velocityTier === 'warm'
                                        ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                                        : 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                                }`}>
                                    {velocityTier}
                                </span>
                                {/* Date Range Badge */}
                                <span className="px-2.5 py-1 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400 ring-1 ring-slate-700">
                                    {startDate && endDate
                                        ? `${formatDate(startDate)} — ${formatDate(endDate)}`
                                        : 'All Time'
                                    }
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                {element.element_name}
                            </h2>
                            <p className="text-sm text-slate-400 mt-1 font-mono">
                                Element Performance Analysis
                            </p>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all hover:ring-1 hover:ring-slate-700"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Key Metrics Row */}
                <div className="p-6 border-b border-slate-800/50 bg-slate-900/50">
                    <div className="grid grid-cols-4 gap-4">
                        {/* Total Picks */}
                        <div className="relative p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50 overflow-hidden group hover:border-cyan-500/30 transition-colors">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
                            <div className="relative">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Picks</div>
                                <div className="text-3xl font-bold text-white font-mono tracking-tight">
                                    {stats.totalPicks.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Avg Per Day */}
                        <div className="relative p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50 overflow-hidden group hover:border-cyan-500/30 transition-colors">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
                            <div className="relative">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Avg / Day</div>
                                <div className="text-3xl font-bold text-cyan-400 font-mono tracking-tight">
                                    {stats.avgPerDay.toFixed(1)}
                                </div>
                            </div>
                        </div>

                        {/* Peak Day */}
                        <div className="relative p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50 overflow-hidden group hover:border-amber-500/30 transition-colors">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
                            <div className="relative">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Peak Day</div>
                                <div className="text-3xl font-bold text-amber-400 font-mono tracking-tight">
                                    {stats.peakDay.picks.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    {stats.peakDay.date !== '-' ? formatDate(stats.peakDay.date) : '-'}
                                </div>
                            </div>
                        </div>

                        {/* Active Days */}
                        <div className="relative p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50 overflow-hidden group hover:border-emerald-500/30 transition-colors">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
                            <div className="relative">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Days</div>
                                <div className="text-3xl font-bold text-emerald-400 font-mono tracking-tight">
                                    {stats.activeDays}
                                    <span className="text-lg text-slate-500">/{stats.totalDays}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Daily Breakdown Mini Chart */}
                {transactions.length > 0 && (
                    <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-900/30">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Daily Distribution</span>
                            <span className="text-[10px] text-slate-600 font-mono">{transactions.length} days</span>
                        </div>
                        <div className="flex items-end gap-0.5 h-12">
                            {[...transactions].reverse().slice(-30).map((t) => {
                                const height = (t.pick_count / maxPicks) * 100;
                                const isPeak = t.pick_count === stats.peakDay.picks;
                                return (
                                    <div
                                        key={t.pick_date}
                                        className="flex-1 min-w-[3px] rounded-t transition-all hover:opacity-80 group relative"
                                        style={{
                                            height: `${Math.max(height, 4)}%`,
                                            background: isPeak
                                                ? 'linear-gradient(to top, rgb(245, 158, 11), rgb(251, 191, 36))'
                                                : 'linear-gradient(to top, rgb(6, 182, 212), rgb(34, 211, 238))',
                                            opacity: 0.3 + (height / 100) * 0.7,
                                        }}
                                        title={`${formatDate(t.pick_date)}: ${t.pick_count} picks`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-4 bg-slate-900/50">
                    <button
                        onClick={() => setActiveTab('items')}
                        className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
                            activeTab === 'items'
                                ? 'bg-slate-800 text-white border-t border-l border-r border-slate-700/50'
                                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                        }`}
                    >
                        Items
                        {itemData.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-700 text-[10px] font-mono">
                                {itemData.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
                            activeTab === 'history'
                                ? 'bg-slate-800 text-white border-t border-l border-r border-slate-700/50'
                                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                        }`}
                    >
                        Daily History
                        {transactions.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-700 text-[10px] font-mono">
                                {transactions.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-auto bg-slate-800/30">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-slate-500 font-mono">Loading data...</span>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/10 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-red-400">{error}</p>
                            </div>
                        </div>
                    ) : activeTab === 'items' ? (
                        /* Items Tab */
                        <div className="p-6">
                            {itemData.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                    </div>
                                    <p className="text-slate-400 font-medium">No item-level data available</p>
                                    <p className="text-slate-600 text-sm mt-1">Upload item-level CSV to see SKU details</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Table Header - Sortable */}
                                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        <button
                                            onClick={() => handleItemSort('rank')}
                                            className="col-span-1 flex items-center group hover:text-slate-300 transition-colors text-left"
                                        >
                                            #
                                            <SortIndicator active={itemSortField === 'rank'} direction={itemSortDir} />
                                        </button>
                                        <button
                                            onClick={() => handleItemSort('item_id')}
                                            className="col-span-3 flex items-center group hover:text-slate-300 transition-colors text-left"
                                        >
                                            Item ID
                                            <SortIndicator active={itemSortField === 'item_id'} direction={itemSortDir} />
                                        </button>
                                        <button
                                            onClick={() => handleItemSort('description')}
                                            className="col-span-3 flex items-center group hover:text-slate-300 transition-colors text-left"
                                        >
                                            Description
                                            <SortIndicator active={itemSortField === 'description'} direction={itemSortDir} />
                                        </button>
                                        <button
                                            onClick={() => handleItemSort('location')}
                                            className="col-span-2 flex items-center group hover:text-slate-300 transition-colors text-left"
                                        >
                                            Location
                                            <SortIndicator active={itemSortField === 'location'} direction={itemSortDir} />
                                        </button>
                                        <button
                                            onClick={() => handleItemSort('picks')}
                                            className="col-span-3 flex items-center justify-end group hover:text-slate-300 transition-colors"
                                        >
                                            Picks
                                            <SortIndicator active={itemSortField === 'picks'} direction={itemSortDir} />
                                        </button>
                                    </div>

                                    {/* Item Rows */}
                                    {sortedItemData.map((item, idx) => {
                                        const percentage = (item.total_picks / itemStats.totalPicks) * 100;
                                        const barWidth = (item.total_picks / maxItemPicks) * 100;

                                        return (
                                            <div
                                                key={item.item_id}
                                                className="relative grid grid-cols-12 gap-4 px-4 py-3 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 transition-colors group overflow-hidden"
                                            >
                                                {/* Background bar */}
                                                <div
                                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500/10 to-transparent pointer-events-none transition-all group-hover:from-cyan-500/15"
                                                    style={{ width: `${barWidth}%` }}
                                                />

                                                <span className="relative col-span-1 text-sm font-mono text-slate-500">
                                                    {idx + 1}
                                                </span>
                                                <span className="relative col-span-3 text-sm font-mono text-white truncate" title={item.external_item_id}>
                                                    {item.external_item_id}
                                                </span>
                                                <span className="relative col-span-3 text-sm text-slate-400 truncate" title={item.item_description || '-'}>
                                                    {item.item_description || '-'}
                                                </span>
                                                <span className="relative col-span-2 text-sm text-slate-500 font-mono truncate" title={item.external_location_id}>
                                                    {item.external_location_id}
                                                </span>
                                                <div className="relative col-span-3 flex items-center justify-end gap-3">
                                                    <span className="text-[10px] text-slate-500 font-mono">
                                                        {percentage.toFixed(1)}%
                                                    </span>
                                                    <span className="text-sm font-mono font-bold text-white min-w-[60px] text-right">
                                                        {item.total_picks.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* History Tab */
                        <div className="p-6">
                            {transactions.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-slate-400 font-medium">No transaction history</p>
                                    <p className="text-slate-600 text-sm mt-1">No picks recorded in this date range</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {/* Table Header - Sortable */}
                                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        <button
                                            onClick={() => handleHistorySort('date')}
                                            className="col-span-4 flex items-center group hover:text-slate-300 transition-colors text-left"
                                        >
                                            Date
                                            <SortIndicator active={historySortField === 'date'} direction={historySortDir} />
                                        </button>
                                        <span className="col-span-5">Distribution</span>
                                        <button
                                            onClick={() => handleHistorySort('picks')}
                                            className="col-span-3 flex items-center justify-end group hover:text-slate-300 transition-colors"
                                        >
                                            Picks
                                            <SortIndicator active={historySortField === 'picks'} direction={historySortDir} />
                                        </button>
                                    </div>

                                    {/* Transaction Rows */}
                                    {sortedTransactions.map((t) => {
                                        const barWidth = (t.pick_count / maxPicks) * 100;
                                        const isPeak = t.pick_count === stats.peakDay.picks;

                                        return (
                                            <div
                                                key={t.pick_date}
                                                className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg transition-colors ${
                                                    isPeak
                                                        ? 'bg-amber-500/10 hover:bg-amber-500/15 ring-1 ring-amber-500/20'
                                                        : 'bg-slate-800/30 hover:bg-slate-800/50'
                                                }`}
                                            >
                                                <div className="col-span-4 flex items-center gap-2">
                                                    {isPeak && (
                                                        <span className="text-amber-400">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                    <span className={`text-sm font-mono ${isPeak ? 'text-amber-300' : 'text-white'}`}>
                                                        {formatFullDate(t.pick_date)}
                                                    </span>
                                                </div>
                                                <div className="col-span-5 flex items-center">
                                                    <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${
                                                                isPeak
                                                                    ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                                                    : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                                                            }`}
                                                            style={{ width: `${barWidth}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className={`col-span-3 text-sm font-mono font-bold text-right ${isPeak ? 'text-amber-300' : 'text-white'}`}>
                                                    {t.pick_count.toLocaleString()}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800/50 bg-slate-900/80 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                        <span>{itemStats.totalItems} items</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                        <span>{transactions.length} days</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                        <span>{stats.totalPicks.toLocaleString()} total picks</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors ring-1 ring-slate-700 hover:ring-slate-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
