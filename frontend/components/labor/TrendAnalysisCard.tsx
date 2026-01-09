'use client';

interface ChartDataPoint {
  date: string;
  efficiency: number | null;
  picks: number;
}

interface TrendData {
  hasData: boolean;
  rollingAvg7Day: number | null;
  weekOverWeekChange: number | null;
  bestDay: {
    date: string;
    efficiency: number;
    picks: number;
  } | null;
  worstDay: {
    date: string;
    efficiency: number;
    picks: number;
  } | null;
  trend: 'improving' | 'declining' | 'stable' | null;
  dataPoints: number;
  chartData: ChartDataPoint[];
}

interface TrendAnalysisCardProps {
  data: TrendData | null;
  targetEfficiency?: number;
  loading?: boolean;
}

export default function TrendAnalysisCard({
  data,
  targetEfficiency = 85,
  loading = false,
}: TrendAnalysisCardProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!data?.hasData) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-full">
        <h2 className="text-xl font-bold text-white mb-4">Efficiency Trend</h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 mb-3 rounded-full bg-slate-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">No performance data yet.</p>
          <p className="text-slate-500 text-xs mt-1">Record actual hours to see efficiency trends.</p>
        </div>
      </div>
    );
  }

  const { rollingAvg7Day, weekOverWeekChange, bestDay, worstDay, trend, dataPoints, chartData } = data;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get trend icon and color
  const getTrendDisplay = () => {
    if (trend === 'improving') {
      return { icon: '▲', color: 'text-emerald-400', label: 'Improving' };
    } else if (trend === 'declining') {
      return { icon: '▼', color: 'text-red-400', label: 'Declining' };
    }
    return { icon: '●', color: 'text-slate-400', label: 'Stable' };
  };

  const trendDisplay = getTrendDisplay();

  // Find max efficiency for chart scaling
  const maxEfficiency = Math.max(
    ...chartData.filter(d => d.efficiency !== null).map(d => d.efficiency as number),
    targetEfficiency,
    100
  );
  const chartHeight = 120;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Efficiency Trend</h2>
          <p className="text-sm text-slate-400">{dataPoints} data points</p>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
          trend === 'improving' ? 'bg-emerald-500/10 border border-emerald-500/30' :
          trend === 'declining' ? 'bg-red-500/10 border border-red-500/30' :
          'bg-slate-500/10 border border-slate-500/30'
        }`}>
          <span className={`text-sm ${trendDisplay.color}`}>{trendDisplay.icon}</span>
          <span className={`text-xs font-mono ${trendDisplay.color}`}>{trendDisplay.label}</span>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* 7-Day Average */}
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">7-Day Avg</p>
          <p className={`text-lg font-bold ${
            rollingAvg7Day && rollingAvg7Day >= targetEfficiency ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {rollingAvg7Day ? `${rollingAvg7Day.toFixed(0)}%` : '—'}
          </p>
        </div>

        {/* Week-over-Week */}
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">WoW Change</p>
          <p className={`text-lg font-bold ${
            weekOverWeekChange && weekOverWeekChange > 0 ? 'text-emerald-400' :
            weekOverWeekChange && weekOverWeekChange < 0 ? 'text-red-400' :
            'text-slate-400'
          }`}>
            {weekOverWeekChange !== null
              ? `${weekOverWeekChange > 0 ? '+' : ''}${weekOverWeekChange.toFixed(1)}%`
              : '—'}
          </p>
        </div>

        {/* Target */}
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Target</p>
          <p className="text-lg font-bold text-white">{targetEfficiency}%</p>
        </div>
      </div>

      {/* Simple Bar Chart */}
      <div className="flex-1 min-h-0">
        {chartData.length > 0 && (
          <div className="h-full flex flex-col">
            {/* Chart Area */}
            <div className="flex-1 relative" style={{ minHeight: chartHeight }}>
              {/* Target line */}
              <div
                className="absolute left-0 right-0 border-t border-dashed border-slate-600"
                style={{ bottom: `${(targetEfficiency / maxEfficiency) * 100}%` }}
              >
                <span className="absolute right-0 -top-3 text-xs text-slate-500">{targetEfficiency}%</span>
              </div>

              {/* Bars */}
              <div className="absolute inset-0 flex items-end gap-1">
                {chartData.map((point, i) => {
                  const height = point.efficiency !== null
                    ? (point.efficiency / maxEfficiency) * 100
                    : 0;
                  const isAboveTarget = point.efficiency !== null && point.efficiency >= targetEfficiency;

                  return (
                    <div
                      key={i}
                      className="flex-1 relative group"
                    >
                      <div
                        className={`w-full rounded-t transition-all ${
                          isAboveTarget ? 'bg-emerald-500' : 'bg-amber-500'
                        } hover:opacity-80`}
                        style={{ height: `${height}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-slate-700">
                        <p className="font-bold text-white">{formatDate(point.date)}</p>
                        <p className={isAboveTarget ? 'text-emerald-400' : 'text-amber-400'}>
                          {point.efficiency != null ? Number(point.efficiency).toFixed(0) : '—'}% efficiency
                        </p>
                        <p className="text-slate-400">{point.picks} picks</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between mt-2 text-xs text-slate-600">
              {chartData.length > 0 && (
                <>
                  <span>{formatDate(chartData[0].date)}</span>
                  <span>{formatDate(chartData[chartData.length - 1].date)}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Best/Worst Days */}
      {(bestDay || worstDay) && (
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800">
          {bestDay && (
            <div className="text-sm">
              <p className="text-xs text-slate-500 mb-1">Best Day</p>
              <p className="text-emerald-400 font-mono">
                {bestDay.efficiency.toFixed(0)}%
                <span className="text-slate-500 text-xs ml-1">{formatDate(bestDay.date)}</span>
              </p>
            </div>
          )}
          {worstDay && (
            <div className="text-sm">
              <p className="text-xs text-slate-500 mb-1">Needs Improvement</p>
              <p className="text-amber-400 font-mono">
                {worstDay.efficiency.toFixed(0)}%
                <span className="text-slate-500 text-xs ml-1">{formatDate(worstDay.date)}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-full animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="h-6 w-32 bg-slate-700 rounded mb-2" />
          <div className="h-4 w-24 bg-slate-700 rounded" />
        </div>
        <div className="h-6 w-20 bg-slate-700 rounded-full" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800/50 rounded-lg p-3">
            <div className="h-3 w-12 bg-slate-700 rounded mb-2" />
            <div className="h-5 w-10 bg-slate-700 rounded" />
          </div>
        ))}
      </div>

      <div className="h-32 bg-slate-800/30 rounded" />
    </div>
  );
}
