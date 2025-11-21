import React, { useEffect, useState } from 'react';

interface Layout {
    id: string;
    name: string;
    canvas_width: number;
    canvas_height: number;
}

interface LayoutSelectStepProps {
    onNext: (layoutId: string, elementNames: Set<string>) => void;
    onBack: () => void;
}

export default function LayoutSelectStep({ onNext, onBack }: LayoutSelectStepProps) {
    const [layouts, setLayouts] = useState<Layout[]>([]);
    const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [elementNames, setElementNames] = useState<string[]>([]);
    const [loadingElements, setLoadingElements] = useState(false);

    useEffect(() => {
        fetchLayouts();
    }, []);

    useEffect(() => {
        if (selectedLayoutId) {
            fetchLayoutElements(selectedLayoutId);
        } else {
            setElementNames([]);
        }
    }, [selectedLayoutId]);

    const fetchLayouts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/layouts', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch layouts');

            const data = await response.json();
            // Ensure data is an array - if API returns a single object, wrap it
            const layoutsArray = Array.isArray(data) ? data : [data];
            setLayouts(layoutsArray);

            // Auto-select if only one layout
            if (layoutsArray.length === 1) {
                setSelectedLayoutId(layoutsArray[0].id);
            }
        } catch (err) {
            setError('Could not load layouts. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchLayoutElements = async (layoutId: string) => {
        setLoadingElements(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3001/api/elements?layout_id=${layoutId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch elements');

            const data = await response.json();
            // Filter out non-slottable elements (text, lines, arrows)
            const slottableElements = data.filter((el: any) =>
                !['text', 'line', 'arrow'].includes(el.element_type)
            );

            // Extract just the labels/names
            const names = slottableElements.map((el: any) => el.label).sort();
            setElementNames(names);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingElements(false);
        }
    };

    const handleContinue = () => {
        if (selectedLayoutId && elementNames.length > 0) {
            onNext(selectedLayoutId, new Set(elementNames.map(n => n.toLowerCase())));
        }
    };

    const generateTestCSV = () => {
        if (elementNames.length === 0) return;

        // 1. Custom Sort: Reverse Alpha (Z-A), then Ascending Numeric
        // This sorts: Pallet (P), Flow (F), Bin (B) when letters are reversed
        const sortedNames = [...elementNames].sort((a, b) => {
            // Extract letter and number parts
            const aMatch = a.match(/^([A-Za-z]+)(\d+)$/);
            const bMatch = b.match(/^([A-Za-z]+)(\d+)$/);

            if (!aMatch || !bMatch) {
                // Fallback to standard sort if pattern doesn't match
                return a.localeCompare(b);
            }

            const [, aLetter, aNum] = aMatch;
            const [, bLetter, bNum] = bMatch;

            // Compare letters in reverse (Z-A)
            const letterCompare = bLetter.localeCompare(aLetter, undefined, { sensitivity: 'base' });
            if (letterCompare !== 0) return letterCompare;

            // If letters are the same, compare numbers ascending
            return parseInt(aNum, 10) - parseInt(bNum, 10);
        });

        // 2. Generate Dates (8 days, weekdays only, backwards from today)
        const dates: string[] = [];
        let currentDate = new Date();
        while (dates.length < 8) {
            const day = currentDate.getDay();
            if (day !== 0 && day !== 6) { // Skip Sunday (0) and Saturday (6)
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
                // Calculate gradient: High to Low based on sorted position
                // First element gets maxPicks, last element gets minPicks
                const progress = index / (sortedNames.length - 1 || 1);
                const basePicks = Math.round(maxPicks - (progress * (maxPicks - minPicks)));

                // Add randomization: ±20% variation around the base
                const variation = basePicks * 0.2;
                const randomOffset = (Math.random() * 2 - 1) * variation; // Random value between -variation and +variation
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

    if (loading) return <div className="p-8 text-center">Loading layouts...</div>;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Select Warehouse Layout</h2>
                <p className="mt-2 text-gray-600">
                    Choose the layout you want to upload pick data for. We'll validate your file against the elements in this layout.
                </p>
            </div>

            <div className="max-w-md mx-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warehouse Layout
                </label>
                <select
                    value={selectedLayoutId}
                    onChange={(e) => setSelectedLayoutId(e.target.value)}
                    className="block w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="" className="text-gray-500">Select a layout...</option>
                    {layouts.map((layout) => (
                        <option key={layout.id} value={layout.id} className="text-gray-900">
                            {layout.name}
                        </option>
                    ))}
                </select>
            </div>

            {selectedLayoutId && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 max-w-2xl mx-auto">
                    <h4 className="font-medium text-blue-900 mb-2">Layout Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-blue-700">Total Elements:</span>
                            <span className="ml-2 font-semibold text-blue-900">
                                {loadingElements ? '...' : elementNames.length}
                            </span>
                        </div>
                        <div>
                            <span className="text-blue-700">Example Names:</span>
                            <span className="ml-2 text-blue-900">
                                {loadingElements ? '...' : elementNames.slice(0, 3).join(', ') + (elementNames.length > 3 ? '...' : '')}
                            </span>
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-blue-600">
                        * Your CSV "element_name" column must match these element labels exactly.
                    </p>

                    <div className="mt-4 pt-4 border-t border-blue-200">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4">
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
                    disabled={!selectedLayoutId || elementNames.length === 0}
                    className={`px-6 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            ${(!selectedLayoutId || elementNames.length === 0)
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
