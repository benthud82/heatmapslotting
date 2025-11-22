import React from 'react';

export default function CSVFormatGuide() {
    return (
        <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-white">File Requirements</h3>

            <div className="space-y-4">
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
        </div>
    );
}
