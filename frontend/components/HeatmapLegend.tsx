'use client';

import React, { useMemo } from 'react';
import { getHeatmapGradientCSS, getHeatmapColor } from '@/lib/heatmapColors';

interface HeatmapLegendProps {
  minPicks: number;
  maxPicks: number;
  pickData?: Map<string, number>;
}

/**
 * Formats a number with comma separators for readability
 * @param num - Number to format
 * @returns Formatted string (e.g., "1,234")
 */
function formatNumber(num: number): string {
  return Math.round(num).toLocaleString('en-US');
}

const HeatmapLegend: React.FC<HeatmapLegendProps> = React.memo(({ minPicks, maxPicks, pickData }) => {
  // Calculate pick count values for 5 intervals (0%, 25%, 50%, 75%, 100%)
  const intervals = useMemo(() => {
    const range = maxPicks - minPicks;
    return [
      { percent: 100, picks: maxPicks, label: 'Max' },
      { percent: 75, picks: minPicks + range * 0.75, label: '75%' },
      { percent: 50, picks: minPicks + range * 0.5, label: '50%' },
      { percent: 25, picks: minPicks + range * 0.25, label: '25%' },
      { percent: 0, picks: minPicks, label: 'Min' },
    ];
  }, [minPicks, maxPicks]);

  // Don't render if no data
  if (!pickData || pickData.size === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-col items-start animate-in fade-in slide-in-from-right-4 duration-500"
      role="figure"
      aria-label="Pick intensity color scale"
    >
      {/* Title */}
      <div className="mb-4 pl-1">
        <h3 className="text-sm font-light tracking-widest text-slate-400 uppercase">
          Pick Intensity
        </h3>
      </div>

      {/* Legend Container */}
      <div className="relative flex items-center gap-4">
        {/* Gradient Bar */}
        <div className="relative">
          <div
            className="w-12 h-96 rounded-sm border border-slate-700/50 shadow-lg shadow-blue-500/5"
            style={{
              background: getHeatmapGradientCSS(),
            }}
          >
            {/* Subtle inner shadow for depth */}
            <div className="w-full h-full rounded-sm shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]" />
          </div>

          {/* Tick marks at intervals */}
          <div className="absolute inset-0 pointer-events-none">
            {intervals.map((interval, index) => {
              const yPosition = (100 - interval.percent) / 100 * 100;
              return (
                <div
                  key={interval.percent}
                  className="absolute left-full w-3 h-px bg-slate-600"
                  style={{
                    top: `${yPosition}%`,
                    transform: 'translateY(-50%)',
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Labels */}
        <div className="relative h-96 flex flex-col justify-between py-0">
          {intervals.map((interval, index) => (
            <div
              key={interval.percent}
              className="flex flex-col items-start animate-in fade-in slide-in-from-right-2"
              style={{
                animationDelay: `${index * 50}ms`,
                animationDuration: '400ms',
                animationFillMode: 'backwards',
              }}
            >
              {/* Pick count */}
              <div
                className="text-base font-mono font-medium text-slate-200 tabular-nums tracking-tight"
                style={{ fontFamily: "'JetBrains Mono', 'Consolas', 'Monaco', monospace" }}
              >
                {formatNumber(interval.picks)}
              </div>

              {/* Percentage label */}
              <div className="text-[10px] font-light text-slate-500 uppercase tracking-wider mt-0.5">
                {interval.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-6 pl-1 text-[10px] text-slate-600 uppercase tracking-widest">
        Picks/Location
      </div>
    </div>
  );
});

HeatmapLegend.displayName = 'HeatmapLegend';

export default HeatmapLegend;
