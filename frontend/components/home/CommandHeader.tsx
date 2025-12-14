'use client';

import Link from 'next/link';

interface CommandHeaderProps {
  userName?: string;
  layoutCount: number;
  totalPicks: number;
  lastActivity?: string;
  loading?: boolean;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatLastActivity(dateStr?: string): string {
  if (!dateStr) return 'No recent activity';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function CommandHeader({
  userName,
  layoutCount,
  totalPicks,
  lastActivity,
  loading
}: CommandHeaderProps) {
  const greeting = getTimeGreeting();
  const displayName = userName || 'Commander';

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-slate-800 rounded-lg w-72 mb-3" />
        <div className="h-5 bg-slate-800/50 rounded w-96" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Greeting */}
      <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
        {greeting},{' '}
        <span className="text-cyan-400">{displayName}</span>
      </h1>

      {/* Status line */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-mono text-slate-400">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-slate-300">{layoutCount}</span> layout{layoutCount !== 1 ? 's' : ''}
        </span>
        <span className="text-slate-600">|</span>
        <span>
          <span className="text-slate-300">{totalPicks.toLocaleString()}</span> picks analyzed
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-500">
          Last sync: <span className="text-slate-400">{formatLastActivity(lastActivity)}</span>
        </span>
      </div>

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-3 mt-6">
        <Link
          href="/designer"
          className="group inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-sm rounded-lg hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Layout
          <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.5 text-xs bg-slate-800 text-slate-500 rounded">N</kbd>
        </Link>

        <Link
          href="/upload"
          className="group inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-sm rounded-lg hover:bg-amber-500/20 hover:border-amber-500/50 transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload Data
          <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.5 text-xs bg-slate-800 text-slate-500 rounded">U</kbd>
        </Link>
      </div>

      {/* Decorative accent line */}
      <div className="absolute -bottom-4 left-0 w-32 h-0.5 bg-gradient-to-r from-cyan-500 to-transparent" />
    </div>
  );
}
