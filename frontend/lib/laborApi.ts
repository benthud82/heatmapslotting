/**
 * Labor Management System API Client
 * Handles all API calls for labor standards, efficiency, staffing, and ROI
 */

import { API_URL } from './api';
import { supabase } from './supabase';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface LaborStandards {
  id: string;
  layout_id: string;
  pick_time_seconds: number;
  walk_speed_fpm: number;
  pack_time_seconds: number;
  putaway_time_seconds: number;
  fatigue_allowance_percent: number;
  delay_allowance_percent: number;
  reslot_time_minutes: number;
  hourly_labor_rate: number;
  benefits_multiplier: number;
  shift_hours: number;
  target_efficiency_percent: number;
  created_at: string;
  updated_at: string;
}

export interface LaborStandardsUpdate {
  pick_time_seconds?: number;
  walk_speed_fpm?: number;
  pack_time_seconds?: number;
  putaway_time_seconds?: number;
  fatigue_allowance_percent?: number;
  delay_allowance_percent?: number;
  reslot_time_minutes?: number;
  hourly_labor_rate?: number;
  benefits_multiplier?: number;
  shift_hours?: number;
  target_efficiency_percent?: number;
}

export interface EfficiencyBreakdown {
  pickTimeHours: number;
  walkTimeHours: number;
  packTimeHours: number;
  allowanceHours: number;
}

export interface EfficiencyMetrics {
  totalPicks: number;
  totalWalkDistanceFeet: number;
  avgWalkDistancePerPick: number;
  standardHours: number;
  actualHours: number | null;
  efficiencyPercent: number | null;
  targetEfficiencyPercent: number;
  breakdown: EfficiencyBreakdown;
  estimatedLaborCost: number;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ZoneEfficiency {
  zone: string;
  elementId: string;
  totalPicks: number;
  walkDistanceFeet: number;
  standardHours: number;
  efficiencyPercent: number;
}

export interface PerformanceRecord {
  id: string;
  layout_id: string;
  performance_date: string;
  actual_picks: number;
  actual_hours: number;
  actual_walk_distance_feet: number | null;
  standard_hours: number;
  efficiency_percent: number;
  pick_time_hours: number;
  walk_time_hours: number;
  pack_time_hours: number;
  created_at: string;
}

export interface PerformanceInput {
  performance_date: string;
  actual_picks: number;
  actual_hours: number;
  actual_walk_distance_feet?: number;
}

export interface StaffingCalculation {
  forecastedPicks: number;
  periodDays: number;
  requiredHeadcount: number;
  totalLaborHours: number;
  estimatedLaborCost: number;
  picksPerPerson: number;
  utilizationPercent: number;
}

export interface StaffingForecast extends StaffingCalculation {
  id: string;
  layout_id: string;
  forecast_date: string;
  standards_snapshot: LaborStandards;
  created_at: string;
}

export interface ROIRecommendation {
  itemId: string;
  externalItemId: string;
  itemDescription: string;
  currentElement: string;
  currentDistance: number;
  recommendedElement: string;
  recommendedDistance: number;
  walkSavingsFeet: number;
  dailySavingsDollars: number;
  priority: number;
}

export interface ROICalculation {
  currentState: {
    dailyWalkFeet: number;
    dailyWalkMinutes: number;
    dailyLaborCost: number;
  };
  projectedState: {
    dailyWalkFeet: number;
    dailyWalkMinutes: number;
    dailyLaborCost: number;
  };
  savings: {
    dailyFeet: number;
    dailyMinutes: number;
    dailyDollars: number;
    weeklyDollars: number;
    monthlyDollars: number;
    annualDollars: number;
  };
  implementation: {
    itemsToReslot: number;
    estimatedHours: number;
    estimatedCost: number;
    paybackDays: number;
  };
  recommendations: ROIRecommendation[];
}

export interface ROISimulation extends ROICalculation {
  id: string;
  layout_id: string;
  simulation_name: string;
  simulation_date: string;
  created_at: string;
}

// =============================================================================
// API HELPER
// =============================================================================

async function laborFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const url = `${API_URL}${endpoint}`;
  console.log(`[LaborAPI] ${options?.method || 'GET'} ${url}`);

  const response = await fetch(url, {
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

  // Handle CSV download (blob response)
  if (response.headers.get('content-type')?.includes('text/csv')) {
    return response.blob() as unknown as T;
  }

  return response.json();
}

// =============================================================================
// LABOR STANDARDS API
// =============================================================================

export const laborStandardsApi = {
  /**
   * Get labor standards for a layout (returns defaults if not configured)
   */
  get: (layoutId: string): Promise<LaborStandards> =>
    laborFetch<LaborStandards>(`/api/layouts/${layoutId}/labor/standards`),

  /**
   * Update labor standards for a layout (creates if not exists)
   */
  update: (layoutId: string, data: LaborStandardsUpdate): Promise<LaborStandards> =>
    laborFetch<LaborStandards>(`/api/layouts/${layoutId}/labor/standards`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// =============================================================================
// EFFICIENCY API
// =============================================================================

export const efficiencyApi = {
  /**
   * Calculate efficiency metrics for a layout
   */
  calculate: (layoutId: string, startDate?: string, endDate?: string): Promise<EfficiencyMetrics> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    return laborFetch<EfficiencyMetrics>(
      `/api/layouts/${layoutId}/labor/efficiency${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get efficiency breakdown by zone/element
   */
  getByZone: (layoutId: string, startDate?: string, endDate?: string): Promise<ZoneEfficiency[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    return laborFetch<ZoneEfficiency[]>(
      `/api/layouts/${layoutId}/labor/efficiency/by-zone${queryString ? `?${queryString}` : ''}`
    );
  },
};

// =============================================================================
// PERFORMANCE TRACKING API
// =============================================================================

export const performanceApi = {
  /**
   * Record actual labor hours for a date
   */
  create: (layoutId: string, data: PerformanceInput): Promise<PerformanceRecord> =>
    laborFetch<PerformanceRecord>(`/api/layouts/${layoutId}/labor/performance`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Get performance history
   */
  getHistory: (layoutId: string, startDate?: string, endDate?: string): Promise<PerformanceRecord[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    return laborFetch<PerformanceRecord[]>(
      `/api/layouts/${layoutId}/labor/performance${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Delete a performance record
   */
  delete: (layoutId: string, date: string): Promise<{ message: string }> =>
    laborFetch<{ message: string }>(`/api/layouts/${layoutId}/labor/performance/${date}`, {
      method: 'DELETE',
    }),
};

// =============================================================================
// STAFFING CALCULATOR API
// =============================================================================

export const staffingApi = {
  /**
   * Calculate staffing requirements
   */
  calculate: (
    layoutId: string,
    forecastedPicks: number,
    periodDays: number = 1
  ): Promise<StaffingCalculation> =>
    laborFetch<StaffingCalculation>(`/api/layouts/${layoutId}/labor/staffing/calculate`, {
      method: 'POST',
      body: JSON.stringify({ forecastedPicks, periodDays }),
    }),

  /**
   * Save a staffing forecast
   */
  save: (layoutId: string, data: StaffingCalculation & { forecast_date: string }): Promise<StaffingForecast> =>
    laborFetch<StaffingForecast>(`/api/layouts/${layoutId}/labor/staffing/save`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Get staffing forecast history
   */
  getHistory: (layoutId: string): Promise<StaffingForecast[]> =>
    laborFetch<StaffingForecast[]>(`/api/layouts/${layoutId}/labor/staffing/history`),
};

// =============================================================================
// ROI SIMULATOR API
// =============================================================================

export const roiApi = {
  /**
   * Calculate ROI from reslotting opportunities
   */
  calculate: (layoutId: string, startDate?: string, endDate?: string): Promise<ROICalculation> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    return laborFetch<ROICalculation>(
      `/api/layouts/${layoutId}/labor/roi/calculate${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Save an ROI simulation
   */
  save: (layoutId: string, simulationName: string, data: ROICalculation): Promise<ROISimulation> =>
    laborFetch<ROISimulation>(`/api/layouts/${layoutId}/labor/roi/save`, {
      method: 'POST',
      body: JSON.stringify({ simulation_name: simulationName, ...data }),
    }),

  /**
   * Get ROI simulation history
   */
  getHistory: (layoutId: string): Promise<ROISimulation[]> =>
    laborFetch<ROISimulation[]>(`/api/layouts/${layoutId}/labor/roi/history`),

  /**
   * Export ROI report as CSV
   */
  exportCSV: async (layoutId: string, startDate?: string, endDate?: string): Promise<void> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();

    const blob = await laborFetch<Blob>(
      `/api/layouts/${layoutId}/labor/roi/export${queryString ? `?${queryString}` : ''}`
    );

    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roi-report-${layoutId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
