import React from 'react';

interface StepIndicatorProps {
    currentStep: number;
    totalSteps: number;
    steps: string[];
}

export default function StepIndicator({ currentStep, totalSteps, steps }: StepIndicatorProps) {
    return (
        <div className="w-full py-6">
            <div className="flex items-center justify-center">
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;

                    return (
                        <React.Fragment key={index}>
                            {/* Step Circle */}
                            <div className="relative flex flex-col items-center group">
                                <div
                                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors duration-200
                    ${isCompleted ? 'bg-green-600 border-green-600 text-white' :
                                            isCurrent ? 'bg-white border-blue-600 text-blue-600' :
                                                'bg-white border-gray-300 text-gray-400'}`}
                                >
                                    {isCompleted ? (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <span className="text-sm font-bold">{stepNumber}</span>
                                    )}
                                </div>
                                <div className={`absolute -bottom-8 w-32 text-center text-xs font-medium
                  ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}
                                >
                                    {step}
                                </div>
                            </div>

                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div className={`flex-1 h-0.5 w-12 mx-2
                  ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
