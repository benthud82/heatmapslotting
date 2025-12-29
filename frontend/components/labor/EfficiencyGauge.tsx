'use client';

interface EfficiencyGaugeProps {
  efficiency: number | null;
  target: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function EfficiencyGauge({
  efficiency,
  target,
  size = 'md',
}: EfficiencyGaugeProps) {
  const sizeClasses = {
    sm: { container: 'w-24 h-24', text: 'text-xl', subtext: 'text-xs' },
    md: { container: 'w-32 h-32', text: 'text-3xl', subtext: 'text-sm' },
    lg: { container: 'w-40 h-40', text: 'text-4xl', subtext: 'text-base' },
  };

  const hasValue = efficiency !== null && !isNaN(efficiency);
  const displayValue = hasValue ? Math.round(efficiency) : null;

  // Determine color based on efficiency vs target
  const getColor = () => {
    if (!hasValue) return { stroke: 'stroke-slate-700', text: 'text-slate-500' };
    if (efficiency >= target) return { stroke: 'stroke-emerald-500', text: 'text-emerald-400' };
    if (efficiency >= target * 0.9) return { stroke: 'stroke-yellow-500', text: 'text-yellow-400' };
    return { stroke: 'stroke-red-500', text: 'text-red-400' };
  };

  const colors = getColor();

  // Calculate stroke-dasharray for progress
  const circumference = 2 * Math.PI * 45; // radius = 45
  const progress = hasValue ? Math.min(efficiency / 100, 1) : 0;
  const strokeDasharray = `${progress * circumference} ${circumference}`;

  // Calculate target position on the gauge
  const targetProgress = Math.min(target / 100, 1);
  const targetAngle = (targetProgress * 360 - 90) * (Math.PI / 180);
  const targetX = 50 + 45 * Math.cos(targetAngle);
  const targetY = 50 + 45 * Math.sin(targetAngle);

  return (
    <div className="relative flex flex-col items-center">
      <div className={`relative ${sizeClasses[size].container}`}>
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            className="stroke-slate-800"
          />

          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            className={`${colors.stroke} transition-all duration-700 ease-out`}
          />

          {/* Target indicator */}
          {hasValue && (
            <circle
              cx={targetX}
              cy={targetY}
              r="3"
              className="fill-slate-400"
            />
          )}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold font-mono ${sizeClasses[size].text} ${colors.text}`}>
            {displayValue !== null ? `${displayValue}%` : '—'}
          </span>
          {hasValue && (
            <span className={`${sizeClasses[size].subtext} text-slate-500`}>
              efficiency
            </span>
          )}
        </div>
      </div>

      {/* Target label */}
      <div className="mt-2 text-center">
        <span className="text-xs text-slate-500">
          Target: <span className="text-slate-400">{target}%</span>
        </span>
      </div>
    </div>
  );
}
