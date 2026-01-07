'use client';

import React, { useEffect, useCallback } from 'react';
import { CapacityAwareReslottingOpportunity } from '@/lib/types';

interface ReslotHUDProps {
  opportunities: CapacityAwareReslottingOpportunity[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onApprove: (opp: CapacityAwareReslottingOpportunity) => void;
  onIgnore: () => void;
  onClose: () => void;
  onExportApproved: () => void;
  approvedCount: number;
  autoTourEnabled: boolean;
  onAutoTourToggle: () => void;
  capacityThreshold: number;
  onCapacityThresholdChange: (value: number) => void;
  // Pagination props
  hasMore?: boolean;
  totalAvailable?: number;
  onLoadMore?: () => void;
  // Swap toggle props
  showSwapSuggestions?: boolean;
  onShowSwapSuggestionsChange?: (value: boolean) => void;
}

export default function ReslotHUD({
  opportunities,
  activeIndex,
  onIndexChange,
  onApprove,
  onIgnore,
  onClose,
  onExportApproved,
  approvedCount,
  autoTourEnabled,
  onAutoTourToggle,
  capacityThreshold,
  onCapacityThresholdChange,
  hasMore = false,
  totalAvailable,
  onLoadMore,
  showSwapSuggestions = true,
  onShowSwapSuggestionsChange,
}: ReslotHUDProps) {
  const currentOpp = opportunities[activeIndex];
  const target = currentOpp?.targetElements[0];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && activeIndex > 0) {
        onIndexChange(activeIndex - 1);
      } else if (e.key === 'ArrowRight' && activeIndex < opportunities.length - 1) {
        onIndexChange(activeIndex + 1);
      } else if (e.key === 'Enter' && currentOpp) {
        onApprove(currentOpp);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, opportunities.length, currentOpp, onIndexChange, onApprove, onClose]);

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      onIndexChange(activeIndex - 1);
    }
  }, [activeIndex, onIndexChange]);

  const handleNext = useCallback(() => {
    if (activeIndex < opportunities.length - 1) {
      onIndexChange(activeIndex + 1);
    }
  }, [activeIndex, opportunities.length, onIndexChange]);

  if (!currentOpp || opportunities.length === 0) {
    return null;
  }

  // Calculate metrics
  const currentDistFt = Math.round(currentOpp.currentElement.distance / 12);
  const targetDistFt = target ? Math.round(target.distance / 12) : 0;
  const dailySavingsFt = currentOpp.totalDailyWalkSavings;
  const dailySavingsMin = (dailySavingsFt / 264).toFixed(1);
  const efficiencyGain = currentDistFt > 0
    ? Math.round(((currentDistFt - targetDistFt) / currentDistFt) * 100)
    : 0;

  // Velocity tier styling
  const getVelocityBadge = (tier: string, percentile: number) => {
    const tierStyles = {
      hot: 'bg-red-500/20 text-red-400 border-red-500/30',
      warm: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      cold: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    const tierEmoji = tier === 'hot' ? '🔥' : tier === 'warm' ? '🌡' : '❄️';
    return (
      <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold ${tierStyles[tier as keyof typeof tierStyles] || 'bg-slate-500/20 text-slate-400'}`}>
        {tierEmoji} {tier} ({Math.round(percentile)}%)
      </span>
    );
  };

  // Element type badge
  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      bay: 'bg-blue-500/20 text-blue-400',
      flow_rack: 'bg-green-500/20 text-green-400',
      full_pallet: 'bg-amber-500/20 text-amber-400',
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${styles[type] || 'bg-slate-500/20 text-slate-400'}`}>
        {type.replace('_', ' ')}
      </span>
    );
  };

  // Move type badge
  const getMoveTypeBadge = () => {
    if (currentOpp.moveType === 'empty-slot') {
      return (
        <span className="px-2 py-0.5 rounded border text-[9px] uppercase font-medium bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          Empty Slot
        </span>
      );
    } else if (currentOpp.moveType === 'swap') {
      return (
        <span className="px-2 py-0.5 rounded border text-[9px] uppercase font-medium bg-amber-500/20 text-amber-400 border-amber-500/30">
          Swap Required
        </span>
      );
    }
    return null;
  };

  return (
    <div data-tour="reslothud-panel" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-mono text-sm text-slate-200">
                <span className="text-amber-400 font-bold">{activeIndex + 1}</span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-400">{opportunities.length}</span>
              </span>
            </div>

            {/* Capacity Threshold Slider */}
            <div className="flex items-center gap-2 ml-2 px-2 py-1 bg-slate-800/80 rounded-lg border border-slate-700/50">
              <span className="text-[9px] text-slate-500 uppercase tracking-wide whitespace-nowrap">Capacity</span>
              <input
                type="range"
                min="5"
                max="40"
                step="5"
                value={Math.round(capacityThreshold * 100)}
                onChange={(e) => onCapacityThresholdChange(parseInt(e.target.value) / 100)}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="font-mono text-xs text-amber-400 w-8 text-right">{Math.round(capacityThreshold * 100)}%</span>
            </div>

            {/* Swap Suggestions Toggle */}
            {onShowSwapSuggestionsChange && (
              <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/80 rounded-lg border border-slate-700/50">
                <span className="text-[9px] text-slate-500 uppercase tracking-wide whitespace-nowrap">Swaps</span>
                <button
                  onClick={() => onShowSwapSuggestionsChange(!showSwapSuggestions)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    showSwapSuggestions ? 'bg-amber-500' : 'bg-slate-600'
                  }`}
                  title={showSwapSuggestions ? 'Hide swap suggestions' : 'Show swap suggestions'}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${
                      showSwapSuggestions ? 'left-[18px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content - Three Columns */}
        <div className="grid grid-cols-3 gap-4 p-4">
          {/* Left: Item Details */}
          <div data-tour="reslothud-item" className="space-y-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Item Details</div>
            <div className="font-mono text-sm text-white font-bold truncate" title={currentOpp.item.externalItemId}>
              {currentOpp.item.externalItemId}
            </div>
            {currentOpp.item.itemDescription && (
              <div className="text-[11px] text-slate-400 font-mono truncate" title={currentOpp.item.itemDescription}>
                {currentOpp.item.itemDescription}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {getVelocityBadge(currentOpp.item.velocityTier, currentOpp.item.percentile)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {currentOpp.item.totalPicks.toLocaleString()} picks ({currentOpp.item.avgDailyPicks.toFixed(1)}/day)
            </div>
          </div>

          {/* Center: The Move */}
          <div data-tour="reslothud-move" className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">The Move</span>
              {getMoveTypeBadge()}
            </div>
            <div className="flex items-center justify-center gap-2">
              {/* Current Location */}
              <div className="text-center">
                <div className="font-mono text-xs text-red-400 font-medium truncate max-w-[100px]" title={currentOpp.currentElement.name}>
                  {currentOpp.currentElement.name}
                </div>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  {getTypeBadge(currentOpp.currentElement.type)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  {currentDistFt} ft
                </div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center px-2">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>

              {/* Target Location */}
              <div className="text-center">
                <div className="font-mono text-xs text-emerald-400 font-medium truncate max-w-[100px]" title={target?.name}>
                  {target?.name || 'N/A'}
                </div>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  {target && getTypeBadge(target.type)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  {targetDistFt} ft
                  {target && target.estimatedEmpty > 0 && (
                    <span className="text-emerald-500 ml-1">({target.estimatedEmpty} empty)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Swap Suggestion */}
            {showSwapSuggestions && target?.swapSuggestion && (
              <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-medium">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Swap With:
                </div>
                <div className="font-mono text-xs text-white truncate mt-0.5" title={target.swapSuggestion.coldItem.externalItemId}>
                  {target.swapSuggestion.coldItem.externalItemId}
                </div>
                <div className="text-[9px] text-amber-300/70 mt-0.5">
                  {target.swapSuggestion.reason}
                </div>
              </div>
            )}
          </div>

          {/* Right: The Gain */}
          <div data-tour="reslothud-savings" className="space-y-2 text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Daily Savings</div>
            <div className="font-mono text-lg text-emerald-400 font-bold">
              {Math.round(dailySavingsFt).toLocaleString()} ft
            </div>
            <div className="text-xs text-slate-400 font-mono">
              +{dailySavingsMin} min/day
            </div>
            {efficiencyGain > 0 && (
              <div className="text-[10px] text-emerald-500 font-mono">
                ↑ {efficiencyGain}% closer
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={activeIndex === 0}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 font-mono text-xs rounded transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </button>
            <button
              onClick={handleNext}
              disabled={activeIndex === opportunities.length - 1 && !hasMore}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 font-mono text-xs rounded transition-colors flex items-center gap-1"
            >
              Next
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Load More Button - shown when at end and more items available */}
            {activeIndex === opportunities.length - 1 && hasMore && onLoadMore && (
              <button
                onClick={onLoadMore}
                className="px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 font-mono text-xs rounded transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Load More{totalAvailable && totalAvailable > opportunities.length && ` (${totalAvailable - opportunities.length})`}
              </button>
            )}
          </div>

          {/* Primary Actions */}
          <div data-tour="reslothud-actions" className="flex items-center gap-2">
            <button
              onClick={() => onApprove(currentOpp)}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs rounded transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </button>
            <button
              onClick={onIgnore}
              className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-mono text-xs rounded transition-colors"
            >
              Skip
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Auto-Tour Toggle */}
            <button
              onClick={onAutoTourToggle}
              className={`px-3 py-1.5 font-mono text-xs rounded transition-colors flex items-center gap-1.5 border ${
                autoTourEnabled
                  ? 'bg-amber-600/40 border-amber-500/60 text-amber-200'
                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
            >
              <svg className={`w-3.5 h-3.5 ${autoTourEnabled ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Auto
            </button>

            {/* Export Button */}
            <button
              data-tour="reslothud-export"
              onClick={onExportApproved}
              disabled={approvedCount === 0}
              className={`px-3 py-1.5 font-mono text-xs rounded transition-colors flex items-center gap-1.5 border ${
                approvedCount > 0
                  ? 'bg-blue-600/40 border-blue-500/60 text-blue-200 hover:bg-blue-600/50'
                  : 'bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export ({approvedCount})
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${((activeIndex + 1) / opportunities.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
