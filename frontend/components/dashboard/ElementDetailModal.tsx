'use client';

import { useEffect, useState, useMemo } from 'react';
import { VelocityAnalysis } from '@/lib/dashboardUtils';
import { PickTransaction } from '@/lib/types';
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
    const [transactions, setTransactions] = useState<PickTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch pick transactions when modal opens
    useEffect(() => {
        if (element && layoutId) {
            fetchTransactions();
        }
        return () => {
            setTransactions([]);
            setError(null);
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
            // Sort by date descending (most recent first)
            filtered.sort((a, b) => b.pick_date.localeCompare(a.pick_date));
            setTransactions(filtered);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

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
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">{element.elementName}</h2>
                            <p className="text-sm text-slate-400 mt-1">Pick History Detail</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Stats Row */}
                    {stats && (
                        <div className="mt-4 grid grid-cols-4 gap-3">
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
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
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
                            <div className="grid grid-cols-2 gap-4 px-4 py-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
                                <span>Date</span>
                                <span className="text-right">Picks</span>
                            </div>

                            {/* Transaction rows */}
                            {transactions.map((t, idx) => (
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

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-800/30">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                            {transactions.length} day{transactions.length !== 1 ? 's' : ''} of data
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
