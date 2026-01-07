'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useJourney } from '@/lib/journey';
import { ContextualHint as HintType } from '@/lib/journey/types';
import SpotlightPulse from './SpotlightPulse';

// Icons
const LightbulbIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

interface ContextualHintProps {
  hint: HintType;
}

export default function ContextualHint({ hint }: ContextualHintProps) {
  const journey = useJourney();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!journey) return null;

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      journey.dismissHint(hint.id);
    }, 200);
  };

  return (
    <>
      {/* Pulsing highlight on target element */}
      {hint.highlightTarget && (
        <SpotlightPulse
          targetSelector={hint.highlightTarget}
          show={isVisible && !isDismissing}
        />
      )}
      <div
        className={`
          relative flex items-start gap-3
          px-4 py-3 mb-4
          bg-gradient-to-r from-amber-500/[0.12] to-amber-400/[0.06]
          border border-amber-500/30
          rounded-xl
          transition-all duration-300 ease-out
          ${isVisible && !isDismissing
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-2'
          }
        `}
        style={{
          boxShadow: '0 0 20px -5px rgba(245, 158, 11, 0.15)',
        }}
      >
      {/* Subtle scanline effect */}
      <div
        className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)',
        }}
      />

      {/* Icon */}
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
        <LightbulbIcon />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm text-amber-100 leading-relaxed">
          {hint.message}
        </p>

        {hint.action && (
          <div className="mt-2">
            {hint.action.href ? (
              <Link
                href={hint.action.href}
                className="
                  inline-flex items-center gap-1.5
                  text-sm font-medium text-amber-400
                  hover:text-amber-300
                  transition-colors duration-200
                "
              >
                <span>{hint.action.label}</span>
                <ArrowRightIcon />
              </Link>
            ) : hint.action.onClick ? (
              <button
                onClick={hint.action.onClick}
                className="
                  inline-flex items-center gap-1.5
                  text-sm font-medium text-amber-400
                  hover:text-amber-300
                  transition-colors duration-200
                "
              >
                <span>{hint.action.label}</span>
                <ArrowRightIcon />
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="
          flex-shrink-0 p-1.5 -mr-1 -mt-0.5
          text-amber-400/40 hover:text-amber-300
          hover:bg-amber-500/10
          rounded-md
          transition-colors duration-200
        "
        title="Dismiss hint"
      >
        <CloseIcon />
      </button>
      </div>
    </>
  );
}

// Wrapper component that renders all active hints for a page
interface HintsContainerProps {
  page: string;
}

export function HintsContainer({ page }: HintsContainerProps) {
  const journey = useJourney();

  if (!journey || journey.loading) return null;

  const hints = journey.getActiveHints(page);

  if (hints.length === 0) return null;

  return (
    <div className="space-y-2">
      {hints.map((hint) => (
        <ContextualHint key={hint.id} hint={hint} />
      ))}
    </div>
  );
}
