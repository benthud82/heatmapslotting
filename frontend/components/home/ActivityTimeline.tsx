'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Layout } from '@/lib/types';

export type ActivityType = 'layout_created' | 'layout_modified' | 'data_uploaded' | 'analysis_complete';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  layoutId?: string;
  layoutName?: string;
  metadata?: {
    pickCount?: number;
    locationCount?: number;
  };
}

interface ActivityTimelineProps {
  layouts: Layout[];
  pickDataByLayout?: Record<string, { totalPicks: number; lastUpload?: string }>;
  loading?: boolean;
  maxItems?: number;
}

// Generate activity items from layouts and pick data
function generateActivityItems(
  layouts: Layout[],
  pickDataByLayout?: Record<string, { totalPicks: number; lastUpload?: string }>
): ActivityItem[] {
  const items: ActivityItem[] = [];

  layouts.forEach(layout => {
    // Layout created event
    items.push({
      id: `${layout.id}-created`,
      type: 'layout_created',
      title: 'Layout Created',
      description: `Created warehouse layout "${layout.name}"`,
      timestamp: layout.created_at,
      layoutId: layout.id,
      layoutName: layout.name,
    });

    // Layout modified event (if different from created)
    const createdDate = new Date(layout.created_at).getTime();
    const updatedDate = new Date(layout.updated_at).getTime();
    if (updatedDate - createdDate > 60000) { // More than 1 minute difference
      items.push({
        id: `${layout.id}-modified`,
        type: 'layout_modified',
        title: 'Layout Updated',
        description: `Modified "${layout.name}"`,
        timestamp: layout.updated_at,
        layoutId: layout.id,
        layoutName: layout.name,
      });
    }

    // Data uploaded event (if we have pick data)
    const pickData = pickDataByLayout?.[layout.id];
    if (pickData && pickData.totalPicks > 0) {
      items.push({
        id: `${layout.id}-data`,
        type: 'data_uploaded',
        title: 'Pick Data Uploaded',
        description: `${pickData.totalPicks.toLocaleString()} picks added to "${layout.name}"`,
        timestamp: pickData.lastUpload || layout.updated_at,
        layoutId: layout.id,
        layoutName: layout.name,
        metadata: { pickCount: pickData.totalPicks },
      });
    }
  });

  // Sort by timestamp descending
  return items.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Activity type config
const activityConfig: Record<ActivityType, { icon: JSX.Element; color: string; bgColor: string }> = {
  layout_created: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
  },
  layout_modified: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  data_uploaded: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
  analysis_complete: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
  },
};

function ActivityItemCard({ item, index }: { item: ActivityItem; index: number }) {
  const config = activityConfig[item.type];

  return (
    <div
      className="group relative flex gap-4 py-4 px-4 -mx-4 rounded-xl hover:bg-slate-800/50 transition-all duration-200"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Timeline line */}
      <div className="absolute left-[27px] top-0 bottom-0 w-px bg-slate-800 group-first:top-6 group-last:bottom-auto group-last:h-6" />

      {/* Icon */}
      <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-lg ${config.bgColor} ${config.color} flex items-center justify-center ring-4 ring-slate-900`}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4 mb-1">
          <h4 className="text-sm font-medium text-white truncate">
            {item.title}
          </h4>
          <span className="flex-shrink-0 text-xs font-mono text-slate-500 uppercase tracking-wider">
            {formatRelativeTime(item.timestamp)}
          </span>
        </div>
        <p className="text-sm text-slate-400 truncate">
          {item.description}
        </p>

        {/* Quick action on hover */}
        {item.layoutId && (
          <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link
              href={`/designer?layout=${item.layoutId}`}
              className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Link>
            <Link
              href={`/heatmap?layout=${item.layoutId}`}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Heatmap
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="w-8 h-8 bg-slate-800 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-800 rounded w-3/4" />
            <div className="h-3 bg-slate-800/50 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-slate-300 mb-2">No Activity Yet</h3>
      <p className="text-sm text-slate-500 max-w-xs mx-auto">
        Create your first warehouse layout to start tracking activity
      </p>
    </div>
  );
}

export function ActivityTimeline({
  layouts,
  pickDataByLayout,
  loading,
  maxItems = 10
}: ActivityTimelineProps) {
  const activityItems = useMemo(() => {
    return generateActivityItems(layouts, pickDataByLayout).slice(0, maxItems);
  }, [layouts, pickDataByLayout, maxItems]);

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Activity Feed</h2>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Recent Updates</p>
          </div>
        </div>

        {activityItems.length > 0 && (
          <span className="px-2 py-1 bg-slate-800 text-slate-400 text-xs font-mono rounded">
            {activityItems.length} events
          </span>
        )}
      </div>

      {/* Timeline content */}
      {loading ? (
        <LoadingSkeleton />
      ) : activityItems.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="relative">
          {activityItems.map((item, index) => (
            <ActivityItemCard key={item.id} item={item} index={index} />
          ))}
        </div>
      )}

      {/* View all link */}
      {activityItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
          >
            View full activity
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
