'use client';

import { useEffect, useState, useMemo } from 'react';
import Header from '@/components/Header';
import { layoutApi, picksApi } from '@/lib/api';
import { Layout, AggregatedPickData, PickTransaction } from '@/lib/types';
import { getHeatmapColor } from '@/lib/heatmapColors';
import CalendarView from '@/components/CalendarView';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    Legend
} from 'recharts';

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [layout, setLayout] = useState<Layout | null>(null);
    const [aggregatedData, setAggregatedData] = useState<AggregatedPickData[]>([]);
    const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [transactions, setTransactions] = useState<PickTransaction[]>([]);
    const [deletingDate, setDeletingDate] = useState<string | null>(null);
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isBatchDelete, setIsBatchDelete] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [layoutData, dates, rawTransactions] = await Promise.all([
                layoutApi.getLayout(),
                picksApi.getDates(),
                picksApi.getTransactions()
            ]);
            setLayout(layoutData);
            setAvailableDates(dates);
            setTransactions(rawTransactions);

            if (dates.length > 0) {
                const sortedDates = [...dates].sort();
                setDateRange({
                    start: sortedDates[0],
                    end: sortedDates[sortedDates.length - 1]
                });

                // Fetch all aggregated data for charts
                const data = await picksApi.getAggregated();
                setAggregatedData(data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDate = async () => {
        if (!deletingDate && !isBatchDelete) return;

        try {
            const token = localStorage.getItem('token');
            let url = `http://localhost:3001/api/picks/by-date/${deletingDate}`;
            let method = 'DELETE';
            let body = undefined;
            let headers: Record<string, string> = {
                Authorization: `Bearer ${token}`,
            };

            if (isBatchDelete) {
                url = 'http://localhost:3001/api/picks/batch';
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify({ dates: Array.from(selectedDates) });
            }

            const response = await fetch(url, {
                method,
                headers,
                body,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete picks');
            }

            // Refresh data after successful deletion
            await loadData();
            setShowDeleteModal(false);
            setDeletingDate(null);
            setIsBatchDelete(false);
            setSelectedDates(new Set());
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete picks');
        }
    };

    const toggleDateSelection = (date: string) => {
        const newSelected = new Set(selectedDates);
        if (newSelected.has(date)) {
            newSelected.delete(date);
        } else {
            newSelected.add(date);
        }
        setSelectedDates(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedDates.size === datePickCounts.length) {
            setSelectedDates(new Set());
        } else {
            setSelectedDates(new Set(datePickCounts.map(d => d.date)));
        }
    };

    // Calculate summary statistics
    const stats = useMemo(() => {
        const totalPicks = aggregatedData.reduce((sum, item) => sum + item.total_picks, 0);
        const activeElements = aggregatedData.length;
        const topElement = aggregatedData.length > 0 ? aggregatedData[0] : null;

        return {
            totalPicks,
            activeElements,
            topElement,
            daysTracked: availableDates.length
        };
    }, [aggregatedData, availableDates]);

    // Calculate min/max picks for heatmap coloring
    const { minPicks, maxPicks } = useMemo(() => {
        if (aggregatedData.length === 0) return { minPicks: 0, maxPicks: 0 };
        const picks = aggregatedData.map(d => d.total_picks);
        return {
            minPicks: Math.min(...picks),
            maxPicks: Math.max(...picks)
        };
    }, [aggregatedData]);

    // Prepare chart data
    const topElementsData = useMemo(() => {
        return aggregatedData
            .slice(0, 10)
            .map(item => ({
                name: item.element_name,
                picks: item.total_picks,
                color: getHeatmapColor(item.total_picks, minPicks, maxPicks)
            }));
    }, [aggregatedData, minPicks, maxPicks]);

    // Daily Trend Data
    const dailyTrendData = useMemo(() => {
        const dailyMap = new Map<string, number>();
        transactions.forEach(t => {
            const date = t.pick_date;
            dailyMap.set(date, (dailyMap.get(date) || 0) + t.pick_count);
        });

        return Array.from(dailyMap.entries())
            .map(([date, picks]) => ({ date, picks }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [transactions]);

    // Calculate picks per date for Data Management section
    const datePickCounts = useMemo(() => {
        const dateMap = new Map<string, number>();
        transactions.forEach(t => {
            dateMap.set(t.pick_date, (dateMap.get(t.pick_date) || 0) + t.pick_count);
        });

        return Array.from(availableDates).map(date => ({
            date,
            picks: dateMap.get(date) || 0
        })).sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
    }, [availableDates, transactions]);

    // Day of Week Data
    const dayOfWeekData = useMemo(() => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayMap = new Map<string, number>();

        // Initialize with 0
        days.forEach(d => dayMap.set(d, 0));

        transactions.forEach(t => {
            // Parse date string (YYYY-MM-DD) to get day of week
            // Note: Adding 'T00:00:00' to ensure local time parsing doesn't shift day due to timezone
            const date = new Date(t.pick_date + 'T12:00:00');
            const dayName = days[date.getDay()];
            dayMap.set(dayName, (dayMap.get(dayName) || 0) + t.pick_count);
        });

        // Return in Mon-Sun order for business logic usually
        const businessOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return businessOrder.map(day => ({
            name: day,
            picks: dayMap.get(day) || 0
        }));
    }, [transactions]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400 font-mono">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            <Header
                title="Dashboard"
                subtitle={`${layout?.name || 'Overview'} • Analytics & Insights`}
            />

            {/* Full Width Container */}
            <main className="flex-1 p-6 w-full space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                        <h3 className="text-slate-400 text-sm font-mono uppercase mb-2">Total Picks</h3>
                        <p className="text-3xl font-bold text-white">{stats.totalPicks.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                        <h3 className="text-slate-400 text-sm font-mono uppercase mb-2">Active Elements</h3>
                        <p className="text-3xl font-bold text-blue-400">{stats.activeElements}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                        <h3 className="text-slate-400 text-sm font-mono uppercase mb-2">Days Tracked</h3>
                        <p className="text-3xl font-bold text-green-400">{stats.daysTracked}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                        <h3 className="text-slate-400 text-sm font-mono uppercase mb-2">Top Performer</h3>
                        <p className="text-xl font-bold text-purple-400 truncate" title={stats.topElement?.element_name}>
                            {stats.topElement?.element_name || '-'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {stats.topElement?.total_picks.toLocaleString()} picks
                        </p>
                    </div>
                </div>

                {/* Charts Row 1: Trends & Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Daily Trend Chart */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            Daily Pick Trend
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dailyTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis stroke="#94a3b8" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                        labelStyle={{ color: '#94a3b8' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="picks"
                                        stroke="#06b6d4"
                                        strokeWidth={3}
                                        dot={{ fill: '#06b6d4', r: 4 }}
                                        activeDot={{ r: 6, fill: '#fff' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Day of Week Chart */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Weekly Distribution
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dayOfWeekData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickFormatter={(val) => val.substring(0, 3)}
                                    />
                                    <YAxis stroke="#94a3b8" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                        cursor={{ fill: '#1e293b' }}
                                    />
                                    <Bar dataKey="picks" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Charts Row 2: Top Elements & Calendar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top Elements Chart */}
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Top 10 Elements by Volume
                        </h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topElementsData} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                        cursor={{ fill: '#1e293b' }}
                                    />
                                    <Bar dataKey="picks" radius={[0, 4, 4, 0]}>
                                        {topElementsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Data Availability Calendar */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg flex flex-col">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Data Availability
                        </h3>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {dateRange ? (
                                <CalendarView
                                    availableDates={availableDates}
                                    startDate={dateRange.start}
                                    endDate={dateRange.end}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <p>No data available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Data Management Section */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg relative">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Data Management
                        </h3>

                        {datePickCounts.length > 0 && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selectedDates.size === datePickCounts.length && datePickCounts.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                                />
                                <span className="text-sm text-slate-400">Select All</span>
                            </div>
                        )}
                    </div>

                    {datePickCounts.length > 0 ? (
                        <div className="space-y-2">
                            {datePickCounts.map(({ date, picks }) => (
                                <div
                                    key={date}
                                    className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${selectedDates.has(date) ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-slate-800 hover:bg-slate-750 border border-transparent'
                                        }`}
                                    onClick={() => toggleDateSelection(date)}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedDates.has(date)}
                                            onChange={() => { }} // Handled by parent div click
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                                        />
                                        <div>
                                            <p className="text-white font-mono">{new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                            <p className="text-sm text-slate-400">{picks.toLocaleString()} picks</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletingDate(date);
                                            setIsBatchDelete(false);
                                            setShowDeleteModal(true);
                                        }}
                                        className="px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded text-sm font-medium transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-center py-4">No pick data available</p>
                    )}

                    {/* Bulk Action Floating Bar */}
                    {selectedDates.size > 0 && (
                        <div className="fixed bottom-8 right-8 z-40 animate-in slide-in-from-bottom-4 fade-in duration-200">
                            <div className="bg-slate-800 border border-slate-700 shadow-2xl rounded-lg p-4 flex items-center gap-4">
                                <span className="text-white font-medium">{selectedDates.size} selected</span>
                                <div className="h-6 w-px bg-slate-600"></div>
                                <button
                                    onClick={() => setSelectedDates(new Set())}
                                    className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setIsBatchDelete(true);
                                        setShowDeleteModal(true);
                                    }}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-md shadow-lg hover:shadow-red-900/20 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Selected
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-4">Confirm Delete</h3>
                            <p className="text-slate-300 mb-6">
                                {isBatchDelete ? (
                                    <>
                                        Are you sure you want to delete pick data for <span className="font-bold text-white">{selectedDates.size} selected dates</span>?
                                    </>
                                ) : (
                                    <>
                                        Are you sure you want to delete all pick data for{' '}
                                        <span className="font-bold text-white">
                                            {deletingDate && new Date(deletingDate + 'T12:00:00').toLocaleDateString()}
                                        </span>?
                                    </>
                                )}
                                <br />
                                <span className="text-red-400 text-sm mt-2 block">This action cannot be undone.</span>
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDeletingDate(null);
                                        setIsBatchDelete(false);
                                    }}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteDate}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
                                >
                                    {isBatchDelete ? 'Delete All Selected' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
