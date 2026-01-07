import { supabase } from '../supabase';
import { CompletedMilestone, JourneyPreferences, JourneyProgress, MilestoneKey } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

interface MilestonesResponse {
  milestones: CompletedMilestone[];
  preferences: JourneyPreferences;
}

export const journeyApi = {
  getMilestones: (): Promise<MilestonesResponse> =>
    apiFetch<MilestonesResponse>('/api/journey/milestones'),

  getProgress: (): Promise<JourneyProgress> =>
    apiFetch<JourneyProgress>('/api/journey/progress'),

  markMilestone: (milestone: MilestoneKey, metadata: Record<string, unknown> = {}): Promise<CompletedMilestone> =>
    apiFetch<CompletedMilestone>('/api/journey/milestone', {
      method: 'POST',
      body: JSON.stringify({ milestone, metadata }),
    }),

  dismissHint: (hintId: string): Promise<{ dismissed_hints: string[] }> =>
    apiFetch<{ dismissed_hints: string[] }>('/api/journey/dismiss-hint', {
      method: 'POST',
      body: JSON.stringify({ hintId }),
    }),

  updatePreferences: (prefs: { onboarding_completed?: boolean; onboarding_dismissed?: boolean }): Promise<JourneyPreferences> =>
    apiFetch<JourneyPreferences>('/api/journey/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    }),
};
