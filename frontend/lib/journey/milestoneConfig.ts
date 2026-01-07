import { Milestone, ContextualHint, JourneyState } from './types';

export const MILESTONES: Milestone[] = [
  {
    key: 'layout_created',
    label: 'Create Your Layout',
    description: 'Place warehouse elements using the Designer',
    href: '/designer',
  },
  {
    key: 'route_markers_added',
    label: 'Add Route Markers',
    description: 'Place cart parking for distance calculations',
    href: '/designer',
  },
  {
    key: 'pick_data_uploaded',
    label: 'Upload Pick Data',
    description: 'Import your CSV pick transactions',
    href: '/upload',
  },
  {
    key: 'distances_viewed',
    label: 'View Distances',
    description: 'See walk distances from cart parking',
    href: '/designer',
  },
  {
    key: 'heatmap_explored',
    label: 'Explore Heatmap',
    description: 'View pick intensity visualization',
    href: '/heatmap',
  },
  {
    key: 'dashboard_analyzed',
    label: 'Analyze Dashboard',
    description: 'Review KPIs and optimization opportunities',
    href: '/dashboard',
  },
  {
    key: 'optimization_started',
    label: 'Start Optimization',
    description: 'Review reslotting opportunities in ReslotHUD',
    href: '/heatmap',
  },
];

export const HINTS_CONFIG: ContextualHint[] = [
  {
    id: 'designer_no_elements',
    targetPage: '/designer',
    condition: (state: JourneyState) => !state.progress.completedMilestones.includes('layout_created'),
    message: 'Start by placing a bay from the sidebar, or use a template to quickly set up your warehouse layout.',
    highlightTarget: 'template-library',
    action: {
      label: 'Open Templates',
      onClick: () => window.dispatchEvent(new CustomEvent('journey:open-templates')),
    },
  },
  {
    id: 'designer_no_parking',
    targetPage: '/designer',
    condition: (state: JourneyState) =>
      state.progress.completedMilestones.includes('layout_created') &&
      !state.progress.completedMilestones.includes('route_markers_added'),
    message: 'Add a cart parking marker to enable walk distance calculations. Select the cart parking tool from the sidebar.',
    highlightTarget: 'cart-parking-tool',
  },
  {
    id: 'designer_try_distances',
    targetPage: '/designer',
    condition: (state: JourneyState) =>
      state.progress.completedMilestones.includes('route_markers_added') &&
      !state.progress.completedMilestones.includes('distances_viewed'),
    message: 'Click "Show Distances" in the toolbar to see walk distances from your cart parking spot.',
    highlightTarget: 'show-distances',
  },
  {
    id: 'heatmap_no_data',
    targetPage: '/heatmap',
    condition: (state: JourneyState) => !state.progress.completedMilestones.includes('pick_data_uploaded'),
    message: 'Upload pick data to see intensity visualization and optimization opportunities.',
    highlightTarget: 'nav-upload',
    action: { label: 'Go to Upload', href: '/upload' },
  },
  {
    id: 'heatmap_try_distances',
    targetPage: '/heatmap',
    condition: (state: JourneyState) =>
      state.progress.completedMilestones.includes('pick_data_uploaded') &&
      state.progress.completedMilestones.includes('route_markers_added') &&
      !state.progress.completedMilestones.includes('distances_viewed'),
    message: 'Click "Show Distances" to see walk distances overlaid on the heatmap.',
    highlightTarget: 'show-distances',
  },
  {
    id: 'heatmap_try_reslot',
    targetPage: '/heatmap',
    condition: (state: JourneyState) =>
      state.progress.completedMilestones.includes('pick_data_uploaded') &&
      !state.progress.completedMilestones.includes('optimization_started'),
    message: 'Click "Start Optimization" to review reslotting opportunities and reduce walk time.',
    highlightTarget: 'start-optimization',
  },
  {
    id: 'dashboard_first_visit',
    targetPage: '/dashboard',
    condition: (state: JourneyState) =>
      state.progress.completedMilestones.includes('pick_data_uploaded') &&
      !state.progress.completedMilestones.includes('dashboard_analyzed'),
    message: 'Review your warehouse health score and the action board for top optimization opportunities.',
    highlightTarget: 'health-score',
  },
  // ============================================
  // PHASED TIPS - Only show AFTER user has completed the core flow
  // These appear one at a time, only after optimization_started (final milestone)
  // ============================================

  // Designer Tips (appear when returning to designer after completing flow)
  {
    id: 'designer_try_pattern',
    targetPage: '/designer',
    condition: (state: JourneyState) =>
      state.progress.completedMilestones.includes('optimization_started'),
    message: 'Tip: Select multiple elements and press G to generate a grid pattern quickly.',
  },
  {
    id: 'designer_try_alignment',
    targetPage: '/designer',
    condition: (state: JourneyState) =>
      state.progress.completedMilestones.includes('optimization_started'),
    message: 'Tip: Select multiple elements to access alignment tools in the properties panel.',
    highlightTarget: 'properties-panel',
  },

  // Heatmap Tips (appear when returning to heatmap after completing flow)
  {
    id: 'heatmap_try_burden',
    targetPage: '/heatmap',
    condition: (state: JourneyState) =>
      state.progress.completedMilestones.includes('optimization_started') &&
      state.progress.completedMilestones.includes('distances_viewed'),
    message: 'Tip: Toggle to "Walk Burden" mode to see picks weighted by distance.',
    highlightTarget: 'burden-toggle',
  },
  {
    id: 'heatmap_click_element',
    targetPage: '/heatmap',
    condition: (state: JourneyState) =>
      state.progress.completedMilestones.includes('optimization_started'),
    message: 'Tip: Click any element on the canvas to see item-level details and pick history.',
    highlightTarget: 'heatmap-canvas',
  },
  {
    id: 'heatmap_try_dates',
    targetPage: '/heatmap',
    condition: (state: JourneyState) =>
      state.progress.completedMilestones.includes('optimization_started'),
    message: 'Tip: Use the date filter to analyze picks for specific time periods.',
    highlightTarget: 'date-filter',
  },

  // Dashboard Tips (appear when returning to dashboard after completing flow)
  {
    id: 'dashboard_action_board',
    targetPage: '/dashboard',
    condition: (state: JourneyState) =>
      state.progress.completedMilestones.includes('optimization_started'),
    message: 'Tip: Click "View Reslotting Opportunity" to jump directly to the heatmap for that item.',
    highlightTarget: 'action-board',
  },
  {
    id: 'dashboard_velocity_table',
    targetPage: '/dashboard',
    condition: (state: JourneyState) =>
      state.progress.completedMilestones.includes('optimization_started'),
    message: 'Tip: Switch between Item and Element views, and filter by velocity tier (Hot/Warm/Cold).',
    highlightTarget: 'velocity-table',
  },
];
