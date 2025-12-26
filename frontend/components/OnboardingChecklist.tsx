'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { layoutApi, picksApi } from '@/lib/api';

interface OnboardingStep {
  id: 'design' | 'upload' | 'dashboard';
  label: string;
  description: string;
  href: string;
  completed: boolean;
}

const initialSteps: OnboardingStep[] = [
  {
    id: 'design',
    label: 'Design Your Layout',
    description: 'Create warehouse elements in the Designer',
    href: '/designer',
    completed: false,
  },
  {
    id: 'upload',
    label: 'Upload Pick Data',
    description: 'Import your CSV pick data',
    href: '/upload',
    completed: false,
  },
  {
    id: 'dashboard',
    label: 'View Analytics',
    description: 'Check your dashboard insights',
    href: '/dashboard',
    completed: false,
  },
];

export default function OnboardingChecklist() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>(initialSteps);
  const [loading, setLoading] = useState(true);

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const allComplete = completedCount === totalCount;

  // Check progress on mount
  useEffect(() => {
    const checkProgress = async () => {
      try {
        // Check if user has skipped onboarding
        const skipped = localStorage.getItem('onboarding_skipped') === 'true';
        if (skipped) {
          setIsVisible(false);
          setLoading(false);
          return;
        }

        // Fetch layouts
        const layouts = await layoutApi.getLayouts();

        let hasElements = false;
        let hasPickData = false;

        if (layouts.length > 0) {
          // Check if any layout has elements (Step 1)
          try {
            const elements = await layoutApi.getElements(layouts[0].id);
            hasElements = elements.length > 0;
          } catch {
            // Ignore errors, assume no elements
          }

          // Check if any layout has pick data (Step 2)
          try {
            const dates = await picksApi.getDates(layouts[0].id);
            hasPickData = dates.length > 0;
          } catch {
            // Ignore errors, assume no pick data
          }
        }

        // Check if user has visited dashboard with data (Step 3)
        const visitedDashboard = localStorage.getItem('onboarding_dashboard_visited') === 'true';

        setSteps((prev) =>
          prev.map((step) => ({
            ...step,
            completed:
              step.id === 'design'
                ? hasElements
                : step.id === 'upload'
                  ? hasPickData
                  : step.id === 'dashboard'
                    ? visitedDashboard
                    : false,
          }))
        );

        setIsVisible(true);
      } catch {
        // If API fails, still show checklist with unknown status
        setIsVisible(true);
      } finally {
        setLoading(false);
      }
    };

    checkProgress();
  }, []);

  // Listen for show-onboarding event to restart
  useEffect(() => {
    const handleShowOnboarding = () => {
      localStorage.removeItem('onboarding_skipped');
      setIsVisible(true);
      // Re-check progress
      const recheckProgress = async () => {
        try {
          const layouts = await layoutApi.getLayouts();
          let hasElements = false;
          let hasPickData = false;

          if (layouts.length > 0) {
            try {
              const elements = await layoutApi.getElements(layouts[0].id);
              hasElements = elements.length > 0;
            } catch {
              // Ignore
            }
            try {
              const dates = await picksApi.getDates(layouts[0].id);
              hasPickData = dates.length > 0;
            } catch {
              // Ignore
            }
          }

          const visitedDashboard = localStorage.getItem('onboarding_dashboard_visited') === 'true';

          setSteps((prev) =>
            prev.map((step) => ({
              ...step,
              completed:
                step.id === 'design'
                  ? hasElements
                  : step.id === 'upload'
                    ? hasPickData
                    : step.id === 'dashboard'
                      ? visitedDashboard
                      : false,
            }))
          );
        } catch {
          // Ignore
        }
      };
      recheckProgress();
    };

    window.addEventListener('show-onboarding', handleShowOnboarding);
    return () => window.removeEventListener('show-onboarding', handleShowOnboarding);
  }, []);

  const handleSkip = () => {
    localStorage.setItem('onboarding_skipped', 'true');
    setIsVisible(false);
  };

  if (loading || !isVisible) {
    return null;
  }

  // Auto-hide when all steps complete
  if (allComplete) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isMinimized ? (
        // Minimized pill button
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 rounded-full shadow-xl hover:border-blue-500 transition-colors"
        >
          <svg
            className="w-5 h-5 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <span className="text-sm font-medium text-white">
            Getting Started ({completedCount}/{totalCount})
          </span>
        </button>
      ) : (
        // Expanded card
        <div className="w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <h3 className="text-sm font-bold text-white">Getting Started</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Minimize"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button
                onClick={handleSkip}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Skip onboarding"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-4 py-2 bg-slate-800/50">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Progress</span>
              <span>
                {completedCount}/{totalCount} complete
              </span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>

          {/* Steps list */}
          <ul className="p-2">
            {steps.map((step) => (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                    step.completed
                      ? 'opacity-60 hover:opacity-80'
                      : 'hover:bg-slate-800'
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      step.completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-slate-600'
                    }`}
                  >
                    {step.completed && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        step.completed ? 'text-slate-400 line-through' : 'text-white'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{step.description}</p>
                  </div>

                  {/* Arrow */}
                  {!step.completed && (
                    <svg
                      className="w-4 h-4 text-slate-600 mt-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/50">
            <button
              onClick={handleSkip}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
