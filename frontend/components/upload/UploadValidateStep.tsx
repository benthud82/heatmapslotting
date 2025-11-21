import React, { useState, useCallback } from 'react';
import { validateCSV, ValidationResult } from '@/lib/csvValidation';
import CSVPreviewTable from './CSVPreviewTable';
import ValidationSummary from './ValidationSummary';

interface UploadValidateStepProps {
    validElementNames: Set<string>;
    elementNames: string[]; // Array of element names for test CSV generation
    onNext: (file: File, validationResult: ValidationResult) => void;
    onBack: () => void;
}

export default function UploadValidateStep({ validElementNames, elementNames, onNext, onBack }: UploadValidateStepProps) {
    const [file, setFile] = useState<File | null>(null);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    const generateTestCSV = () => {
        if (elementNames.length === 0) return;

        // 1. Custom Sort: Reverse Alpha (Z-A), then Ascending Numeric
        const sortedNames = [...elementNames].sort((a, b) => {
            const aMatch = a.match(/^([A-Za-z]+)(\d+)$/);
            const bMatch = b.match(/^([A-Za-z]+)(\d+)$/);

            if (!aMatch || !bMatch) {
                return a.localeCompare(b);
            }

            const [, aLetter, aNum] = aMatch;
            const [, bLetter, bNum] = bMatch;

            const letterCompare = bLetter.localeCompare(aLetter, undefined, { sensitivity: 'base' });
            if (letterCompare !== 0) return letterCompare;

            return parseInt(aNum, 10) - parseInt(bNum, 10);
        });

        // 2. Generate Dates (8 days, weekdays only, backwards from today)
        const dates: string[] = [];
        let currentDate = new Date();
        while (dates.length < 8) {
            const day = currentDate.getDay();
            if (day !== 0 && day !== 6) {
                dates.push(currentDate.toISOString().split('T')[0]);
            }
            currentDate.setDate(currentDate.getDate() - 1);
        }

        // 3. Generate CSV content with gradient + randomization
        const headers = ['element_name', 'date', 'pick_count'];
        const maxPicks = 1000;
        const minPicks = 100;

        const allRows: string[] = [];

        dates.forEach(date => {
            const dayRows = sortedNames.map((name, index) => {
                const progress = index / (sortedNames.length - 1 || 1);
                const basePicks = Math.round(maxPicks - (progress * (maxPicks - minPicks)));

                const variation = basePicks * 0.2;
                const randomOffset = (Math.random() * 2 - 1) * variation;
                const pickCount = Math.max(minPicks, Math.round(basePicks + randomOffset));

                return [name, date, pickCount].join(',');
            });
            allRows.push(...dayRows);
        });

        const csvContent = [headers.join(','), ...allRows].join('\n');

        // 4. Trigger Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `test_data_8days_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFile = async (file: File) => {
        setFile(file);
        setIsValidating(true);
        try {
            const result = await validateCSV(file, validElementNames);
            setValidationResult(result);
        } catch (error) {
            console.error('Validation error:', error);
            // Handle error state
        } finally {
            setIsValidating(false);
        }
    };

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleContinue = () => {
        if (file && validationResult?.isValid) {
            onNext(file, validationResult);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Upload & Validate</h2>
                <p className="mt-2 text-gray-600">
                    Drag and drop your CSV file here. We'll check every row for errors.
                </p>
            </div>

            {/* Generate Test CSV Section */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-5">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h5 className="font-semibold text-green-900 mb-1">Need Sample Data?</h5>
                        <p className="text-sm text-green-700 mb-3">
                            Generate a test CSV file with all {elementNames.length} elements, 8 days of sample pick data, and proper formatting.
                        </p>
                        <button
                            onClick={generateTestCSV}
                            className="inline-flex items-center px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Generate Test CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Drop Zone */}
            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
          ${file ? 'bg-white' : ''}`}
            >
                {!file ? (
                    <div className="text-center">
                        <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">
                            <label htmlFor="csv-file-input" className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                                Click to upload
                            </label>
                            <input id="csv-file-input" type="file" accept=".csv" className="hidden" onChange={onFileSelect} />
                            {' '}or drag and drop
                        </p>
                        <p className="mt-1 text-xs text-gray-500">CSV files only</p>
                    </div>
                ) : (
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l4 4a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                            onClick={() => { setFile(null); setValidationResult(null); }}
                            className="p-1 text-gray-400 hover:text-red-500"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Validation Results */}
            {isValidating && (
                <div className="py-8 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                    <p className="mt-2 text-sm text-gray-500">Validating file...</p>
                </div>
            )}

            {validationResult && !isValidating && (
                <div className="space-y-6 animate-fade-in">
                    <ValidationSummary validationResult={validationResult} />

                    <div>
                        <h4 className="mb-2 text-sm font-medium text-gray-700">Data Preview</h4>
                        <CSVPreviewTable rows={validationResult.rows} />
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button
                    onClick={onBack}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Back
                </button>

                <button
                    onClick={handleContinue}
                    disabled={!file || !validationResult?.isValid}
                    className={`px-6 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            ${(!file || !validationResult?.isValid)
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
