'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import StepIndicator from '@/components/upload/WizardStepIndicator';
import IntroStep from '@/components/upload/IntroStep';
import LayoutSelectStep from '@/components/upload/LayoutSelectStep';
import UploadValidateStep from '@/components/upload/UploadValidateStep';
import ConfirmStep from '@/components/upload/ConfirmStep';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { ValidationResult } from '@/lib/csvValidation';

const STEPS = [
    'Introduction',
    'Select Layout',
    'Upload & Validate',
    'Confirm'
];

export default function UploadPage() {
    const router = useRouter();
    const { preferences, loading: prefsLoading, updateSkipTutorial } = useUserPreferences();
    const [currentStep, setCurrentStep] = useState(1);
    const [skipTutorial, setSkipTutorial] = useState(false);

    // Wizard State
    const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
    const [validElementNames, setValidElementNames] = useState<Set<string>>(new Set());
    const [elementNames, setElementNames] = useState<string[]>([]); // For test CSV generation
    const [file, setFile] = useState<File | null>(null);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

    // Check auth
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login?redirect=/upload');
        }
    }, [router]);

    // Initialize skip tutorial state from preferences and auto-advance if needed
    useEffect(() => {
        if (preferences) {
            setSkipTutorial(preferences.skip_upload_tutorial);
            if (preferences.skip_upload_tutorial && currentStep === 1) {
                setCurrentStep(2);
            }
        }
    }, [preferences]);

    const handleNext = async () => {
        if (currentStep === 1) {
            // Save preference if changed
            if (preferences && skipTutorial !== preferences.skip_upload_tutorial) {
                await updateSkipTutorial(skipTutorial);
            }
            setCurrentStep(2);
        } else {
            setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
        }
    };

    const handleBack = () => {
        // If skipping tutorial, going back from step 2 should go to step 1? 
        // Or maybe we allow going back to step 1 even if skip is on, so they can see it if they want.
        // Let's allow going back to 1.
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleLayoutSelect = (layoutId: string, elementNames: Set<string>) => {
        setSelectedLayoutId(layoutId);
        setValidElementNames(elementNames);
        setElementNames(Array.from(elementNames)); // Store as array for test CSV generation
        handleNext();
    };

    const handleValidationSuccess = (file: File, result: ValidationResult) => {
        setFile(file);
        setValidationResult(result);
        handleNext();
    };

    const handleUploadComplete = () => {
        // Refresh preferences to update upload count
        // Could also redirect here, but ConfirmStep handles the success UI
    };

    if (prefsLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading preferences...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Header />

            <main className="max-w-5xl px-4 py-12 mx-auto sm:px-6 lg:px-8">
                <div className="mb-12">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Import Data</h1>
                        <p className="mt-2 text-slate-500">Follow the steps to securely upload and validate your warehouse data</p>
                    </div>

                    <StepIndicator
                        currentStep={currentStep}
                        totalSteps={STEPS.length}
                        steps={STEPS}
                    />
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="p-8 md:p-10">
                        {currentStep === 1 && (
                            <IntroStep
                                onNext={handleNext}
                                skipTutorial={skipTutorial}
                                setSkipTutorial={setSkipTutorial}
                            />
                        )}

                        {currentStep === 2 && (
                            <LayoutSelectStep
                                onNext={handleLayoutSelect}
                                onBack={handleBack}
                            />
                        )}

                        {currentStep === 3 && (
                            <UploadValidateStep
                                validElementNames={validElementNames}
                                elementNames={elementNames}
                                onNext={handleValidationSuccess}
                                onBack={handleBack}
                            />
                        )}

                        {currentStep === 4 && file && validationResult && (
                            <ConfirmStep
                                file={file}
                                validationResult={validationResult}
                                onBack={handleBack}
                                onUploadComplete={handleUploadComplete}
                            />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
