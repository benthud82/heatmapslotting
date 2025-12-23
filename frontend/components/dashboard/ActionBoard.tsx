'use client';

import Link from 'next/link';
import { MoveRecommendation, getVelocityColor } from '@/lib/dashboardUtils';

interface ActionBoardProps {
  moveCloser: MoveRecommendation[];
  moveFurther: MoveRecommendation[];
  layoutId?: string;
  loading?: boolean;
}

function ActionItem({
  item,
  rank,
  layoutId
}: {
  item: MoveRecommendation;
  rank: number;
  layoutId?: string;
}) {
  const tierColor = getVelocityColor(item.velocityTier);
  const isCloser = item.action === 'move-closer';

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800/80 transition-all group">
      {/* Rank badge */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
        style={{
          background: isCloser ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          color: isCloser ? '#22c55e' : '#ef4444'
        }}
      >
        {rank}
      </div>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate text-sm">
            {item.elementName}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
            style={{
              background: `${tierColor}20`,
              color: tierColor
            }}
          >
            {item.velocityTier.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500 font-mono">
            {item.totalPicks.toLocaleString()} picks
          </span>
          {item.trendPercent !== 0 && (
            <span className={`text-xs font-mono ${item.trendPercent > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {item.trendPercent > 0 ? '+' : ''}{item.trendPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Action link */}
      {layoutId && (
        <Link
          href={`/heatmap?layout=${layoutId}&select=${item.elementId}`}
          target="_blank"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400 hover:text-cyan-300 shrink-0"
          title="View on Heatmap"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}

function ActionSection({
  title,
  subtitle,
  items,
  layoutId,
  accentColor,
  icon
}: {
  title: string;
  subtitle: string;
  items: MoveRecommendation[];
  layoutId?: string;
  accentColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${accentColor}20` }}
        >
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <ActionItem
              key={item.elementId}
              item={item}
              rank={index + 1}
              layoutId={layoutId}
            />
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-800/30 border border-dashed border-slate-700 text-center">
          <p className="text-sm text-slate-500">No recommendations</p>
          <p className="text-xs text-slate-600 mt-1">All items are optimally slotted</p>
        </div>
      )}
    </div>
  );
}

export default function ActionBoard({
  moveCloser,
  moveFurther,
  layoutId,
  loading
}: ActionBoardProps) {
  if (loading) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/20 p-6 rounded-2xl shadow-xl">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-40 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="h-4 bg-slate-700 rounded w-32"></div>
              <div className="h-16 bg-slate-800 rounded-xl"></div>
              <div className="h-16 bg-slate-800 rounded-xl"></div>
              <div className="h-16 bg-slate-800 rounded-xl"></div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-slate-700 rounded w-32"></div>
              <div className="h-16 bg-slate-800 rounded-xl"></div>
              <div className="h-16 bg-slate-800 rounded-xl"></div>
              <div className="h-16 bg-slate-800 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalActions = moveCloser.length + moveFurther.length;

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/20 p-6 rounded-2xl shadow-xl relative overflow-hidden">
      {/* Accent gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500/80 via-cyan-400/40 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Action Board</h3>
            <p className="text-sm text-slate-500">
              {totalActions > 0
                ? `${totalActions} recommended move${totalActions > 1 ? 's' : ''}`
                : 'All locations optimally slotted'}
            </p>
          </div>
        </div>

        {/* Status badge */}
        {totalActions > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs text-amber-400 font-medium">Actions Pending</span>
          </div>
        )}
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActionSection
          title="Move Closer"
          subtitle="High velocity, not optimal"
          items={moveCloser}
          layoutId={layoutId}
          accentColor="#22c55e"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          }
        />

        <ActionSection
          title="Move Further"
          subtitle="Low velocity, taking prime space"
          items={moveFurther}
          layoutId={layoutId}
          accentColor="#ef4444"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
