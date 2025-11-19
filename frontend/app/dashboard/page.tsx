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
            </main>
        </div>
    );
}
