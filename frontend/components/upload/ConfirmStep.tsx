import React, { useState } from 'react';
import { ValidationResult } from '@/lib/csvValidation';
import Link from 'next/link';

interface ConfirmStepProps {
    file: File;
    validationResult: ValidationResult;
    onBack: () => void;
    onUploadComplete: () => void;
}

export default function ConfirmStep({ file, validationResult, onBack, onUploadComplete }: ConfirmStepProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [rowsProcessed, setRowsProcessed] = useState(0);

    const handleUpload = async () => {
        setIsUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/picks/upload', {
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
        } catch (error: any) {
            setUploadError(error.message || 'An unexpected error occurred');
        } finally {
            setIsUploading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-green-100 rounded-full">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Upload Complete!</h2>
                <p className="mt-4 text-lg text-gray-600">
                    Successfully processed <span className="font-semibold text-gray-900">{rowsProcessed}</span> pick records.
                </p>

                <div className="mt-8 flex justify-center space-x-4">
                    <Link href="/heatmap" className="px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        View Heatmap
                    </Link>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                <h2 className="text-2xl font-bold text-gray-900">Ready to Upload?</h2>
                <p className="mt-2 text-gray-600">
                    Please review the summary below before finalizing your upload.
                </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900">Upload Summary</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">File Name</span>
                        <span className="font-medium text-gray-900">{file.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">File Size</span>
                        <span className="font-medium text-gray-900">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">Total Rows</span>
                        <span className="font-medium text-gray-900">{validationResult.stats.totalRows}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-gray-500">Date Range</span>
                        <span className="font-medium text-gray-900">
                            {(() => {
                                const dates = validationResult.rows
                                    .filter(row => row.isValid && row.original.date)
                                    .map(row => row.original.date)
                                    .sort();

                                if (dates.length === 0) return 'N/A';
                                if (dates.length === 1) return dates[0];

                                const minDate = dates[0];
                                const maxDate = dates[dates.length - 1];

                                return minDate === maxDate ? minDate : `${minDate} to ${maxDate}`;
                            })()}
                        </span>
                    </div>
                </div>
            </div>

            {uploadError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Upload Failed</h3>
                            <div className="mt-2 text-sm text-red-700">{uploadError}</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button
                    onClick={onBack}
                    disabled={isUploading}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    Back
                </button>

                <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="inline-flex items-center px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-wait"
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
