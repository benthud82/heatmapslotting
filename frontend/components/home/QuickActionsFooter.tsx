'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface QuickActionsFooterProps {
  enableKeyboardShortcuts?: boolean;
}

interface ActionConfig {
  href: string;
  label: string;
  shortcut: string;
  icon: JSX.Element;
  color: string;
  bgColor: string;
  borderColor: string;
}

const actions: ActionConfig[] = [
  {
    href: '/heatmap',
    label: 'View Heatmap',
    shortcut: 'H',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20',
    borderColor: 'border-cyan-500/30 hover:border-cyan-500/50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/designer',
    label: 'Open Designer',
    shortcut: 'D',
    color: 'text-slate-300',
    bgColor: 'bg-slate-700/50 hover:bg-slate-700',
    borderColor: 'border-slate-600/50 hover:border-slate-500',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    href: '/upload',
    label: 'Upload Data',
    shortcut: 'U',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
    borderColor: 'border-amber-500/30 hover:border-amber-500/50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
];

export function QuickActionsFooter({ enableKeyboardShortcuts = true }: QuickActionsFooterProps) {
  const router = useRouter();

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      const action = actions.find(a => a.shortcut === key);

      if (action) {
        e.preventDefault();
        router.push(action.href);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, router]);

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Quick Actions</h2>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">
              Keyboard shortcuts enabled
            </p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="text-sm text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
        >
          Full Dashboard
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`
              group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200
              ${action.bgColor} ${action.borderColor} ${action.color}
              active:scale-[0.98]
            `}
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              {action.icon}
            </div>

            {/* Label */}
            <div className="flex-1">
              <span className="font-mono font-bold">{action.label}</span>
            </div>

            {/* Keyboard shortcut */}
            <kbd className="hidden sm:flex items-center justify-center w-7 h-7 bg-slate-800/80 text-slate-400 text-xs font-mono rounded-lg border border-slate-700 group-hover:border-slate-600 group-hover:text-slate-300 transition-colors">
              {action.shortcut}
            </kbd>

            {/* Hover glow */}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </Link>
        ))}
      </div>

      {/* Shortcut hint */}
      <p className="mt-4 text-center text-xs text-slate-600">
        Press <kbd className="px-1 py-0.5 bg-slate-800 text-slate-500 rounded text-[10px]">H</kbd>{' '}
        <kbd className="px-1 py-0.5 bg-slate-800 text-slate-500 rounded text-[10px]">D</kbd>{' '}
        <kbd className="px-1 py-0.5 bg-slate-800 text-slate-500 rounded text-[10px]">U</kbd>{' '}
        to navigate quickly
      </p>
    </div>
  );
}
