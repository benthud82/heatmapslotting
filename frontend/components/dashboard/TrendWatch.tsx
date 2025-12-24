'use client';

import { useMemo } from 'react';
import { VelocityAnalysis, getVelocityColor } from '@/lib/dashboardUtils';

interface TrendWatchProps {
  velocityAnalysis: VelocityAnalysis[];
  loading?: boolean;
  limit?: number;
  onItemClick?: (item: VelocityAnalysis) => void;
}

interface TrendItem {
  elementId: string;
  elementName: string;
  externalItemId: string;
  itemDescription?: string;
  trendPercent: number;
  totalPicks: number;
  velocityTier: 'hot' | 'warm' | 'cold';
}

function TrendItemRow({ item, rank, onClick }: { item: TrendItem; rank: number; onClick?: () => void }) {
  const tierColor = getVelocityColor(item.velocityTier);

  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors group cursor-pointer"
      onClick={onClick}
    >
      {/* Rank */}
      <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
        {rank}
      </div>

      {/* Trend arrow - animated */}
      <div className="shrink-0">
        <svg
          className="w-5 h-5 text-emerald-400 animate-bounce"
          style={{ animationDuration: '2s' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate" title={item.itemDescription || item.externalItemId}>
            {item.externalItemId}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 opacity-60"
            style={{
              background: `${tierColor}20`,
              color: tierColor
            }}
          >
            {item.velocityTier.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            in {item.elementName}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {item.totalPicks.toLocaleString()} picks
          </span>
        </div>
      </div>

      {/* Trend percentage */}
      <div className="text-right shrink-0">
        <span className="text-lg font-bold font-mono text-emerald-400">
          +{item.trendPercent}%
        </span>
      </div>
    </div>
  );
}

export default function TrendWatch({ velocityAnalysis, loading, limit = 5, onItemClick }: TrendWatchProps) {
  // Get rising stars - items with highest positive trend
  const risingStars = useMemo<TrendItem[]>(() => {
    return velocityAnalysis
      .filter(item => item.trend === 'up' && item.trendPercent > 0)
      .sort((a, b) => b.trendPercent - a.trendPercent)
      .slice(0, limit)
      .map(item => ({
        elementId: item.elementId,
        elementName: item.elementName,
        externalItemId: item.externalItemId || item.elementName,
        itemDescription: item.itemDescription,
        trendPercent: item.trendPercent,
        totalPicks: item.totalPicks,
        velocityTier: item.velocityTier,
      }));
  }, [velocityAnalysis, limit]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-36 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Trend Watch</h3>
            <p className="text-sm text-slate-500">Rising Stars</p>
          </div>
        </div>

        {risingStars.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">
              {risingStars.length} trending up
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {risingStars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">No rising trends</p>
          <p className="text-xs text-slate-600 mt-1">Upload more data to see trends</p>
        </div>
      ) : (
        <div className="space-y-1">
          {risingStars.map((item, index) => (
            <TrendItemRow
              key={item.elementId}
              item={item}
              rank={index + 1}
              onClick={() => {
                // Find the full VelocityAnalysis for this element
                const fullItem = velocityAnalysis.find(v => v.elementId === item.elementId);
                if (fullItem && onItemClick) onItemClick(fullItem);
              }}
            />
          ))}
        </div>
      )}

      {/* Footer insight */}
      {risingStars.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800">
          <p className="text-xs text-slate-500">
            These items show significant pick volume increases vs the previous period.
            Consider monitoring for potential slotting optimization.
          </p>
        </div>
      )}
    </div>
  );
}
