'use client';

import { useState, useRef, DragEvent } from 'react';
import { picksApi } from '@/lib/api';
import { UploadPicksError } from '@/lib/types';

interface UploadPicksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  layoutId: string;
}

export default function UploadPicksModal({ isOpen, onClose, onSuccess, layoutId }: UploadPicksModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<UploadPicksError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setValidationError(null);
    setSuccess(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setValidationError(null);
    setSuccess(null);

    try {
      const response = await picksApi.uploadCSV(file, layoutId);

      // Build success message
      let successMessage = `Successfully uploaded ${response.rowsProcessed} rows of pick data`;

      // Add warning if there were unmatched elements
      if (response.warnings?.unmatchedElements && response.warnings.unmatchedElements.length > 0) {
        successMessage += `. Note: ${response.warnings.unmatchedElements.length} element(s) were not found in your layout and were skipped.`;
      }

      setSuccess(successMessage);
      setFile(null);

      // If there are warnings, show them briefly before closing
      const delay = response.warnings ? 3000 : 1500;

      // Call onSuccess after a short delay to show success message
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, delay);
    } catch (err: any) {
      console.error('Upload error:', err);

      // Check if it's a validation error with unmatched elements
      if (err.unmatchedElements) {
        setValidationError(err);
      } else if (err.details) {
        setValidationError(err);
      } else if (err.error) {
        setError(err.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to upload file. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setValidationError(null);
    setSuccess(null);
    setIsDragging(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Upload Pick Data</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            disabled={uploading}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Instructions */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold text-blue-900 mb-2">CSV Format Requirements</h3>
            <p className="text-sm text-blue-800 mb-2">
              Your CSV file must include the following columns:
            </p>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 ml-2">
              <li><code className="bg-blue-100 px-1 rounded">element_name</code> - Must match existing warehouse element labels exactly</li>
              <li><code className="bg-blue-100 px-1 rounded">date</code> - Format: YYYY-MM-DD (e.g., 2024-01-15)</li>
              <li><code className="bg-blue-100 px-1 rounded">pick_count</code> - Number of picks (positive integer)</li>
            </ul>
            <p className="text-sm text-blue-800 mt-2">
              Example: <code className="bg-blue-100 px-1 rounded">B1,2024-01-15,250</code>
            </p>
          </div>

          {/* File Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              ${file ? 'bg-green-50 border-green-400' : ''}
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {file ? (
              <div>
                <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <div>
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">CSV files only</p>
              </div>
            )}
          </div>

          {/* Error Messages */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          {validationError && validationError.unmatchedElements && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800 font-medium mb-2">{validationError.error}</p>
              {validationError.message && (
                <p className="text-sm text-red-700 mb-2">{validationError.message}</p>
              )}
              <p className="text-sm text-red-700 mb-2">Unmatched elements:</p>
              <ul className="text-sm text-red-700 list-disc list-inside ml-2 max-h-32 overflow-y-auto">
                {validationError.unmatchedElements.map((el, i) => (
                  <li key={i}><code className="bg-red-100 px-1 rounded">{el}</code></li>
                ))}
              </ul>
            </div>
          )}

          {validationError && validationError.details && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800 font-medium mb-2">{validationError.error}</p>
              <ul className="text-sm text-red-700 list-disc list-inside ml-2 max-h-32 overflow-y-auto">
                {validationError.details.map((detail, i) => (
                  <li key={i}>{detail}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 font-medium">{success}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
