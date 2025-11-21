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

    // Initialize skip tutorial state from preferences
    useEffect(() => {
        if (preferences) {
            setSkipTutorial(preferences.skip_upload_tutorial);
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
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="max-w-4xl px-4 py-8 mx-auto sm:px-6 lg:px-8">
                <div className="mb-8">
                    <StepIndicator
                        currentStep={currentStep}
                        totalSteps={STEPS.length}
                        steps={STEPS}
                    />
                </div>

                <div className="p-8 bg-white rounded-lg shadow-lg">
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
            </main>
        </div>
    );
}
