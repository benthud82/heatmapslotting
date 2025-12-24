'use client';

import React, { useState } from 'react';

type FormatType = 'item' | 'element';

export default function CSVFormatGuide() {
    const [formatType, setFormatType] = useState<FormatType>('item');

    return (
        <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">File Requirements</h3>
                <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1">
                    <button
                        onClick={() => setFormatType('item')}
                        className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                            formatType === 'item'
                                ? 'bg-cyan-500/30 text-cyan-300'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Item-Level (Recommended)
                    </button>
                    <button
                        onClick={() => setFormatType('element')}
                        className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                            formatType === 'element'
                                ? 'bg-slate-700 text-slate-300'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Element-Level (Legacy)
                    </button>
                </div>
            </div>

            {formatType === 'item' ? (
                <div className="space-y-4">
                    {/* Item-level description */}
                    <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                        <p className="text-sm text-cyan-300">
                            <span className="font-semibold">Item-level tracking</span> enables smarter reslotting recommendations by tracking picks at the individual item/SKU level. This format shows you which specific items are causing excess walking.
                        </p>
                    </div>

                    {/* CSV Preview Table */}
                    <div className="overflow-hidden border border-slate-600 rounded-lg">
                        <div className="overflow-x-auto bg-slate-900/50">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-600">
                                        <th className="px-4 py-3 font-mono text-left text-cyan-400 bg-slate-800/50">item_id</th>
                                        <th className="px-4 py-3 font-mono text-left text-cyan-400 bg-slate-800/50 border-l border-slate-600">location_id</th>
                                        <th className="px-4 py-3 font-mono text-left text-cyan-400 bg-slate-800/50 border-l border-slate-600">element_name</th>
                                        <th className="px-4 py-3 font-mono text-left text-cyan-400 bg-slate-800/50 border-l border-slate-600">date</th>
                                        <th className="px-4 py-3 font-mono text-left text-cyan-400 bg-slate-800/50 border-l border-slate-600">pick_count</th>
                                    </tr>
                                </thead>
                                <tbody className="font-mono text-slate-300">
                                    <tr className="border-b border-slate-700/50">
                                        <td className="px-4 py-2.5">SKU-12345</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">LOC-001</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">A-01</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">2024-01-15</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">42</td>
                                    </tr>
                                    <tr className="border-b border-slate-700/50">
                                        <td className="px-4 py-2.5">SKU-67890</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">LOC-002</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">A-01</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">2024-01-15</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">18</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-2.5">SKU-11111</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">LOC-010</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">B-02</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">2024-01-15</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">156</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Column Descriptions */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                        <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-cyan-600 rounded-full">1</div>
                                <span className="text-xs font-mono font-semibold text-cyan-400">item_id</span>
                            </div>
                            <p className="text-xs text-slate-400">SKU or item identifier from your WMS</p>
                        </div>

                        <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-cyan-600 rounded-full">2</div>
                                <span className="text-xs font-mono font-semibold text-cyan-400">location_id</span>
                            </div>
                            <p className="text-xs text-slate-400">Slot/bin identifier within the element</p>
                        </div>

                        <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-cyan-600 rounded-full">3</div>
                                <span className="text-xs font-mono font-semibold text-cyan-400">element_name</span>
                            </div>
                            <p className="text-xs text-slate-400">Must match your layout labels</p>
                        </div>

                        <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-cyan-600 rounded-full">4</div>
                                <span className="text-xs font-mono font-semibold text-cyan-400">date</span>
                            </div>
                            <p className="text-xs text-slate-400">YYYY-MM-DD format</p>
                        </div>

                        <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-cyan-600 rounded-full">5</div>
                                <span className="text-xs font-mono font-semibold text-cyan-400">pick_count</span>
                            </div>
                            <p className="text-xs text-slate-400">Positive whole numbers</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Element-level description */}
                    <div className="p-3 bg-slate-600/20 border border-slate-600 rounded-lg">
                        <p className="text-sm text-slate-400">
                            <span className="font-semibold">Element-level tracking</span> aggregates picks at the bay/rack level. This simpler format is still supported but provides less granular reslotting recommendations.
                        </p>
                    </div>

                    {/* CSV Preview Table */}
                    <div className="overflow-hidden border border-slate-600 rounded-lg">
                        <div className="bg-slate-900/50">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-600">
                                        <th className="px-4 py-3 font-mono text-left text-blue-400 bg-slate-800/50">element_name</th>
                                        <th className="px-4 py-3 font-mono text-left text-blue-400 bg-slate-800/50 border-l border-slate-600">date</th>
                                        <th className="px-4 py-3 font-mono text-left text-blue-400 bg-slate-800/50 border-l border-slate-600">pick_count</th>
                                    </tr>
                                </thead>
                                <tbody className="font-mono text-slate-300">
                                    <tr className="border-b border-slate-700/50">
                                        <td className="px-4 py-2.5">A-01-01</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">2024-01-15</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">142</td>
                                    </tr>
                                    <tr className="border-b border-slate-700/50">
                                        <td className="px-4 py-2.5">A-01-02</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">2024-01-15</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">83</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-2.5">B-02-01</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">2024-01-15</td>
                                        <td className="px-4 py-2.5 border-l border-slate-700/50">256</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Column Descriptions */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">1</div>
                                <span className="text-xs font-mono font-semibold text-blue-400">element_name</span>
                            </div>
                            <p className="text-xs text-slate-400">Must match your warehouse layout labels exactly (case-insensitive)</p>
                        </div>

                        <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">2</div>
                                <span className="text-xs font-mono font-semibold text-blue-400">date</span>
                            </div>
                            <p className="text-xs text-slate-400">YYYY-MM-DD format only (e.g., 2024-01-15)</p>
                        </div>

                        <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">3</div>
                                <span className="text-xs font-mono font-semibold text-blue-400">pick_count</span>
                            </div>
                            <p className="text-xs text-slate-400">Positive whole numbers only (no decimals or text)</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
