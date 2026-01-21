'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ItemVelocityAnalysis, SlottingRecommendation } from '@/lib/types';

interface ItemDetailModalProps {
    item: ItemVelocityAnalysis | null;
    layoutId: string | null;
    onClose: () => void;
}

export default function ItemDetailModal({
    item,
    layoutId,
    onClose,
}: ItemDetailModalProps) {
    // Recommendation config
    const recommendationConfig: Record<SlottingRecommendation, {
        label: string;
        description: string;
        icon: string;
        className: string;
        bgClass: string;
    }> = {
        'move-closer': {
            label: 'Move Closer',
            description: 'This high-velocity item is far from cart parking. Moving it closer will reduce picker walk time significantly.',
            icon: '↑',
            className: 'text-amber-400 bg-amber-500/20 ring-amber-500/30',
            bgClass: 'from-amber-500/10 via-amber-500/5 to-transparent',
        },
        'optimal': {
            label: 'Optimal Position',
            description: 'This item is well-positioned relative to its velocity. No action needed.',
            icon: '✓',
            className: 'text-emerald-400 bg-emerald-500/20 ring-emerald-500/30',
            bgClass: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
        },
        'review': {
            label: 'Needs Review',
            description: 'This item has unusual patterns that may warrant manual review.',
            icon: '?',
            className: 'text-blue-400 bg-blue-500/20 ring-blue-500/30',
            bgClass: 'from-blue-500/10 via-blue-500/5 to-transparent',
        },
        'move-further': {
            label: 'Move Further',
            description: 'This low-velocity item occupies prime space. Consider moving it to free up space for faster-moving items.',
            icon: '↓',
            className: 'text-slate-400 bg-slate-500/20 ring-slate-500/30',
            bgClass: 'from-slate-500/10 via-slate-500/5 to-transparent',
        },
    };

    // Format distance for display
    const formatDistance = (pixels: number) => {
        const feet = pixels / 12; // 1 pixel = 1 inch
        return feet >= 100 ? `${Math.round(feet).toLocaleString()} ft` : `${feet.toFixed(1)} ft`;
    };

    // Percentile label
    const percentileLabel = useMemo(() => {
        if (!item) return '';
        if (item.percentile >= 95) return 'Top 5%';
        if (item.percentile >= 90) return 'Top 10%';
        if (item.percentile >= 80) return 'Top 20%';
        if (item.percentile >= 50) return 'Top 50%';
        return `${Math.round(item.percentile)}th percentile`;
    }, [item]);

    if (!item) return null;

    const recConfig = recommendationConfig[item.recommendation];
    const hasSignificantSavings = item.dailyWalkSavingsFeet > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                style={{
                    boxShadow: '0 0 80px rgba(6, 182, 212, 0.08), 0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                }}
            >
                {/* Header Section */}
                <div className="relative p-6 border-b border-slate-800/80">
                    {/* Subtle gradient accent */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${recConfig.bgClass} pointer-events-none`} />

                    <div className="relative flex items-start justify-between gap-6">
                        <div className="flex-1 min-w-0">
                            {/* Badge Row */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                {/* Velocity Tier */}
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1 ${
                                    item.velocityTier === 'hot'
                                        ? 'bg-red-500/20 text-red-400 ring-red-500/30'
                                        : item.velocityTier === 'warm'
                                            ? 'bg-amber-500/20 text-amber-400 ring-amber-500/30'
                                            : 'bg-blue-500/20 text-blue-400 ring-blue-500/30'
                                }`}>
                                    {item.velocityTier}
                                </span>
                                {/* Percentile */}
                                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-[10px] font-bold text-cyan-400 uppercase tracking-wider ring-1 ring-cyan-500/20">
                                    {percentileLabel}
                                </span>
                                {/* Trend */}
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1 ${
                                    item.trend === 'up'
                                        ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30'
                                        : item.trend === 'down'
                                            ? 'bg-red-500/20 text-red-400 ring-red-500/30'
                                            : 'bg-slate-500/20 text-slate-400 ring-slate-500/30'
                                }`}>
                                    {item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'} {Math.abs(item.trendPercent).toFixed(1)}%
                                </span>
                            </div>

                            {/* Item Title */}
                            <h2 className="text-2xl font-bold text-white tracking-tight truncate mb-1" title={item.externalItemId}>
                                {item.externalItemId}
                            </h2>
                            {item.itemDescription && (
                                <p className="text-sm text-slate-400 truncate mb-3" title={item.itemDescription}>
                                    {item.itemDescription}
                                </p>
                            )}

                            {/* Location Info */}
                            <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <span className="text-slate-300">{item.elementName}</span>
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                    <span className="text-slate-300">{item.externalLocationId}</span>
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    <span className="text-slate-300">{formatDistance(item.currentDistance)} from parking</span>
                                </span>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all hover:ring-1 hover:ring-slate-700 shrink-0"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="p-6 border-b border-slate-800/50 bg-slate-900/50">
                    <div className="grid grid-cols-4 gap-4">
                        {/* Total Picks */}
                        <div className="relative p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50 overflow-hidden group hover:border-slate-600/50 transition-colors">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.02] rounded-full blur-2xl" />
                            <div className="relative">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total Picks</div>
                                <div className="text-3xl font-bold text-white font-mono tracking-tight">
                                    {item.totalPicks.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Avg Per Day */}
                        <div className="relative p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50 overflow-hidden group hover:border-cyan-500/30 transition-colors">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
                            <div className="relative">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Avg / Day</div>
                                <div className="text-3xl font-bold text-cyan-400 font-mono tracking-tight">
                                    {item.avgDailyPicks.toFixed(1)}
                                </div>
                            </div>
                        </div>

                        {/* Days Active */}
                        <div className="relative p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50 overflow-hidden group hover:border-emerald-500/30 transition-colors">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
                            <div className="relative">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Days Active</div>
                                <div className="text-3xl font-bold text-emerald-400 font-mono tracking-tight">
                                    {item.daysActive}
                                </div>
                            </div>
                        </div>

                        {/* Priority Score */}
                        <div className="relative p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50 overflow-hidden group hover:border-amber-500/30 transition-colors">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
                            <div className="relative">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Priority Score</div>
                                <div className="text-3xl font-bold text-amber-400 font-mono tracking-tight">
                                    {item.priorityScore.toFixed(0)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Walk Savings Analysis (Hero Section) */}
                {hasSignificantSavings && (
                    <div className="p-6 border-b border-slate-800/50">
                        <div className="relative rounded-2xl overflow-hidden">
                            {/* Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />

                            {/* Content */}
                            <div className="relative p-6 border border-emerald-500/20 rounded-2xl">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Potential Walk Savings</h3>
                                </div>

                                <div className="grid grid-cols-4 gap-6">
                                    {/* Daily Walk Savings - Hero Stat */}
                                    <div className="col-span-2">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Daily Walk Savings</div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-bold text-emerald-400 font-mono tracking-tight">
                                                {item.dailyWalkSavingsFeet.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </span>
                                            <span className="text-lg text-emerald-400/60 font-mono">ft/day</span>
                                        </div>
                                    </div>

                                    {/* Time Savings */}
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Time Saved</div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-bold text-white font-mono">
                                                {item.dailyTimeSavingsMinutes.toFixed(1)}
                                            </span>
                                            <span className="text-sm text-slate-500 font-mono">min/day</span>
                                        </div>
                                    </div>

                                    {/* Distance Comparison */}
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Distance Delta</div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-500">Current</span>
                                                <span className="font-mono text-slate-300">{formatDistance(item.currentDistance)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-500">Optimal</span>
                                                <span className="font-mono text-emerald-400">{formatDistance(item.optimalDistance)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recommendation Banner */}
                <div className="p-6 flex-1 overflow-auto">
                    <div className={`relative rounded-xl overflow-hidden border ${
                        item.recommendation === 'move-closer' ? 'border-amber-500/30' :
                        item.recommendation === 'optimal' ? 'border-emerald-500/30' :
                        item.recommendation === 'review' ? 'border-blue-500/30' :
                        'border-slate-700/50'
                    }`}>
                        {/* Gradient Background */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${recConfig.bgClass}`} />

                        <div className="relative p-5">
                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ring-1 ${recConfig.className}`}>
                                    {recConfig.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className={`text-lg font-bold ${
                                            item.recommendation === 'move-closer' ? 'text-amber-400' :
                                            item.recommendation === 'optimal' ? 'text-emerald-400' :
                                            item.recommendation === 'review' ? 'text-blue-400' :
                                            'text-slate-400'
                                        }`}>
                                            {recConfig.label}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        {recConfig.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-slate-800/50 bg-slate-900/80">
                    <div className="flex items-center justify-between">
                        {/* Meta Info */}
                        <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                            <span>Item ID: {item.itemId.slice(0, 8)}...</span>
                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                            <span>Element: {item.elementName}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors ring-1 ring-slate-700 hover:ring-slate-600"
                            >
                                Close
                            </button>

                            {item.recommendation === 'move-closer' && layoutId && (
                                <Link
                                    href={`/heatmap?layout=${layoutId}&reslot=${encodeURIComponent(item.externalItemId)}`}
                                    className="group px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                    View Reslot Opportunity
                                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </Link>
                            )}

                            {item.recommendation !== 'move-closer' && layoutId && (
                                <Link
                                    href={`/heatmap?layout=${layoutId}&select=${item.elementId}`}
                                    className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors ring-1 ring-slate-600 hover:ring-slate-500 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                    View on Heatmap
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
