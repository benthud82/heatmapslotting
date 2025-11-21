import React from 'react';

export default function CSVFormatGuide() {
    return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-gray-900">File Requirements</h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Column 1: element_name */}
                <div className="p-4 border border-blue-100 rounded-lg bg-blue-50">
                    <div className="flex items-center mb-2 space-x-2">
                        <div className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-blue-600 rounded-full">1</div>
                        <span className="font-mono text-sm font-bold text-blue-900">element_name</span>
                    </div>
                    <p className="mb-2 text-sm text-blue-800">
                        Must match your warehouse layout labels exactly.
                    </p>
                    <div className="p-2 text-xs text-gray-500 bg-white border border-blue-200 rounded">
                        <div className="font-medium text-green-600">✓ A-01-01</div>
                        <div className="font-medium text-red-500">✗ A0101 (No match)</div>
                    </div>
                </div>

                {/* Column 2: date */}
                <div className="p-4 border border-blue-100 rounded-lg bg-blue-50">
                    <div className="flex items-center mb-2 space-x-2">
                        <div className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-blue-600 rounded-full">2</div>
                        <span className="font-mono text-sm font-bold text-blue-900">date</span>
                    </div>
                    <p className="mb-2 text-sm text-blue-800">
                        Format as YYYY-MM-DD.
                    </p>
                    <div className="p-2 text-xs text-gray-500 bg-white border border-blue-200 rounded">
                        <div className="font-medium text-green-600">✓ 2024-01-15</div>
                        <div className="font-medium text-red-500">✗ 01/15/2024</div>
                    </div>
                </div>

                {/* Column 3: pick_count */}
                <div className="p-4 border border-blue-100 rounded-lg bg-blue-50">
                    <div className="flex items-center mb-2 space-x-2">
                        <div className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-blue-600 rounded-full">3</div>
                        <span className="font-mono text-sm font-bold text-blue-900">pick_count</span>
                    </div>
                    <p className="mb-2 text-sm text-blue-800">
                        Positive whole numbers only.
                    </p>
                    <div className="p-2 text-xs text-gray-500 bg-white border border-blue-200 rounded">
                        <div className="font-medium text-green-600">✓ 42</div>
                        <div className="font-medium text-red-500">✗ 42.5 or "Forty"</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
