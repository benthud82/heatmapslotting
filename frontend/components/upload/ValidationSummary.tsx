import React from 'react';
import { ValidationResult } from '@/lib/csvValidation';

interface ValidationSummaryProps {
    validationResult: ValidationResult;
}

export default function ValidationSummary({ validationResult }: ValidationSummaryProps) {
    const { stats, isValid } = validationResult;

    if (stats.totalRows === 0) return null;

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="text-sm font-medium text-gray-500">Total Rows</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalRows}</div>
                </div>
                <div className="p-4 bg-white border border-green-200 rounded-lg shadow-sm">
                    <div className="text-sm font-medium text-green-600">Valid Rows</div>
                    <div className="mt-1 text-2xl font-semibold text-green-700">{stats.validRows}</div>
                </div>
                <div className={`p-4 bg-white border rounded-lg shadow-sm ${stats.invalidRows > 0 ? 'border-red-200' : 'border-gray-200'}`}>
                    <div className={`text-sm font-medium ${stats.invalidRows > 0 ? 'text-red-600' : 'text-gray-500'}`}>Invalid Rows</div>
                    <div className={`mt-1 text-2xl font-semibold ${stats.invalidRows > 0 ? 'text-red-700' : 'text-gray-900'}`}>{stats.invalidRows}</div>
                </div>
            </div>

            {/* Unmatched Elements Warning */}
            {stats.unmatchedElements.length > 0 && (
                <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                                Some elements not found in layout
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <p className="mb-2">
                                    The following element names don't match your warehouse layout. Rows with these elements will be skipped during upload.
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {stats.unmatchedElements.map((name, i) => (
                                        <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
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
                <div className="p-4 border-l-4 border-green-500 bg-green-50">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-green-800">
                                Validation successful! All rows are ready to be uploaded.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
