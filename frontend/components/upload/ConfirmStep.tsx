import React, { useState } from 'react';
import { ValidationResult } from '@/lib/csvValidation';
import { API_URL } from '@/lib/api';
import Link from 'next/link';
import { useJourney } from '@/lib/journey';

interface ConfirmStepProps {
    file: File;
    layoutId: string;
    validationResult: ValidationResult;
    onBack: () => void;
    onUploadComplete: () => void;
}

export default function ConfirmStep({ file, layoutId, validationResult, onBack, onUploadComplete }: ConfirmStepProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [rowsProcessed, setRowsProcessed] = useState(0);
    const journey = useJourney();

    const handleUpload = async () => {
        setIsUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('layoutId', layoutId);

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/picks/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setRowsProcessed(data.rowsProcessed);
            setIsSuccess(true);
            onUploadComplete();
            // Track pick_data_uploaded milestone
            if (journey && !journey.progress.completedMilestones.includes('pick_data_uploaded')) {
                journey.markMilestone('pick_data_uploaded');
            }
        } catch (error: any) {
            setUploadError(error.message || 'An unexpected error occurred');
        } finally {
            setIsUploading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="text-center py-12 animate-fade-in">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-emerald-500/20 rounded-full">
                    <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-3xl font-bold text-white">Upload Complete!</h2>
                <p className="mt-4 text-lg text-slate-400">
                    Successfully processed <span className="font-semibold text-white">{rowsProcessed}</span> pick records.
                </p>

                <div className="mt-8 flex justify-center space-x-4">
                    <Link href="/heatmap" className="px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-900/20">
                        View Heatmap
                    </Link>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 text-slate-300 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                        Upload Another File
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Confirm Upload</h2>
                <p className="mt-2 text-slate-400">
                    Review the summary below before finalizing your import.
                </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-900/30 rounded-lg">
                            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-white">{file.name}</h3>
                            <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400 mb-1">Total Records</p>
                        <p className="text-2xl font-bold text-white">{validationResult.rows.length.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400 mb-1">Date Range</p>
                        <p className="text-lg font-semibold text-white">
                            {(() => {
                                const dates = validationResult.rows
                                    .filter(row => row.isValid && row.original.date)
                                    .map(row => row.original.date)
                                    .sort();

                                if (dates.length === 0) return 'N/A';
                                const minDate = dates[0];
                                const maxDate = dates[dates.length - 1];
                                return (
                                    <>
                                        {minDate} <span className="text-slate-600 mx-1">to</span> {maxDate}
                                    </>
                                );
                            })()}
                        </p>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400 mb-1">Total Picks</p>
                        <p className="text-2xl font-bold text-emerald-400">
                            {validationResult.rows.reduce((sum, row) => sum + (Number(row.original.pick_count) || 0), 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                {uploadError && (
                    <div className="px-6 pb-6">
                        <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-red-300 text-sm">{uploadError}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                <button
                    onClick={onBack}
                    disabled={isUploading}
                    className="px-4 py-2 text-slate-300 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    Back
                </button>

                <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    data-tour="confirm-upload"
                    className="inline-flex items-center px-6 py-2 text-white bg-emerald-600 rounded-md hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-wait shadow-lg shadow-emerald-900/20"
                >
                    {isUploading ? (
                        <>
                            <svg className="w-5 h-5 mr-2 -ml-1 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Processing...
                        </>
                    ) : (
                        'Confirm Upload'
                    )}
                </button>
            </div>
        </div>
    );
}
