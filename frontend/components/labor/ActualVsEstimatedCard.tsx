'use client';

import { useState } from 'react';

interface ActualVsEstimatedCardProps {
  estimatedHours: number | null;
  totalPicks: number | null;
  targetEfficiency?: number;
  loading?: boolean;
  onRecordPerformance?: (data: { date: string; actualPicks: number; actualHours: number }) => Promise<void>;
}

export default function ActualVsEstimatedCard({
  estimatedHours,
  totalPicks,
  targetEfficiency = 85,
  loading = false,
  onRecordPerformance,
}: ActualVsEstimatedCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    actualPicks: totalPicks?.toString() || '',
    actualHours: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate efficiency preview
  const previewEfficiency = formData.actualHours && estimatedHours && parseFloat(formData.actualHours) > 0
    ? (estimatedHours / parseFloat(formData.actualHours)) * 100
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRecordPerformance) return;

    setError(null);
    setSubmitting(true);

    try {
      await onRecordPerformance({
        date: formData.date,
        actualPicks: parseInt(formData.actualPicks),
        actualHours: parseFloat(formData.actualHours),
      });
      setShowForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        actualPicks: totalPicks?.toString() || '',
        actualHours: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record performance');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      <h2 className="text-xl font-bold text-white mb-4">Actual vs Estimated</h2>

      {/* Estimated vs Actual Comparison */}
      <div className="flex-1">
        {/* Estimated */}
        <div className="mb-4">
          <p className="text-xs font-mono text-slate-500 uppercase mb-2">Estimated (from standards)</p>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold text-cyan-400">
                {estimatedHours?.toFixed(1) || '—'}
                <span className="text-sm font-normal text-slate-500 ml-1">hrs</span>
              </p>
              {totalPicks && (
                <p className="text-sm text-slate-500">
                  for {totalPicks.toLocaleString()} picks
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Record Actual Form Toggle */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Record Actual Hours
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-mono text-slate-500 uppercase block mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-500 uppercase block mb-1">Actual Picks</label>
              <input
                type="number"
                value={formData.actualPicks}
                onChange={(e) => setFormData({ ...formData, actualPicks: e.target.value })}
                placeholder={totalPicks?.toString() || '0'}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                min="0"
                required
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-500 uppercase block mb-1">Actual Hours Worked</label>
              <input
                type="number"
                step="0.1"
                value={formData.actualHours}
                onChange={(e) => setFormData({ ...formData, actualHours: e.target.value })}
                placeholder="8.0"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                min="0.1"
                required
              />
            </div>

            {/* Efficiency Preview */}
            {previewEfficiency !== null && (
              <div className={`p-3 rounded-lg ${
                previewEfficiency >= targetEfficiency
                  ? 'bg-emerald-900/20 border border-emerald-700/30'
                  : 'bg-amber-900/20 border border-amber-700/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Calculated Efficiency</span>
                  <span className={`text-lg font-bold font-mono ${
                    previewEfficiency >= targetEfficiency ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {previewEfficiency.toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {previewEfficiency >= targetEfficiency
                    ? 'At or above target!'
                    : `Below ${targetEfficiency}% target`}
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 font-mono text-sm rounded-lg transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-sm rounded-lg transition-colors disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Info Text */}
      <p className="text-xs text-slate-600 text-center mt-4">
        Efficiency = Estimated Hours / Actual Hours
      </p>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-full animate-pulse">
      <div className="h-6 w-36 bg-slate-700 rounded mb-4" />

      <div className="mb-4">
        <div className="h-3 w-24 bg-slate-700 rounded mb-2" />
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="h-8 w-20 bg-slate-700 rounded" />
        </div>
      </div>

      <div className="h-12 bg-slate-800 rounded-lg" />
    </div>
  );
}
