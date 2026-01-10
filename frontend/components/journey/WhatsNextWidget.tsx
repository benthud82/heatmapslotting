'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useJourney, MILESTONES } from '@/lib/journey';

// Progress Circle Component
function ProgressCircle({ percent, size = 48 }: { percent: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.15)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-mono font-bold text-slate-200">
          {percent}%
        </span>
      </div>
    </div>
  );
}

// Icons
const CheckIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const MinimizeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const RocketIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>
);

export default function WhatsNextWidget() {
  const journey = useJourney();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!journey || journey.loading) return null;

  // Hide if not authenticated (e.g., on login page)
  if (!journey.isAuthenticated) return null;

  // Hide if onboarding is complete or dismissed
  if (journey.preferences.onboarding_completed || journey.preferences.onboarding_dismissed) {
    return null;
  }

  // Hide when all milestones complete
  if (journey.progress.progressPercent === 100) return null;

  const { progress } = journey;
  const completedSet = new Set(progress.completedMilestones);

  // Minimized pill view
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`
          fixed bottom-6 right-6 z-50
          flex items-center gap-3 px-4 py-2.5
          bg-slate-900/95 backdrop-blur-sm
          border border-slate-700/50
          rounded-full shadow-2xl shadow-black/50
          hover:border-amber-500/50 hover:shadow-amber-500/10
          transition-all duration-300 ease-out
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        `}
      >
        <ProgressCircle percent={progress.progressPercent} size={32} />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">
            {progress.currentStage}/{progress.totalStages}
          </span>
          <span className="text-xs text-slate-500">complete</span>
        </div>
        <div className="w-px h-4 bg-slate-700" />
        <RocketIcon />
      </button>
    );
  }

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50 w-80
        transition-all duration-500 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
      `}
    >
      <div className="relative bg-slate-900/95 backdrop-blur-sm border border-amber-500/30 rounded-xl shadow-2xl shadow-amber-900/20 overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <ProgressCircle percent={progress.progressPercent} size={44} />
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                Getting Started
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {progress.currentStage} of {progress.totalStages} milestones
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-md transition-colors"
              title="Minimize"
            >
              <MinimizeIcon />
            </button>
            <button
              onClick={() => journey.dismissOnboarding()}
              className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-md transition-colors"
              title="Dismiss"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative px-4 py-2 bg-slate-800/30">
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress.progressPercent}%`,
                background: 'linear-gradient(90deg, #f59e0b 0%, #10b981 100%)',
              }}
            />
          </div>
        </div>

        {/* Milestones List */}
        <ul className="relative p-2 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {MILESTONES.map((milestone, index) => {
            const isCompleted = completedSet.has(milestone.key);
            const isCurrent = !isCompleted && index === progress.currentStage;
            const isPending = !isCompleted && !isCurrent;

            return (
              <li
                key={milestone.key}
                className={`
                  relative
                  ${index !== MILESTONES.length - 1 ? 'mb-0.5' : ''}
                `}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <Link
                  href={milestone.href}
                  className={`
                    flex items-start gap-3 p-2.5 rounded-lg
                    transition-all duration-200
                    ${isCompleted
                      ? 'opacity-50'
                      : isCurrent
                        ? 'bg-slate-800/60 ring-1 ring-amber-500/30'
                        : 'hover:bg-slate-800/40'
                    }
                  `}
                >
                  {/* Status indicator */}
                  <div
                    className={`
                      relative w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      transition-all duration-300
                      ${isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isCurrent
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-600'
                      }
                    `}
                  >
                    {isCompleted && <CheckIcon />}
                    {isCurrent && (
                      <>
                        <div className="w-2 h-2 bg-amber-500 rounded-full" />
                        <div className="absolute inset-0 rounded-full bg-amber-500/30 animate-ping" />
                      </>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`
                        text-sm font-medium truncate
                        ${isCompleted
                          ? 'text-slate-400 line-through decoration-slate-600'
                          : isCurrent
                            ? 'text-slate-100'
                            : 'text-slate-300'
                        }
                      `}
                    >
                      {milestone.label}
                    </p>
                    <p
                      className={`
                        text-xs truncate mt-0.5
                        ${isPending ? 'text-slate-600' : 'text-slate-500'}
                      `}
                    >
                      {milestone.description}
                    </p>
                  </div>

                  {/* Arrow for current */}
                  {isCurrent && (
                    <div className="text-amber-400 mt-1">
                      <ChevronRightIcon />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Next Action CTA */}
        {progress.nextAction && (
          <div className="relative px-4 py-3 border-t border-slate-800/80 bg-slate-800/20">
            <Link
              href={progress.nextAction.href}
              className="
                group flex items-center justify-center gap-2
                w-full py-2.5 px-4
                bg-gradient-to-r from-amber-600 to-amber-500
                hover:from-amber-500 hover:to-amber-400
                text-white font-medium text-sm
                rounded-lg
                transition-all duration-200
                shadow-lg shadow-amber-500/20
                hover:shadow-amber-500/30
              "
            >
              <span>Next: {progress.nextAction.label}</span>
              <ChevronRightIcon />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
