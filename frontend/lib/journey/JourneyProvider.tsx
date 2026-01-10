'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { JourneyContextValue, JourneyState, MilestoneKey, ContextualHint } from './types';
import { journeyApi } from './api';
import { HINTS_CONFIG } from './milestoneConfig';
import { supabase } from '../supabase';

const JourneyContext = createContext<JourneyContextValue | null>(null);

const initialState: JourneyState = {
  milestones: [],
  progress: {
    currentStage: 0,
    totalStages: 7,
    completedMilestones: [],
    nextAction: null,
    progressPercent: 0,
  },
  preferences: {
    onboarding_completed: false,
    onboarding_dismissed: false,
    dismissed_hints: [],
  },
  loading: true,
};

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<JourneyState>(initialState);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const loadedRef = useRef(false);

  // Check auth state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        // Reset state on logout
        setState(initialState);
        loadedRef.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadJourneyData = useCallback(async () => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const [milestonesRes, progressRes] = await Promise.all([
        journeyApi.getMilestones(),
        journeyApi.getProgress(),
      ]);

      setState(prev => ({
        ...prev,
        milestones: milestonesRes.milestones,
        preferences: milestonesRes.preferences,
        progress: progressRes,
        loading: false,
      }));
    } catch (error) {
      console.error('Failed to load journey data:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [isAuthenticated]);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated && !loadedRef.current) {
      loadedRef.current = true;
      loadJourneyData();
    }
  }, [isAuthenticated, loadJourneyData]);

  // Migrate from localStorage on first load
  useEffect(() => {
    if (!isAuthenticated) return;

    const migrateFromLocalStorage = async () => {
      const migrated = localStorage.getItem('journey_migrated');
      if (migrated === 'true') return;

      const oldOnboardingSkipped = localStorage.getItem('onboarding_skipped');
      const oldTutorialCompleted = localStorage.getItem('tutorial_completed');

      if (oldTutorialCompleted === 'true' || oldOnboardingSkipped === 'true') {
        try {
          await journeyApi.updatePreferences({ onboarding_completed: true });
        } catch (error) {
          console.error('Failed to migrate onboarding state:', error);
        }
      }

      // Clear old keys
      localStorage.removeItem('onboarding_skipped');
      localStorage.removeItem('tutorial_completed');
      localStorage.removeItem('tutorial_dismissed');
      localStorage.removeItem('onboarding_dashboard_visited');
      localStorage.removeItem('warehouse_tour_state');
      localStorage.removeItem('warehouse_tour_completed');

      localStorage.setItem('journey_migrated', 'true');
    };

    migrateFromLocalStorage();
  }, [isAuthenticated]);

  const markMilestone = useCallback(async (milestone: MilestoneKey, metadata: Record<string, unknown> = {}) => {
    // Skip if already completed
    if (state.progress.completedMilestones.includes(milestone)) return;

    // Optimistic update
    setState(prev => ({
      ...prev,
      progress: {
        ...prev.progress,
        completedMilestones: [...prev.progress.completedMilestones, milestone],
        currentStage: prev.progress.currentStage + 1,
        progressPercent: Math.round(((prev.progress.currentStage + 1) / prev.progress.totalStages) * 100),
      },
    }));

    try {
      await journeyApi.markMilestone(milestone, metadata);
      // Refresh to get accurate server state
      await loadJourneyData();
    } catch (error) {
      console.error('Failed to mark milestone:', error);
      // Revert on error
      await loadJourneyData();
    }
  }, [state.progress.completedMilestones, loadJourneyData]);

  const dismissHint = useCallback(async (hintId: string) => {
    // Optimistic update
    setState(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        dismissed_hints: [...prev.preferences.dismissed_hints, hintId],
      },
    }));

    try {
      await journeyApi.dismissHint(hintId);
    } catch (error) {
      console.error('Failed to dismiss hint:', error);
    }
  }, []);

  const dismissOnboarding = useCallback(async () => {
    setState(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        onboarding_dismissed: true,
      },
    }));

    try {
      await journeyApi.updatePreferences({ onboarding_dismissed: true });
    } catch (error) {
      console.error('Failed to dismiss onboarding:', error);
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    setState(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        onboarding_completed: true,
      },
    }));

    try {
      await journeyApi.updatePreferences({ onboarding_completed: true });
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  }, []);

  const restoreOnboarding = useCallback(async () => {
    setState(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        onboarding_dismissed: false,
      },
    }));

    try {
      await journeyApi.updatePreferences({ onboarding_dismissed: false });
    } catch (error) {
      console.error('Failed to restore onboarding:', error);
    }
  }, []);

  const getActiveHints = useCallback((page: string): ContextualHint[] => {
    if (state.preferences.onboarding_completed || state.preferences.onboarding_dismissed) {
      return [];
    }

    return HINTS_CONFIG
      .filter(hint => hint.targetPage === page)
      .filter(hint => !state.preferences.dismissed_hints.includes(hint.id))
      .filter(hint => hint.condition(state));
  }, [state]);

  return (
    <JourneyContext.Provider
      value={{
        ...state,
        isAuthenticated,
        markMilestone,
        dismissHint,
        dismissOnboarding,
        completeOnboarding,
        restoreOnboarding,
        refreshProgress: loadJourneyData,
        getActiveHints,
      }}
    >
      {children}
    </JourneyContext.Provider>
  );
}

export const useJourney = () => useContext(JourneyContext);
