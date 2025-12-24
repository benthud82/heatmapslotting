import React, { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';

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
            const response = await fetch(`${API_URL}/api/layouts`, {
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
            const response = await fetch(`${API_URL}/api/elements?layout_id=${layoutId}`, {
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
        // Elements sorted first are considered "closer" to start/cart parking
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

        // 3. Generate item-level CSV content
        const headers = ['item_id', 'location_id', 'element_name', 'date', 'pick_count'];
        const maxBasePicks = 150; // Max base picks for hottest items in closest elements

        const allRows: string[] = [];
        let itemCounter = 1;

        // For each element, generate 8-10 locations with items
        sortedNames.forEach((elementName, elementIndex) => {
            // Calculate element-level gradient (closer = higher base, farther = lower base)
            // This creates the natural heatmap gradient
            const distanceProgress = elementIndex / (sortedNames.length - 1 || 1);
            const elementMultiplier = 1 - (distanceProgress * 0.7); // 1.0 for closest, 0.3 for farthest

            // Generate 8-10 locations per element
            const numLocations = 8 + Math.floor(Math.random() * 3);

            for (let locIndex = 0; locIndex < numLocations; locIndex++) {
                const locationId = `LOC-${elementName}-${String(locIndex + 1).padStart(2, '0')}`;
                const itemId = `SKU-${String(itemCounter++).padStart(3, '0')}`;

                // Assign velocity tier with significant variation WITHIN each element
                // This creates reslotting opportunities
                const tierRoll = Math.random();
                let itemMultiplier: number;

                if (tierRoll < 0.2) {
                    // HOT (20%): High velocity - 0.8 to 1.5x base
                    itemMultiplier = 0.8 + Math.random() * 0.7;
                } else if (tierRoll < 0.5) {
                    // WARM (30%): Medium velocity - 0.25 to 0.55x base
                    itemMultiplier = 0.25 + Math.random() * 0.3;
                } else {
                    // COLD (50%): Low velocity - 0.02 to 0.15x base
                    itemMultiplier = 0.02 + Math.random() * 0.13;
                }

                // Generate picks for each date
                dates.forEach(date => {
                    // Daily variation ±20%
                    const dailyVariation = 0.8 + Math.random() * 0.4;

                    // Calculate final pick count
                    const picks = Math.max(1, Math.floor(
                        maxBasePicks * elementMultiplier * itemMultiplier * dailyVariation
                    ));

                    allRows.push([itemId, locationId, elementName, date, picks].join(','));
                });
            }
        });

        const csvContent = [headers.join(','), ...allRows].join('\n');

        // 4. Trigger Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `test_item_picks_8days_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading layouts...</div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Select Warehouse Layout</h2>
                <p className="mt-2 text-slate-400">
                    Choose the layout you want to upload pick data for. We'll validate your file against the elements in this layout.
                </p>
            </div>

            <div className="max-w-md mx-auto">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Warehouse Layout
                </label>
                <select
                    value={selectedLayoutId}
                    onChange={(e) => setSelectedLayoutId(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-800 text-white border border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="" className="text-slate-500">Select a layout...</option>
                    {layouts.map((layout) => (
                        <option key={layout.id} value={layout.id} className="text-white bg-slate-800">
                            {layout.name}
                        </option>
                    ))}
                </select>
            </div>

            {selectedLayoutId && (
                <>
                    {/* Empty Layout Warning */}
                    {!loadingElements && elementNames.length === 0 && (
                        <div className="p-6 bg-amber-900/20 rounded-lg border-2 border-amber-500/50 max-w-2xl mx-auto">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                    <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-amber-400 text-lg mb-2">Your Layout is Empty</h4>
                                    <p className="text-amber-200/80 mb-4">
                                        You need to create warehouse elements (bays, flow racks, pallets) in the Designer before you can upload pick data.
                                        Each row in your CSV file maps to an element in your layout.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <a
                                            href="/designer"
                                            className="inline-flex items-center px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                                        >
                                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Go to Designer
                                        </a>
                                        <span className="text-sm text-amber-500">Create elements first, then return here to upload data</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Layout Summary (only show if elements exist) */}
                    {!loadingElements && elementNames.length > 0 && (
                        <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800/50 max-w-2xl mx-auto">
                            <h4 className="font-medium text-blue-400 mb-2">Layout Summary</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-blue-300">Total Elements:</span>
                                    <span className="ml-2 font-semibold text-blue-100">
                                        {elementNames.length}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-blue-300">Example Names:</span>
                                    <span className="ml-2 text-blue-100">
                                        {elementNames.slice(0, 3).join(', ') + (elementNames.length > 3 ? '...' : '')}
                                    </span>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-blue-400">
                                * Your CSV "element_name" column must match these element labels exactly.
                            </p>

                            <div className="mt-4 pt-4 border-t border-blue-800/50">
                                <div className="bg-gradient-to-r from-emerald-900/20 to-green-900/20 border-2 border-emerald-500/30 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0">
                                            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h5 className="font-semibold text-emerald-400 mb-1">Need Sample Data?</h5>
                                            <p className="text-sm text-emerald-200/70 mb-3">
                                                Generate a test CSV file with all {elementNames.length} elements, 8 days of sample pick data, and proper formatting.
                                            </p>
                                            <button
                                                onClick={generateTestCSV}
                                                className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
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
                </>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                <button
                    onClick={onBack}
                    className="px-4 py-2 text-slate-300 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Back
                </button>

                <button
                    onClick={handleContinue}
                    disabled={!selectedLayoutId || elementNames.length === 0}
                    className={`px-6 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            ${(!selectedLayoutId || elementNames.length === 0)
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500'}`}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
