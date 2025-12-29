'use client';

import { useState } from 'react';
import { PerformanceInput, PerformanceRecord, performanceApi } from '@/lib/laborApi';

interface PerformanceInputFormProps {
  layoutId: string;
  onSubmit: (record: PerformanceRecord) => void;
  onError: (error: string) => void;
}

export default function PerformanceInputForm({
  layoutId,
  onSubmit,
  onError,
}: PerformanceInputFormProps) {
  const [formData, setFormData] = useState<PerformanceInput>({
    performance_date: new Date().toISOString().split('T')[0],
    actual_picks: 0,
    actual_hours: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.actual_picks <= 0) {
      onError('Picks must be greater than 0');
      return;
    }
    if (formData.actual_hours <= 0) {
      onError('Hours must be greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      const record = await performanceApi.create(layoutId, formData);
      onSubmit(record);
      // Reset form
      setFormData({
        performance_date: new Date().toISOString().split('T')[0],
        actual_picks: 0,
        actual_hours: 0,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to record performance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-2">Record Actual Performance</h3>
      <p className="text-sm text-slate-400 mb-4">
        Input actual hours worked to calculate efficiency against standards
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-mono text-slate-300 mb-1">Date</label>
            <input
              type="date"
              value={formData.performance_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, performance_date: e.target.value }))
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              required
            />
          </div>

          {/* Actual Picks */}
          <div>
            <label className="block text-sm font-mono text-slate-300 mb-1">Actual Picks</label>
            <input
              type="number"
              value={formData.actual_picks || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  actual_picks: parseInt(e.target.value) || 0,
                }))
              }
              placeholder="0"
              min="1"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              required
            />
          </div>

          {/* Actual Hours */}
          <div>
            <label className="block text-sm font-mono text-slate-300 mb-1">Actual Hours</label>
            <input
              type="number"
              value={formData.actual_hours || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  actual_hours: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0.0"
              step="0.1"
              min="0.1"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Record will calculate efficiency based on current labor standards
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:cursor-not-allowed text-white font-mono text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Recording...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Record Performance
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
