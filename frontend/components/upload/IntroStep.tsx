import React from 'react';
import CSVFormatGuide from './CSVFormatGuide';

interface IntroStepProps {
    onNext: () => void;
    skipTutorial: boolean;
    setSkipTutorial: (skip: boolean) => void;
}

export default function IntroStep({ onNext, skipTutorial, setSkipTutorial }: IntroStepProps) {
    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Welcome to the Pick Data Upload Wizard</h2>
                <p className="mt-2 text-gray-600">
                    Follow this guide to upload your pick data correctly. We'll validate your file to ensure everything matches your warehouse layout.
                </p>
            </div>

            <CSVFormatGuide />

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Checklist for a successful upload:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        File is in CSV format
                    </li>
                    <li className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Contains headers: element_name, date, pick_count
                    </li>
                    <li className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Element names match your warehouse layout exactly
                    </li>
                </ul>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={skipTutorial}
                        onChange={(e) => setSkipTutorial(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Don't show this tutorial next time (I'm an expert)</span>
                </label>

                <button
                    onClick={onNext}
                    className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Get Started
                </button>
            </div>
        </div>
    );
}
