import React, { useState, useEffect, useCallback } from 'react';
import { validateCSV, ValidationResult } from '@/lib/csvValidation';
import { API_URL } from '@/lib/api';
import ValidationSummary from './upload/ValidationSummary';
import Link from 'next/link';

interface QuickUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface Layout {
    id: string;
    name: string;
}

export default function QuickUploadModal({ isOpen, onClose, onSuccess }: QuickUploadModalProps) {
    const [layouts, setLayouts] = useState<Layout[]>([]);
    const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
    const [validElementNames, setValidElementNames] = useState<Set<string>>(new Set());

    const [file, setFile] = useState<File | null>(null);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchLayouts();
        } else {
            // Reset state on close
            setFile(null);
            setValidationResult(null);
            setUploadError(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedLayoutId) {
            fetchLayoutElements(selectedLayoutId);
        }
    }, [selectedLayoutId]);

    const fetchLayouts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/layouts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setLayouts(data);
                if (data.length === 1) setSelectedLayoutId(data[0].id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchLayoutElements = async (layoutId: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/elements?layout_id=${layoutId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                // Handle paginated response format
                const elements = result.data || result;
                setValidElementNames(new Set(elements.map((el: any) => el.label.toLowerCase())));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleFile = async (file: File) => {
        setFile(file);
        setIsValidating(true);
        try {
            const result = await validateCSV(file, validElementNames);
            setValidationResult(result);
        } catch (error) {
            console.error(error);
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

    const handleUpload = async () => {
        if (!file || !selectedLayoutId) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            // Note: Backend currently infers layout from user, but we might want to pass it explicitly if multiple layouts supported
            // For now, we assume the backend uses the user's layout. If we need to support multiple, we'd need to update backend.
            // But wait, the backend DOES look up layout by user_id. 
            // "const layoutResult = await query('SELECT id FROM layouts WHERE user_id = $1', [userId]);"
            // So selecting layout in frontend is mostly for validation context unless we update backend to accept layout_id.
            // Given the current backend, it only supports one layout per user effectively for upload?
            // "UNIQUE(user_id) -- One layout per user" in migrate.sql confirms this.
            // So selectedLayoutId is mainly for fetching the correct elements for validation.

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/picks/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Upload failed');

            onSuccess();
            onClose();
        } catch (error: any) {
            setUploadError(error.message);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    Quick Upload Picks
                                </h3>

                                <div className="mt-4 space-y-4">
                                    {/* Layout Selector (Hidden if only 1, but good to have logic) */}
                                    {layouts.length > 1 && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Layout</label>
                                            <select
                                                value={selectedLayoutId}
                                                onChange={(e) => setSelectedLayoutId(e.target.value)}
                                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                            >
                                                <option value="">Select Layout</option>
                                                {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {/* Drop Zone */}
                                    <div
                                        onDragOver={onDragOver}
                                        onDragLeave={onDragLeave}
                                        onDrop={onDrop}
                                        className={`mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors
                      ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                      ${file ? 'border-green-500 bg-green-50' : ''}`}
                                    >
                                        <div className="space-y-1 text-center">
                                            {!file ? (
                                                <>
                                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    <div className="flex text-sm text-gray-600">
                                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                            <span>Upload a file</span>
                                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                                                        </label>
                                                        <p className="pl-1">or drag and drop</p>
                                                    </div>
                                                    <p className="text-xs text-gray-500">CSV up to 5MB</p>
                                                </>
                                            ) : (
                                                <div className="text-sm text-gray-900">
                                                    <p className="font-medium">{file.name}</p>
                                                    <button onClick={() => { setFile(null); setValidationResult(null); }} className="text-red-600 hover:text-red-800 text-xs mt-1">Remove</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Validation Status */}
                                    {isValidating && <p className="text-sm text-gray-500">Validating...</p>}

                                    {validationResult && (
                                        <div className="mt-2">
                                            {/* Condensed Summary */}
                                            <div className={`text-sm p-2 rounded ${validationResult.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {validationResult.isValid
                                                    ? `✓ Validated ${validationResult.stats.totalRows} rows.`
                                                    : `⚠ Found ${validationResult.stats.invalidRows} errors.`}
                                            </div>
                                            {!validationResult.isValid && (
                                                <div className="mt-2 max-h-32 overflow-y-auto text-xs text-red-600">
                                                    {validationResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                                                    {validationResult.stats.unmatchedElements.length > 0 && (
                                                        <div>Unmatched: {validationResult.stats.unmatchedElements.join(', ')}</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {uploadError && (
                                        <div className="p-2 bg-red-100 text-red-700 text-sm rounded">
                                            Error: {uploadError}
                                        </div>
                                    )}

                                    <div className="text-xs text-right">
                                        <Link href="/upload" className="text-blue-600 hover:underline">
                                            Need help? Go to full wizard
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            disabled={!file || !validationResult?.isValid || isUploading}
                            onClick={handleUpload}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? 'Uploading...' : 'Upload'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
