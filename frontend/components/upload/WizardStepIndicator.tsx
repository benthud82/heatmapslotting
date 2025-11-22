import React from 'react';

interface StepIndicatorProps {
    currentStep: number;
    totalSteps: number;
    steps: string[];
}

export default function StepIndicator({ currentStep, totalSteps, steps }: StepIndicatorProps) {
    return (
        <div className="w-full py-4">
            <div className="flex items-center justify-center w-full">
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;
                    const isPending = stepNumber > currentStep;

                    return (
                        <React.Fragment key={index}>
                            {/* Step Circle */}
                            <div className="relative flex flex-col items-center group z-10">
                                <div
                                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 shadow-sm
                                        ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                                            isCurrent ? 'bg-slate-900 border-blue-500 text-blue-400 ring-4 ring-blue-500/20 scale-110' :
                                                'bg-slate-800 border-slate-700 text-slate-500'}`}
                                >
                                    {isCompleted ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <span className={`text-sm font-bold ${isPending ? 'font-medium' : ''}`}>{stepNumber}</span>
                                    )}
                                </div>
                                <div className={`absolute -bottom-8 w-32 text-center text-xs font-semibold tracking-wide transition-colors duration-300
                                    ${isCurrent ? 'text-blue-400' : isCompleted ? 'text-emerald-500' : 'text-slate-600'}`}
                                >
                                    {step}
                                </div>
                            </div>

                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div className="flex-1 h-[2px] mx-4 relative">
                                    {/* Background Line */}
                                    <div className="absolute inset-0 bg-slate-800 rounded-full"></div>
                                    {/* Progress Line */}
                                    <div
                                        className={`absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all duration-500 ease-out
                                            ${isCompleted ? 'w-full' : 'w-0'}`}
                                    ></div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
