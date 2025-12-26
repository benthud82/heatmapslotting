'use client';

import OnboardingChecklist from './OnboardingChecklist';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <OnboardingChecklist />
    </>
  );
}
