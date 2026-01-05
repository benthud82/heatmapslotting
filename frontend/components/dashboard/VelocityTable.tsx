'use client';

import { useState, useMemo } from 'react';
import { VelocityAnalysis, SlottingRecommendation, VelocityTier } from '@/lib/dashboardUtils';
import { ItemVelocityAnalysis } from '@/lib/types';

interface VelocityTableProps {
  data: VelocityAnalysis[];
  itemData?: ItemVelocityAnalysis[];
  loading?: boolean;
  onRowClick?: (item: VelocityAnalysis) => void;
  onItemRowClick?: (item: ItemVelocityAnalysis) => void;
}

type SortField = 'rank' | 'name' | 'totalPicks' | 'avgDaily' | 'trend' | 'recommendation' | 'walkSavings' | 'itemId';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'element' | 'item';

// Recommendation badge component
function RecommendationBadge({ recommendation }: { recommendation: SlottingRecommendation }) {
  const config: Record<SlottingRecommendation, { label: string; className: string; icon: string }> = {
    'move-closer': {
      label: 'Move Closer',
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: '↑',
    },
    'optimal': {
      label: 'Optimal',
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: '✓',
    },
    'review': {
      label: 'Review',
      className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      icon: '?',
    },
    'move-further': {
      label: 'Move Further',
      className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      icon: '↓',
    },
  };

  const { label, className, icon } = config[recommendation];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-mono rounded-md border ${className}`}>
      <span>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

// Trend indicator
function TrendIndicator({ trend, percent }: { trend: 'up' | 'down' | 'stable'; percent: number }) {
  if (trend === 'stable') {
    return (
      <span className="text-slate-500 text-xs font-mono flex items-center gap-1">
        <span className="w-4 h-0.5 bg-slate-600 rounded"></span>
        <span>—</span>
      </span>
    );
  }

  const isUp = trend === 'up';

  return (
    <span className={`flex items-center gap-1 text-xs font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
      <svg
        className={`w-3 h-3 ${isUp ? '' : 'rotate-180'}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
      <span>{isUp ? '+' : ''}{percent}%</span>
    </span>
  );
}

// Velocity tier badge
function TierBadge({ tier }: { tier: VelocityTier }) {
  const config: Record<VelocityTier, { className: string }> = {
    'hot': { className: 'bg-red-500/20 text-red-400' },
    'warm': { className: 'bg-amber-500/20 text-amber-400' },
    'cold': { className: 'bg-blue-500/20 text-blue-400' },
  };

  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-mono uppercase rounded ${config[tier].className}`}>
      {tier}
    </span>
  );
}

// Sort header button
function SortHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
  className = ''
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentField === field;

  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-xs font-mono uppercase tracking-wider hover:text-white transition-colors ${isActive ? 'text-white' : 'text-slate-400'
        } ${className}`}
    >
      {label}
      {isActive && (
        <svg
          className={`w-3 h-3 ${direction === 'desc' ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      )}
    </button>
  );
}

export default function VelocityTable({ data, itemData, loading, onRowClick, onItemRowClick }: VelocityTableProps) {
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterTier, setFilterTier] = useState<VelocityTier | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Determine if we have item-level data
  const hasItemData = itemData && itemData.length > 0;
  const [viewMode, setViewMode] = useState<ViewMode>(hasItemData ? 'item' : 'element');

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'rank' || field === 'totalPicks' ? 'asc' : 'desc');
    }
  };

  // Sort and filter element-level data
  const displayData = useMemo(() => {
    let filtered = [...data];

    // Apply tier filter
    if (filterTier !== 'all') {
      filtered = filtered.filter(item => item.velocityTier === filterTier);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.elementName.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'rank':
          comparison = b.percentile - a.percentile;
          break;
        case 'name':
          comparison = a.elementName.localeCompare(b.elementName);
          break;
        case 'totalPicks':
          comparison = b.totalPicks - a.totalPicks;
          break;
        case 'avgDaily':
          comparison = b.avgDailyPicks - a.avgDailyPicks;
          break;
        case 'trend':
          comparison = b.trendPercent - a.trendPercent;
          break;
        case 'recommendation':
          const order: SlottingRecommendation[] = ['move-closer', 'review', 'optimal', 'move-further'];
          comparison = order.indexOf(a.recommendation) - order.indexOf(b.recommendation);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [data, sortField, sortDirection, filterTier, searchQuery]);

  // Sort and filter item-level data
  const displayItemData = useMemo(() => {
    if (!itemData) return [];
    let filtered = [...itemData];

    // Apply tier filter
    if (filterTier !== 'all') {
      filtered = filtered.filter(item => item.velocityTier === filterTier);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.externalItemId.toLowerCase().includes(query) ||
        item.elementName.toLowerCase().includes(query) ||
        item.externalLocationId.toLowerCase().includes(query) ||
        (item.itemDescription?.toLowerCase().includes(query) ?? false)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'rank':
          comparison = b.percentile - a.percentile;
          break;
        case 'itemId':
          comparison = a.externalItemId.localeCompare(b.externalItemId);
          break;
        case 'name':
          comparison = a.elementName.localeCompare(b.elementName);
          break;
        case 'totalPicks':
          comparison = b.totalPicks - a.totalPicks;
          break;
        case 'avgDaily':
          comparison = b.avgDailyPicks - a.avgDailyPicks;
          break;
        case 'trend':
          comparison = b.trendPercent - a.trendPercent;
          break;
        case 'walkSavings':
          comparison = b.dailyWalkSavingsFeet - a.dailyWalkSavingsFeet;
          break;
        case 'recommendation':
          const order: SlottingRecommendation[] = ['move-closer', 'review', 'optimal', 'move-further'];
          comparison = order.indexOf(a.recommendation) - order.indexOf(b.recommendation);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [itemData, sortField, sortDirection, filterTier, searchQuery]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="animate-pulse">
          <div className="h-5 bg-slate-700 rounded w-40 mb-6"></div>
          <div className="h-10 bg-slate-700 rounded mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Velocity Ranking
          </h3>
          <div className="flex items-center gap-3">
            {/* View mode toggle - only show if we have item data */}
            {hasItemData && (
              <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('item')}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${viewMode === 'item' ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Items
                </button>
                <button
                  onClick={() => setViewMode('element')}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${viewMode === 'element' ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Elements
                </button>
              </div>
            )}
            <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">
              {viewMode === 'item' ? displayItemData.length : displayData.length} {viewMode === 'item' ? 'items' : 'locations'}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={viewMode === 'item' ? "Search items, locations, elements..." : "Search locations..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
            />
          </div>

          {/* Tier filter */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            {(['all', 'hot', 'warm', 'cold'] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${filterTier === tier
                  ? tier === 'all'
                    ? 'bg-slate-700 text-white'
                    : tier === 'hot'
                      ? 'bg-red-500/30 text-red-300'
                      : tier === 'warm'
                        ? 'bg-amber-500/30 text-amber-300'
                        : 'bg-blue-500/30 text-blue-300'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                {tier === 'all' ? 'All' : tier.charAt(0).toUpperCase() + tier.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {viewMode === 'item' ? (
          /* Item-level table */
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <SortHeader label="#" field="rank" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader label="Item" field="itemId" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-left hidden md:table-cell">
                  <SortHeader label="Location" field="name" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-right">
                  <SortHeader label="Picks" field="totalPicks" currentField={sortField} direction={sortDirection} onSort={handleSort} className="justify-end" />
                </th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">
                  <SortHeader label="Walk Save" field="walkSavings" currentField={sortField} direction={sortDirection} onSort={handleSort} className="justify-end" />
                </th>
                <th className="px-4 py-3 text-center hidden lg:table-cell">
                  <SortHeader label="Trend" field="trend" currentField={sortField} direction={sortDirection} onSort={handleSort} className="justify-center" />
                </th>
                <th className="px-4 py-3 text-center">
                  <SortHeader label="Action" field="recommendation" currentField={sortField} direction={sortDirection} onSort={handleSort} className="justify-center" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {displayItemData.length > 0 ? (
                displayItemData.map((item, index) => (
                  <tr
                    key={item.itemId}
                    onClick={() => onItemRowClick?.(item)}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-slate-500 w-6">{index + 1}</span>
                        <TierBadge tier={item.velocityTier} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-mono text-white group-hover:text-cyan-400 transition-colors">
                          {item.externalItemId}
                        </span>
                        {item.itemDescription && (
                          <span className="text-xs text-slate-500 truncate max-w-[150px]" title={item.itemDescription}>
                            {item.itemDescription}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-col">
                        <span className="text-sm font-mono text-slate-300">{item.elementName}</span>
                        <span className="text-xs text-slate-500">{item.externalLocationId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-mono font-bold text-white tabular-nums">
                          {item.totalPicks.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 tabular-nums">
                          {item.avgDailyPicks.toFixed(1)}/day
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      {item.dailyWalkSavingsFeet > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-mono text-emerald-400 tabular-nums">
                            {item.dailyWalkSavingsFeet.toLocaleString()} ft
                          </span>
                          <span className="text-xs text-slate-500 tabular-nums">
                            {item.dailyTimeSavingsMinutes} min
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-mono text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex justify-center">
                        <TrendIndicator trend={item.trend} percent={item.trendPercent} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <RecommendationBadge recommendation={item.recommendation} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center text-slate-500">
                      <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm">No matching items found</p>
                      {(filterTier !== 'all' || searchQuery) && (
                        <button
                          onClick={() => { setFilterTier('all'); setSearchQuery(''); }}
                          className="mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          /* Element-level table */
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <SortHeader label="#" field="rank" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader label="Location" field="name" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-right">
                  <SortHeader label="Total Picks" field="totalPicks" currentField={sortField} direction={sortDirection} onSort={handleSort} className="justify-end" />
                </th>
                <th className="px-4 py-3 text-right hidden md:table-cell">
                  <SortHeader label="Avg/Day" field="avgDaily" currentField={sortField} direction={sortDirection} onSort={handleSort} className="justify-end" />
                </th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">
                  <SortHeader label="Walk Save" field="walkSavings" currentField={sortField} direction={sortDirection} onSort={handleSort} className="justify-end" />
                </th>
                <th className="px-4 py-3 text-center hidden lg:table-cell">
                  <SortHeader label="Trend" field="trend" currentField={sortField} direction={sortDirection} onSort={handleSort} className="justify-center" />
                </th>
                <th className="px-4 py-3 text-center">
                  <SortHeader label="Action" field="recommendation" currentField={sortField} direction={sortDirection} onSort={handleSort} className="justify-center" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {displayData.length > 0 ? (
                displayData.map((item, index) => (
                  <tr
                    key={item.elementId}
                    onClick={() => onRowClick?.(item)}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-slate-500 w-6">{index + 1}</span>
                        <TierBadge tier={item.velocityTier} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-white group-hover:text-cyan-400 transition-colors">
                        {item.elementName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono font-bold text-white tabular-nums">
                        {item.totalPicks.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className="text-sm font-mono text-slate-400 tabular-nums">
                        {item.avgDailyPicks.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      {item.dailyWalkSavingsFeet > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-mono text-emerald-400 tabular-nums">
                            {item.dailyWalkSavingsFeet.toLocaleString()} ft
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-mono text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex justify-center">
                        <TrendIndicator trend={item.trend} percent={item.trendPercent} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <RecommendationBadge recommendation={item.recommendation} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center text-slate-500">
                      <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm">No matching locations found</p>
                      {(filterTier !== 'all' || searchQuery) && (
                        <button
                          onClick={() => { setFilterTier('all'); setSearchQuery(''); }}
                          className="mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer with summary */}
      {((viewMode === 'item' && displayItemData.length > 0) || (viewMode === 'element' && displayData.length > 0)) && (
        <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
            {viewMode === 'item' ? (
              <>
                <div className="flex items-center gap-4">
                  <span>
                    <span className="text-amber-400">{displayItemData.filter(d => d.recommendation === 'move-closer').length}</span> move closer
                  </span>
                  <span>
                    <span className="text-emerald-400">{displayItemData.filter(d => d.recommendation === 'optimal').length}</span> optimal
                  </span>
                  <span>
                    <span className="text-cyan-400">{displayItemData.reduce((sum, d) => sum + d.dailyWalkSavingsFeet, 0).toLocaleString()}</span> ft/day savings
                  </span>
                </div>
                <div>
                  Total: <span className="text-white font-bold">{displayItemData.reduce((sum, d) => sum + d.totalPicks, 0).toLocaleString()}</span> picks
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <span>
                    <span className="text-amber-400">{displayData.filter(d => d.recommendation === 'move-closer').length}</span> need attention
                  </span>
                  <span>
                    <span className="text-emerald-400">{displayData.filter(d => d.recommendation === 'optimal').length}</span> optimal
                  </span>
                </div>
                <div>
                  Total: <span className="text-white font-bold">{displayData.reduce((sum, d) => sum + d.totalPicks, 0).toLocaleString()}</span> picks
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}















