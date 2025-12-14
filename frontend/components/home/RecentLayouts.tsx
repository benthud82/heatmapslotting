'use client';

import Link from 'next/link';
import { Layout } from '@/lib/types';

interface LayoutWithStats extends Layout {
  elementCount?: number;
  totalPicks?: number;
}

interface RecentLayoutsProps {
  layouts: LayoutWithStats[];
  loading?: boolean;
  maxItems?: number;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function LayoutCard({ layout, index }: { layout: LayoutWithStats; index: number }) {
  return (
    <div
      className="group relative bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-cyan-500/50 hover:bg-slate-800/70 transition-all duration-200"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white truncate max-w-[140px]">
                {layout.name}
              </h3>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                {formatDate(layout.updated_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="text-xs font-mono text-slate-400">
              {layout.elementCount?.toLocaleString() ?? '—'} <span className="text-slate-500">loc</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-xs font-mono text-slate-400">
              {layout.totalPicks?.toLocaleString() ?? '—'} <span className="text-slate-500">picks</span>
            </span>
          </div>
        </div>

        {/* Actions - visible on hover */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/designer?layout=${layout.id}`}
            className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>
          <Link
            href={`/heatmap?layout=${layout.id}`}
            className="flex-1 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

function CreateNewCard() {
  return (
    <Link
      href="/designer"
      className="group relative flex flex-col items-center justify-center min-h-[160px] bg-slate-900/50 border-2 border-dashed border-slate-700 rounded-xl p-4 hover:border-cyan-500/50 hover:bg-slate-800/30 transition-all duration-200"
    >
      <div className="w-12 h-12 bg-slate-800 group-hover:bg-cyan-500/20 rounded-xl flex items-center justify-center mb-3 transition-colors">
        <svg className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <span className="text-sm font-medium text-slate-400 group-hover:text-cyan-400 transition-colors">
        Create New Layout
      </span>
      <span className="text-xs text-slate-600 mt-1 font-mono">
        Start fresh
      </span>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-slate-800/50 rounded-xl p-4 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-slate-700 rounded-lg" />
            <div className="flex-1">
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-1" />
              <div className="h-2 bg-slate-700/50 rounded w-1/2" />
            </div>
          </div>
          <div className="flex gap-4 mb-4">
            <div className="h-3 bg-slate-700/50 rounded w-16" />
            <div className="h-3 bg-slate-700/50 rounded w-16" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-7 bg-slate-700/50 rounded-lg" />
            <div className="flex-1 h-7 bg-slate-700/50 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecentLayouts({
  layouts,
  loading,
  maxItems = 7
}: RecentLayoutsProps) {
  // Sort by updated_at and limit
  const sortedLayouts = [...layouts]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, maxItems);

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl animate-pulse" />
            <div>
              <div className="h-5 bg-slate-800 rounded w-32 mb-1 animate-pulse" />
              <div className="h-3 bg-slate-800/50 rounded w-24 animate-pulse" />
            </div>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Recent Layouts</h2>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">
              {layouts.length} total layout{layouts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {layouts.length > maxItems && (
          <Link
            href="/designer"
            className="text-sm text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
          >
            View all
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedLayouts.map((layout, index) => (
          <LayoutCard key={layout.id} layout={layout} index={index} />
        ))}
        <CreateNewCard />
      </div>
    </div>
  );
}
