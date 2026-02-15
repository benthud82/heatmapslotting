'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WarehouseElement, RouteMarker } from '@/lib/types';
import {
  generatePickData,
  getDefaultDateRange,
  estimatePickCount,
} from '@/lib/pickDataGenerator';
import { picksApi } from '@/lib/api';

interface DoItForMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  layoutId: string;
  elements: WarehouseElement[];
  cartParkingSpots: RouteMarker[];
  canvasWidth: number;
  canvasHeight: number;
}

export default function DoItForMeModal({
  isOpen,
  onClose,
  layoutId,
  elements,
  cartParkingSpots,
  canvasWidth,
  canvasHeight,
}: DoItForMeModalProps) {
  const router = useRouter();

  // Get default date range (8 weekdays back from today)
  const defaultRange = useMemo(() => getDefaultDateRange(), []);

  const [startDate, setStartDate] = useState<string>(
    defaultRange.startDate.toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    defaultRange.endDate.toISOString().split('T')[0]
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter pickable elements
  const pickableElements = useMemo(
    () => elements.filter((el) => !['text', 'line', 'arrow'].includes(el.element_type)),
    [elements]
  );

  // Calculate date count (weekdays only)
  const dateCount = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }, [startDate, endDate]);

  // Estimate pick counts
  const estimate = useMemo(
    () => estimatePickCount(pickableElements.length, dateCount),
    [pickableElements.length, dateCount]
  );

  // Validate date range
  const dateValidation = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (start > end) {
      return { valid: false, message: 'Start date must be before end date' };
    }
    if (daysDiff > 90) {
      return { valid: false, message: 'Date range cannot exceed 90 days' };
    }
    if (dateCount === 0) {
      return { valid: false, message: 'Date range must include at least one weekday' };
    }

    return { valid: true, message: null };
  }, [startDate, endDate, dateCount]);

  const handleGenerate = async () => {
    if (!dateValidation.valid) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Generate the pick data
      const { picks, stats } = generatePickData({
        elements,
        cartParkingSpots,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        canvasWidth,
        canvasHeight,
      });

      if (picks.length === 0) {
        setError('No picks generated. Make sure your layout has slottable elements.');
        setIsGenerating(false);
        return;
      }

      // Upload to backend
      await picksApi.uploadGenerated(layoutId, picks);

      // Success - navigate to heatmap
      onClose();
      router.push('/heatmap');
    } catch (err: unknown) {
      console.error('Generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate demo data';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl border border-purple-500/30 shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/50 to-violet-900/50 px-6 py-4 border-b border-purple-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Do It For Me</h2>
              <p className="text-purple-300 text-sm">Auto-generate realistic pick data</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">{pickableElements.length}</div>
              <div className="text-xs text-slate-400">Elements</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">{dateCount}</div>
              <div className="text-xs text-slate-400">Days</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">
                {cartParkingSpots.length > 0 ? cartParkingSpots.length : '—'}
              </div>
              <div className="text-xs text-slate-400">Cart Spots</div>
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Date Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            {!dateValidation.valid && (
              <p className="text-red-400 text-sm">{dateValidation.message}</p>
            )}
          </div>

          {/* Estimate */}
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div>
                <div className="text-purple-300 font-medium">Estimated Output</div>
                <div className="text-sm text-purple-200/70 mt-1">
                  ~{estimate.estimatedPicks.toLocaleString()} pick records
                  <br />
                  ~{(pickableElements.length * 10).toLocaleString()} unique items/locations
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <div className="text-amber-300 font-medium">This will replace existing data</div>
                <div className="text-sm text-amber-200/70 mt-1">
                  Any existing pick data for this layout will be deleted before generating new demo data.
                </div>
              </div>
            </div>
          </div>

          {/* No Cart Parking Warning */}
          {cartParkingSpots.length === 0 && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-blue-300 font-medium">No cart parking defined</div>
                  <div className="text-sm text-blue-200/70 mt-1">
                    Distance calculations will use the canvas center. Add cart parking spots in the Designer for more realistic data.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-red-300 text-sm">{error}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!dateValidation.valid || isGenerating}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate &amp; Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
