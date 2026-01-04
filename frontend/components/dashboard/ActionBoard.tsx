'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoveRecommendation, getVelocityColor } from '@/lib/dashboardUtils';
import { ItemVelocityAnalysis, ReslottingSummary } from '@/lib/types';

interface ActionBoardProps {
  moveCloser: MoveRecommendation[];
  moveFurther: MoveRecommendation[];
  layoutId?: string;
  loading?: boolean;
  itemMoveCloser?: ItemVelocityAnalysis[];
  itemMoveFurther?: ItemVelocityAnalysis[];
  itemSummary?: ReslottingSummary;
}

// Premium Move Closer card - large format with savings as hero
function MoveCloserCard({
  item,
  rank,
  layoutId
}: {
  item: ItemVelocityAnalysis;
  rank: number;
  layoutId?: string;
}) {
  const tierColor = getVelocityColor(item.velocityTier);

  return (
    <div className="group relative">
      {/* Card with gradient border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-transparent to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 hover:border-emerald-500/30 transition-all duration-300">
        {/* Top row: Rank + Item ID + Velocity Badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Priority rank */}
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <span className="text-sm font-bold text-emerald-400 font-mono">#{rank}</span>
            </div>

            {/* Item ID - Primary */}
            <div>
              <h4 className="text-base font-semibold text-white font-mono tracking-tight" title={item.itemDescription || item.externalItemId}>
                {item.externalItemId}
              </h4>
              {item.itemDescription && (
                <p className="text-xs text-slate-500 truncate max-w-[180px]">{item.itemDescription}</p>
              )}
            </div>
          </div>

          {/* Velocity badge */}
          <span
            className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{
              background: `${tierColor}15`,
              color: tierColor,
              border: `1px solid ${tierColor}30`
            }}
          >
            {item.velocityTier}
          </span>
        </div>

        {/* Location info */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-slate-400">{item.elementName}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-500 font-mono text-xs">{item.externalLocationId}</span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-5 py-3 px-4 bg-slate-900/50 rounded-xl">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Daily Picks</p>
            <p className="text-lg font-bold text-white font-mono">{item.totalPicks.toLocaleString()}</p>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Avg/Day</p>
            <p className="text-lg font-bold text-cyan-400 font-mono">{item.avgDailyPicks?.toFixed(1) || '—'}</p>
          </div>
        </div>

        {/* Savings hero section */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 mb-1">Potential Daily Savings</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-400 font-mono tracking-tight">
                  {item.dailyWalkSavingsFeet.toLocaleString()}
                </span>
                <span className="text-sm text-emerald-400/70">ft/day</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400/50 mb-1">Time</p>
              <p className="text-xl font-bold text-emerald-300/80 font-mono">
                {item.dailyTimeSavingsMinutes}<span className="text-sm font-normal ml-1">min</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action button - always visible */}
        {layoutId && (
          <Link
            href={`/heatmap?layout=${layoutId}&reslot=${encodeURIComponent(item.externalItemId)}&index=${rank - 1}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-xl text-cyan-400 hover:text-cyan-300 font-medium text-sm transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            View Reslotting Opportunity
          </Link>
        )}
      </div>
    </div>
  );
}

// Compact Move Further item - for collapsed section
function MoveFurtherItem({
  item,
  layoutId
}: {
  item: ItemVelocityAnalysis;
  layoutId?: string;
}) {
  const tierColor = getVelocityColor(item.velocityTier);

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl hover:bg-slate-800/60 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-slate-300">{item.externalItemId}</span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
            style={{ background: `${tierColor}15`, color: tierColor }}
          >
            {item.velocityTier}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{item.elementName}</p>
      </div>

      {layoutId && (
        <Link
          href={`/heatmap?layout=${layoutId}&select=${item.elementId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-cyan-400 transition-colors"
          title="View on Heatmap"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Link>
      )}
    </div>
  );
}

// Legacy element-level card (fallback)
function LegacyMoveCloserCard({
  item,
  rank,
  layoutId
}: {
  item: MoveRecommendation;
  rank: number;
  layoutId?: string;
}) {
  const tierColor = getVelocityColor(item.velocityTier);

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 hover:border-emerald-500/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-sm font-bold text-emerald-400 font-mono">#{rank}</span>
          </div>
          <h4 className="text-base font-semibold text-white">{item.elementName}</h4>
        </div>
        <span
          className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase"
          style={{ background: `${tierColor}15`, color: tierColor }}
        >
          {item.velocityTier}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-4 py-3 px-4 bg-slate-900/50 rounded-xl">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Picks</p>
          <p className="text-lg font-bold text-white font-mono">{item.totalPicks.toLocaleString()}</p>
        </div>
      </div>

      {item.dailyWalkSavingsFeet && item.dailyWalkSavingsFeet > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
          <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 mb-1">Daily Savings</p>
          <span className="text-2xl font-bold text-emerald-400 font-mono">{item.dailyWalkSavingsFeet.toLocaleString()} ft</span>
        </div>
      )}

      {layoutId && (
        <Link
          href={`/heatmap?layout=${layoutId}&select=${item.elementId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 text-sm transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          View on Heatmap
        </Link>
      )}
    </div>
  );
}

export default function ActionBoard({
  moveCloser,
  moveFurther,
  layoutId,
  loading,
  itemMoveCloser,
  itemMoveFurther,
  itemSummary
}: ActionBoardProps) {
  const [showMoveFurther, setShowMoveFurther] = useState(false);

  if (loading) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 p-6 rounded-2xl">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            <div className="h-48 bg-slate-800 rounded-2xl"></div>
            <div className="h-48 bg-slate-800 rounded-2xl"></div>
            <div className="h-48 bg-slate-800 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const hasItemMoveCloser = itemMoveCloser && itemMoveCloser.length > 0;
  const hasItemMoveFurther = itemMoveFurther && itemMoveFurther.length > 0;
  const hasMoveCloser = hasItemMoveCloser || moveCloser.length > 0;
  const moveFurtherCount = hasItemMoveFurther ? itemMoveFurther.length : moveFurther.length;

  // Calculate total potential savings from move closer items
  const totalSavings = hasItemMoveCloser
    ? itemMoveCloser.reduce((sum, item) => sum + (item.dailyWalkSavingsFeet || 0), 0)
    : 0;

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header with gradient accent */}
      <div className="relative px-6 pt-6 pb-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-transparent" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white tracking-tight">Optimization Queue</h3>
              <p className="text-sm text-slate-500">
                Top items to move closer for maximum efficiency gains
              </p>
            </div>
          </div>

          {hasMoveCloser && totalSavings > 0 && (
            <div className="hidden sm:block text-right">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400/60">Total Potential</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono">{totalSavings.toLocaleString()} <span className="text-sm font-normal">ft/day</span></p>
            </div>
          )}
        </div>
      </div>

      {/* Summary stats bar */}
      {hasItemMoveCloser && itemSummary && (
        <div className="px-6 pb-4">
          <div className="grid grid-cols-4 gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
            <div className="text-center">
              <p className="text-lg font-bold text-white font-mono">{itemSummary.totalItemsAnalyzed}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Analyzed</p>
            </div>
            <div className="text-center border-l border-slate-700/50">
              <p className="text-lg font-bold text-amber-400 font-mono">{itemSummary.itemsNeedingReslot}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">To Move</p>
            </div>
            <div className="text-center border-l border-slate-700/50">
              <p className="text-lg font-bold text-emerald-400 font-mono">{itemSummary.potentialDailyWalkSavingsFeet.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">ft/day</p>
            </div>
            <div className="text-center border-l border-slate-700/50">
              <p className="text-lg font-bold text-cyan-400 font-mono">{itemSummary.potentialDailyTimeSavingsMinutes}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">min/day</p>
            </div>
          </div>
        </div>
      )}

      {/* Move Closer Cards - Primary Section */}
      <div className="px-6 pb-6">
        {hasMoveCloser ? (
          <div className="space-y-4">
            {hasItemMoveCloser ? (
              itemMoveCloser.map((item, index) => (
                <MoveCloserCard
                  key={item.itemId}
                  item={item}
                  rank={index + 1}
                  layoutId={layoutId}
                />
              ))
            ) : (
              moveCloser.map((item, index) => (
                <LegacyMoveCloserCard
                  key={item.elementId}
                  item={item}
                  rank={index + 1}
                  layoutId={layoutId}
                />
              ))
            )}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-white mb-1">All Items Optimally Slotted</h4>
            <p className="text-sm text-slate-500">No recommendations at this time</p>
          </div>
        )}
      </div>

      {/* Move Further - Collapsible Secondary Section */}
      {moveFurtherCount > 0 && (
        <div className="border-t border-slate-700/50">
          <button
            onClick={() => setShowMoveFurther(!showMoveFurther)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">Move Further</p>
                <p className="text-xs text-slate-500">Low velocity items in prime locations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-medium text-red-400">
                {moveFurtherCount} items
              </span>
              <svg
                className={`w-5 h-5 text-slate-500 transition-transform ${showMoveFurther ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {showMoveFurther && (
            <div className="px-6 pb-4 space-y-2">
              {hasItemMoveFurther ? (
                itemMoveFurther.map((item) => (
                  <MoveFurtherItem key={item.itemId} item={item} layoutId={layoutId} />
                ))
              ) : (
                moveFurther.map((item) => (
                  <div key={item.elementId} className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl">
                    <span className="font-mono text-sm text-slate-300">{item.elementName}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase text-red-400 bg-red-500/15">
                      {item.velocityTier}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
