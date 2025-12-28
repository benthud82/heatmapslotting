'use client';

import React, { useState } from 'react';
import { ItemReslottingOpportunity } from '@/lib/types';

interface SlottingAlertBannerProps {
  opportunities: ItemReslottingOpportunity[];
  totalDailySavingsFeet: number;
  sameElementTypeOnly: boolean;
  onToggleSameType: () => void;
  onItemClick?: (itemId: string, elementId: string) => void;
}

export default function SlottingAlertBanner({
  opportunities,
  totalDailySavingsFeet,
  sameElementTypeOnly,
  onToggleSameType,
  onItemClick,
}: SlottingAlertBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show if no opportunities
  if (opportunities.length === 0) {
    return null;
  }

  const dailyTimeSavingsMinutes = totalDailySavingsFeet / 264; // 3mph = 264 ft/min

  // Get element type badge styling
  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'bay':
        return 'bg-blue-500/20 text-blue-400';
      case 'flow_rack':
        return 'bg-green-500/20 text-green-400';
      case 'full_pallet':
        return 'bg-amber-500/20 text-amber-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="bg-amber-950/80 border-b border-amber-700/50 flex-shrink-0">
      <div className="w-full px-6 py-3">
        {/* Summary Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-mono text-amber-200">
                <span className="font-bold">{opportunities.length}</span> items could be reslotted
              </div>
              <div className="text-xs font-mono text-amber-400/70">
                Potential savings: <span className="text-amber-300">{Math.round(totalDailySavingsFeet).toLocaleString()} ft/day</span>
                {dailyTimeSavingsMinutes >= 1 && (
                  <span className="ml-2">({Math.round(dailyTimeSavingsMinutes)} min)</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Element Type Toggle */}
            <div className="flex items-center gap-2 bg-slate-900/50 rounded px-3 py-1.5">
              <span className="text-[10px] text-slate-400 uppercase">Match Type:</span>
              <button
                onClick={onToggleSameType}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  sameElementTypeOnly
                    ? 'bg-amber-600/30 text-amber-300'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {sameElementTypeOnly ? 'Same Type Only' : 'Any Type'}
              </button>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1.5 bg-amber-800/50 hover:bg-amber-800/70 text-amber-200 font-mono text-xs rounded transition-colors flex items-center gap-2"
            >
              {isExpanded ? 'Hide' : 'View'} Recommendations
              <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 space-y-3">
            {opportunities.slice(0, 5).map((opp, index) => (
              <div
                key={opp.item.itemId}
                className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 cursor-pointer hover:border-amber-500/30 transition-colors"
                onClick={() => onItemClick?.(opp.item.itemId, opp.item.elementId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-500">#{index + 1}</span>
                      <span className="font-mono text-sm text-white font-medium">
                        {opp.item.externalItemId}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${getTypeBadgeStyle(opp.currentElement.type)}`}>
                        {opp.currentElement.type.replace('_', ' ')}
                      </span>
                    </div>
                    {opp.item.itemDescription && (
                      <div className="text-[10px] text-slate-400 font-mono mb-1 truncate max-w-[300px]">
                        {opp.item.itemDescription}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 font-mono">
                      Current: {opp.currentElement.name} ({Math.round(opp.currentElement.distance / 12)} ft from parking)
                    </div>
                    {opp.targetElements.length > 0 && (
                      <div className="text-[10px] text-emerald-400 font-mono mt-1">
                        Suggest: {opp.targetElements[0].name}
                        {!sameElementTypeOnly && opp.targetElements[0].type !== opp.currentElement.type && (
                          <span className={`ml-1 px-1 py-0.5 rounded text-[8px] uppercase ${getTypeBadgeStyle(opp.targetElements[0].type)}`}>
                            {opp.targetElements[0].type.replace('_', ' ')}
                          </span>
                        )}
                        <span className="text-slate-500 ml-1">
                          ({Math.round(opp.targetElements[0].distance / 12)} ft)
                        </span>
                        <span className="ml-2 text-emerald-300">
                          Save {opp.totalDailyWalkSavings.toLocaleString()} ft/day
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm font-mono font-bold text-white">{opp.item.totalPicks.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500">picks</div>
                    <div className="text-[9px] text-slate-600 mt-1">
                      {opp.item.avgDailyPicks.toFixed(1)}/day
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {opportunities.length > 5 && (
              <div className="text-[10px] font-mono text-slate-500 text-center py-2">
                +{opportunities.length - 5} more opportunities
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
