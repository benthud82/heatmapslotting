'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useJourney } from '@/lib/journey';

// Define nudge configurations: when user is on a page but missing prerequisites
interface NudgeConfig {
  id: string;
  currentPage: string;
  requiredMilestone: string;
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
}

const NUDGE_CONFIGS: NudgeConfig[] = [
  {
    id: 'heatmap_needs_data',
    currentPage: '/heatmap',
    requiredMilestone: 'pick_data_uploaded',
    title: 'Upload Pick Data First',
    message: 'To see the heatmap visualization and optimization opportunities, you\'ll need to upload your pick transaction data.',
    actionLabel: 'Upload Data',
    actionHref: '/upload',
  },
  {
    id: 'heatmap_needs_layout',
    currentPage: '/heatmap',
    requiredMilestone: 'layout_created',
    title: 'Create Your Layout First',
    message: 'Before viewing the heatmap, you\'ll need to design your warehouse layout with bays and storage locations.',
    actionLabel: 'Go to Designer',
    actionHref: '/designer',
  },
  {
    id: 'upload_needs_layout',
    currentPage: '/upload',
    requiredMilestone: 'layout_created',
    title: 'Create Your Layout First',
    message: 'Before uploading pick data, you\'ll need to design your warehouse layout so we can map your data to locations.',
    actionLabel: 'Go to Designer',
    actionHref: '/designer',
  },
  {
    id: 'dashboard_needs_data',
    currentPage: '/dashboard',
    requiredMilestone: 'pick_data_uploaded',
    title: 'Upload Pick Data First',
    message: 'To see analytics and optimization recommendations, you\'ll need to upload your pick transaction data.',
    actionLabel: 'Upload Data',
    actionHref: '/upload',
  },
  {
    id: 'designer_needs_parking',
    currentPage: '/designer',
    requiredMilestone: 'route_markers_added',
    title: 'Add Cart Parking',
    message: 'To calculate walk distances and get optimization recommendations, add at least one cart parking marker to your layout.',
    actionLabel: 'Got it!',
    actionHref: '', // Stay on page
  },
];

export default function JourneyNudgeModal() {
  const journey = useJourney();
  const pathname = usePathname();
  const [activeNudge, setActiveNudge] = useState<NudgeConfig | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showDelay, setShowDelay] = useState(false);

  // Determine if we should show a nudge
  useEffect(() => {
    if (!journey || journey.loading) return;
    if (journey.preferences.onboarding_completed || journey.preferences.onboarding_dismissed) return;

    // Wait 2 seconds before showing nudge (don't interrupt immediately)
    const timer = setTimeout(() => setShowDelay(true), 2000);
    return () => clearTimeout(timer);
  }, [journey, pathname]);

  useEffect(() => {
    if (!journey || journey.loading || !showDelay) return;
    if (journey.preferences.onboarding_completed || journey.preferences.onboarding_dismissed) return;

    const completedMilestones = journey.progress.completedMilestones;

    // Find the first applicable nudge for current page
    for (const nudge of NUDGE_CONFIGS) {
      if (nudge.currentPage !== pathname) continue;
      if (dismissed.has(nudge.id)) continue;
      if (completedMilestones.includes(nudge.requiredMilestone)) continue;

      // Special case: don't show "needs layout" if they already have layout
      if (nudge.requiredMilestone === 'layout_created' && completedMilestones.includes('layout_created')) continue;

      // Special case: designer_needs_parking only shows after layout is created
      if (nudge.id === 'designer_needs_parking' && !completedMilestones.includes('layout_created')) continue;

      setActiveNudge(nudge);
      return;
    }

    setActiveNudge(null);
  }, [journey, pathname, dismissed, showDelay]);

  const handleDismiss = () => {
    if (activeNudge) {
      setDismissed(prev => new Set(prev).add(activeNudge.id));
    }
    setActiveNudge(null);
  };

  const handleAction = () => {
    handleDismiss();
  };

  if (!activeNudge) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

        <div className="p-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Content */}
          <h3 className="text-lg font-bold text-white mb-2">
            {activeNudge.title}
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            {activeNudge.message}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {activeNudge.actionHref ? (
              <Link
                href={activeNudge.actionHref}
                onClick={handleAction}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors text-center"
              >
                {activeNudge.actionLabel}
              </Link>
            ) : (
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors"
              >
                {activeNudge.actionLabel}
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 text-slate-400 hover:text-white transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
