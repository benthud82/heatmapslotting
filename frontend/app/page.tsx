'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { layoutApi, picksApi } from '@/lib/api';
import { Layout, AggregatedPickData } from '@/lib/types';
import Header from '@/components/Header';
import {
  CommandHeader,
  ActivityTimeline,
  AnalyticsSidebar,
  RecentLayouts,
  QuickActionsFooter,
  TemplateSelector,
} from '@/components/home';

interface LayoutWithStats extends Layout {
  elementCount?: number;
  totalPicks?: number;
}

export default function Home() {
  const router = useRouter();
  // Auth guard - redirects to /landing if not authenticated
  const { user, loading: authLoading } = useAuthGuard();
  const [dataLoading, setDataLoading] = useState(true);
  const [layouts, setLayouts] = useState<LayoutWithStats[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedPickData[]>([]);
  const [pickDataByLayout, setPickDataByLayout] = useState<
    Record<string, { totalPicks: number; lastUpload?: string }>
  >({});
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // User name from auth guard user
  const userName = useMemo(() => {
    if (!user) return undefined;
    return user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      undefined;
  }, [user]);

  // Computed values
  const totalPicks = useMemo(() => {
    return Object.values(pickDataByLayout).reduce((sum, data) => sum + data.totalPicks, 0);
  }, [pickDataByLayout]);

  const totalLocations = useMemo(() => {
    return layouts.reduce((sum, layout) => sum + (layout.elementCount || 0), 0);
  }, [layouts]);

  const lastActivity = useMemo(() => {
    const dates = layouts.map(l => new Date(l.updated_at).getTime());
    if (dates.length === 0) return undefined;
    return new Date(Math.max(...dates)).toISOString();
  }, [layouts]);

  // Combined loading state
  const loading = authLoading || dataLoading;

  // Data loading (only after auth is confirmed)
  useEffect(() => {
    const loadData = async () => {
      if (authLoading || !user) return;

      try {
        // Load layouts
        const layoutsData = await layoutApi.getLayouts();

        // Load element counts and pick data for each layout
        const layoutsWithStats: LayoutWithStats[] = [];
        const pickDataMap: Record<string, { totalPicks: number; lastUpload?: string }> = {};
        let allAggregated: AggregatedPickData[] = [];

        for (const layout of layoutsData) {
          try {
            // Get element count
            const elements = await layoutApi.getElements(layout.id);
            const elementCount = elements.length;

            // Get aggregated pick data
            const aggregated = await picksApi.getAggregated(layout.id);
            const totalPicks = aggregated.reduce((sum, d) => sum + d.total_picks, 0);
            const lastUpload = aggregated.length > 0
              ? aggregated.reduce((latest, d) =>
                  new Date(d.last_date) > new Date(latest) ? d.last_date : latest,
                  aggregated[0].last_date
                )
              : undefined;

            layoutsWithStats.push({
              ...layout,
              elementCount,
              totalPicks,
            });

            pickDataMap[layout.id] = { totalPicks, lastUpload };
            allAggregated = [...allAggregated, ...aggregated];
          } catch (err) {
            // If layout data fails, still show the layout
            layoutsWithStats.push({ ...layout });
            console.error(`Failed to load data for layout ${layout.id}:`, err);
          }
        }

        setLayouts(layoutsWithStats);
        setPickDataByLayout(pickDataMap);
        setAggregatedData(allAggregated);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [authLoading, user]);

  // Initial loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 command-grid">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-xl animate-ping" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-900/50">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-mono text-slate-400 uppercase tracking-wider animate-pulse">
              Initializing Command Center
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no layouts yet
  if (layouts.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 command-grid">
        <Header
          title="Warehouse Command Center"
          subtitle="Optimize your warehouse operations"
        />

        <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6">
          <div className="max-w-lg text-center">
            <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-800">
              <svg className="w-10 h-10 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-white mb-3">
              Initialize Your Command Center
            </h1>
            <p className="text-slate-400 mb-8">
              Create your first warehouse layout to start optimizing pick paths,
              visualizing heatmaps, and analyzing velocity zones.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="inline-flex items-center gap-3 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-white font-mono font-bold text-lg rounded-xl shadow-xl shadow-cyan-900/50 hover:shadow-2xl hover:shadow-cyan-900/70 transition-all duration-200 hover:scale-105"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
                </svg>
                Use Template
              </button>
              <Link
                href="/designer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-mono font-medium text-lg rounded-xl transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Start from Scratch
              </Link>
            </div>

            {/* Template Selector Modal */}
            {showTemplateSelector && (
              <TemplateSelector onClose={() => setShowTemplateSelector(false)} />
            )}

            <div className="mt-12 grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-xs text-slate-500">Heatmaps</p>
              </div>
              <div>
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="text-xs text-slate-500">Analytics</p>
              </div>
              <div>
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="text-xs text-slate-500">Optimization</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="min-h-screen bg-slate-950 command-grid">
      {/* Grid texture overlay */}
      <style jsx global>{`
        .command-grid {
          background-image:
            linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>

      <Header
        title="Command Center"
        subtitle="Warehouse Intelligence"
      />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Command Header */}
        <div className="mb-10">
          <CommandHeader
            userName={userName}
            layoutCount={layouts.length}
            totalPicks={totalPicks}
            lastActivity={lastActivity}
            loading={loading}
          />
        </div>

        {/* Main Grid: Activity Timeline + Analytics Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Activity Timeline - takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <ActivityTimeline
              layouts={layouts}
              pickDataByLayout={pickDataByLayout}
              loading={loading}
            />
          </div>

          {/* Analytics Sidebar - takes 1 column */}
          <div className="lg:col-span-1">
            <AnalyticsSidebar
              totalPicks={totalPicks}
              totalLocations={totalLocations}
              layoutCount={layouts.length}
              aggregatedData={aggregatedData}
              loading={loading}
            />
          </div>
        </div>

        {/* Recent Layouts */}
        <div className="mb-8">
          <RecentLayouts
            layouts={layouts}
            loading={loading}
          />
        </div>

        {/* Quick Actions Footer */}
        <QuickActionsFooter enableKeyboardShortcuts />
      </main>
    </div>
  );
}
