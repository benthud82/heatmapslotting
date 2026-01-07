'use client';

import { JourneyProvider } from '@/lib/journey';
import { WhatsNextWidget } from './journey';
import JourneyNudgeModal from './journey/JourneyNudgeModal';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <JourneyProvider>
      {children}
      <WhatsNextWidget />
      <JourneyNudgeModal />
    </JourneyProvider>
  );
}
