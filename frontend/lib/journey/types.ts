export type MilestoneKey =
  | 'layout_created'
  | 'route_markers_added'
  | 'pick_data_uploaded'
  | 'distances_viewed'
  | 'heatmap_explored'
  | 'dashboard_analyzed'
  | 'optimization_started'
  | 'moves_exported';

export interface Milestone {
  key: MilestoneKey;
  label: string;
  description: string;
  href: string;
}

export interface CompletedMilestone {
  milestone: MilestoneKey;
  completed_at: string;
  metadata: Record<string, unknown>;
}

export interface JourneyProgress {
  currentStage: number;
  totalStages: number;
  completedMilestones: MilestoneKey[];
  nextAction: {
    milestone: MilestoneKey;
    label: string;
    description: string;
    href: string;
  } | null;
  progressPercent: number;
}

export interface JourneyPreferences {
  onboarding_completed: boolean;
  onboarding_dismissed: boolean;
  dismissed_hints: string[];
}

export interface ContextualHint {
  id: string;
  targetPage: string;
  condition: (state: JourneyState) => boolean;
  message: string;
  highlightTarget?: string; // data-tour attribute value to pulse
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export interface JourneyState {
  milestones: CompletedMilestone[];
  progress: JourneyProgress;
  preferences: JourneyPreferences;
  loading: boolean;
}

export interface JourneyContextValue extends JourneyState {
  isAuthenticated: boolean;
  markMilestone: (milestone: MilestoneKey, metadata?: Record<string, unknown>) => Promise<void>;
  dismissHint: (hintId: string) => Promise<void>;
  dismissOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  restoreOnboarding: () => Promise<void>;
  refreshProgress: () => Promise<void>;
  getActiveHints: (page: string) => ContextualHint[];
}
