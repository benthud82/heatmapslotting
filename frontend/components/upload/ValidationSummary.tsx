import React from 'react';
import { ValidationResult, ItemValidationResult } from '@/lib/csvValidation';

interface ValidationSummaryProps {
    validationResult?: ValidationResult;
    itemValidationResult?: ItemValidationResult;
}

export default function ValidationSummary({ validationResult, itemValidationResult }: ValidationSummaryProps) {
    // Use item-level if available, otherwise element-level
    const isItemLevel = !!itemValidationResult;
    const stats = isItemLevel ? itemValidationResult!.stats : validationResult?.stats;
    const isValid = isItemLevel ? itemValidationResult!.isValid : validationResult?.isValid;

    if (!stats || stats.totalRows === 0) return null;

    return (
        <div className="space-y-4">
            {/* Format indicator */}
            <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-mono ${
                isItemLevel
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-700 text-slate-300 border border-slate-600'
            }`}>
                {isItemLevel ? 'Item-Level Format' : 'Element-Level Format'}
            </div>

            {/* Summary Cards */}
            <div className={`grid grid-cols-1 gap-4 ${isItemLevel ? 'sm:grid-cols-5' : 'sm:grid-cols-3'}`}>
                <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
                    <div className="text-sm font-medium text-slate-400">Total Rows</div>
                    <div className="mt-1 text-2xl font-semibold text-white tabular-nums">{stats.totalRows.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-slate-800 border border-emerald-500/30 rounded-lg">
                    <div className="text-sm font-medium text-emerald-400">Valid Rows</div>
                    <div className="mt-1 text-2xl font-semibold text-emerald-400 tabular-nums">{stats.validRows.toLocaleString()}</div>
                </div>
                <div className={`p-4 bg-slate-800 border rounded-lg ${stats.invalidRows > 0 ? 'border-red-500/30' : 'border-slate-700'}`}>
                    <div className={`text-sm font-medium ${stats.invalidRows > 0 ? 'text-red-400' : 'text-slate-400'}`}>Invalid Rows</div>
                    <div className={`mt-1 text-2xl font-semibold tabular-nums ${stats.invalidRows > 0 ? 'text-red-400' : 'text-slate-300'}`}>{stats.invalidRows.toLocaleString()}</div>
                </div>

                {/* Item-level specific stats */}
                {isItemLevel && itemValidationResult && (
                    <>
                        <div className="p-4 bg-slate-800 border border-cyan-500/30 rounded-lg">
                            <div className="text-sm font-medium text-cyan-400">Unique Items</div>
                            <div className="mt-1 text-2xl font-semibold text-cyan-400 tabular-nums">{itemValidationResult.stats.uniqueItems.toLocaleString()}</div>
                        </div>
                        <div className="p-4 bg-slate-800 border border-slate-600 rounded-lg">
                            <div className="text-sm font-medium text-slate-400">Unique Locations</div>
                            <div className="mt-1 text-2xl font-semibold text-white tabular-nums">{itemValidationResult.stats.uniqueLocations.toLocaleString()}</div>
                        </div>
                    </>
                )}
            </div>

            {/* Unmatched Elements Warning */}
            {stats.unmatchedElements.length > 0 && (
                <div className="p-4 border-l-4 border-amber-500 bg-amber-500/10 rounded-r-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-amber-300">
                                Some elements not found in layout
                            </h3>
                            <div className="mt-2 text-sm text-amber-200/80">
                                <p className="mb-2">
                                    The following element names don&apos;t match your warehouse layout. Rows with these elements will be skipped during upload.
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {stats.unmatchedElements.map((name, i) => (
                                        <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Message */}
            {isValid && (
                <div className="p-4 border-l-4 border-emerald-500 bg-emerald-500/10 rounded-r-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-emerald-300">
                                Validation successful! {isItemLevel && itemValidationResult
                                    ? `${itemValidationResult.stats.uniqueItems} items across ${itemValidationResult.stats.uniqueLocations} locations ready to be uploaded.`
                                    : 'All rows are ready to be uploaded.'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
