import React from 'react';
import CSVFormatGuide from './CSVFormatGuide';

interface IntroStepProps {
    onNext: () => void;
    skipTutorial: boolean;
    setSkipTutorial: (skip: boolean) => void;
}

export default function IntroStep({ onNext, skipTutorial, setSkipTutorial }: IntroStepProps) {
    return (
        <div className="space-y-10">
            <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome to the Data Import Wizard</h2>
                <p className="mt-3 text-slate-500 text-lg">
                    We'll guide you through uploading your pick history data. This ensures your heatmap is accurate and actionable.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Column: Guide */}
                <div className="space-y-6">
                    <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100">
                        <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">1</span>
                            Prepare Your Data
                        </h3>
                        <p className="text-sm text-blue-800/80 mb-4 leading-relaxed">
                            Ensure your CSV file is formatted correctly. The system requires specific headers to map your data to the warehouse layout.
                        </p>
                        <CSVFormatGuide />
                    </div>
                </div>

                {/* Right Column: Checklist & Action */}
                <div className="space-y-6">
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">2</span>
                            Pre-flight Checklist
                        </h3>
                        <ul className="space-y-3">
                            {[
                                'File is in .CSV format',
                                'Contains required headers: element_name, date, pick_count',
                                'Element names match your warehouse layout exactly',
                                'Dates are formatted consistently (YYYY-MM-DD preferred)'
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                                    <div className="mt-0.5 min-w-[16px]">
                                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={skipTutorial}
                                    onChange={(e) => setSkipTutorial(e.target.checked)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 transition-all checked:border-blue-600 checked:bg-blue-600 hover:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                                <svg
                                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                >
                                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900 group-hover:text-blue-700 transition-colors">Skip this intro next time</span>
                                <span className="text-xs text-slate-500">I know the format and want to start uploading immediately.</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex justify-center pt-8">
                <button
                    onClick={onNext}
                    className="group relative inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5"
                >
                    <span>Start Upload Process</span>
                    <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
