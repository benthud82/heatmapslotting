'use client';

import Modal from '@/components/Modal';
import { ROIRecommendation } from '@/lib/laborApi';

interface ROIDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: ROIRecommendation[];
}

export default function ROIDetailModal({
  isOpen,
  onClose,
  recommendations,
}: ROIDetailModalProps) {
  if (!isOpen) return null;

  // Sort by savings (highest first)
  const sortedRecommendations = [...recommendations].sort(
    (a, b) => b.dailySavingsDollars - a.dailySavingsDollars
  );

  // Calculate totals
  const totalWalkSavings = recommendations.reduce((sum, r) => sum + r.walkSavingsFeet, 0);
  const totalDailySavings = recommendations.reduce((sum, r) => sum + r.dailySavingsDollars, 0);

  return (
    <Modal
      title="Reslotting Recommendations"
      onClose={onClose}
      width="max-w-4xl"
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-sm rounded-lg transition-colors"
        >
          Close
        </button>
      }
    >
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700/50">
          <p className="text-xs font-mono text-slate-500 uppercase mb-1">Items to Move</p>
          <p className="text-2xl font-bold text-white">{recommendations.length}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700/50">
          <p className="text-xs font-mono text-slate-500 uppercase mb-1">Walk Savings</p>
          <p className="text-2xl font-bold text-white">
            {totalWalkSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })} ft/day
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700/50">
          <p className="text-xs font-mono text-slate-500 uppercase mb-1">Daily Savings</p>
          <p className="text-2xl font-bold text-emerald-400">${totalDailySavings.toFixed(2)}</p>
        </div>
      </div>

      {/* Recommendations Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="py-3 px-2 font-mono text-xs text-slate-500 uppercase">Priority</th>
              <th className="py-3 px-2 font-mono text-xs text-slate-500 uppercase">Item ID</th>
              <th className="py-3 px-2 font-mono text-xs text-slate-500 uppercase">Current</th>
              <th className="py-3 px-2 font-mono text-xs text-slate-500 uppercase">Recommended</th>
              <th className="py-3 px-2 font-mono text-xs text-slate-500 uppercase text-right">Walk Savings</th>
              <th className="py-3 px-2 font-mono text-xs text-slate-500 uppercase text-right">$/Day</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecommendations.map((rec, index) => (
              <tr
                key={rec.itemId}
                className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
              >
                <td className="py-3 px-2">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      index < 3
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {index + 1}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <div>
                    <p className="font-mono text-white">{rec.externalItemId}</p>
                    {rec.itemDescription && (
                      <p className="text-xs text-slate-500 truncate max-w-[150px]">
                        {rec.itemDescription}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div>
                    <p className="text-slate-300">{rec.currentElement}</p>
                    <p className="text-xs text-slate-500">
                      {rec.currentDistance.toFixed(0)} ft from parking
                    </p>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div>
                    <p className="text-emerald-400">{rec.recommendedElement}</p>
                    <p className="text-xs text-slate-500">
                      {rec.recommendedDistance.toFixed(0)} ft from parking
                    </p>
                  </div>
                </td>
                <td className="py-3 px-2 text-right">
                  <span className="text-white">
                    {rec.walkSavingsFeet.toFixed(0)} ft
                  </span>
                </td>
                <td className="py-3 px-2 text-right">
                  <span className="text-emerald-400 font-bold">
                    ${rec.dailySavingsDollars.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-700 bg-slate-800/30">
              <td colSpan={4} className="py-3 px-2 font-bold text-white text-right">
                Total Daily Savings:
              </td>
              <td className="py-3 px-2 text-right font-bold text-white">
                {totalWalkSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })} ft
              </td>
              <td className="py-3 px-2 text-right font-bold text-emerald-400">
                ${totalDailySavings.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <p className="text-xs text-slate-500">
          Recommendations are sorted by daily savings impact. Items marked with green priority numbers
          provide the highest return on relocation effort.
        </p>
      </div>
    </Modal>
  );
}
