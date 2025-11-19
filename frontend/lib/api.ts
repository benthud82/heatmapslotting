// API client for warehouse element placement

import { Layout, WarehouseElement, CreateElementRequest, UpdateElementRequest, PickTransaction, AggregatedPickData, UploadPicksResponse, UploadPicksError } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper to normalize backend response (convert string numbers to numbers)
function normalizeElement(element: any): WarehouseElement {
  return {
    ...element,
    x_coordinate: Number(element.x_coordinate),
    y_coordinate: Number(element.y_coordinate),
    width: Number(element.width),
    height: Number(element.height),
    rotation: Number(element.rotation),
  };
}

import { supabase } from './supabase';

// ... imports

// Generic fetch wrapper
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const url = `${API_URL}${endpoint}`;
  console.log(`[API] Fetching: ${options?.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error(`[API] Error fetching ${url}:`, error);

    // Handle network errors (connection refused, CORS, etc.)
    if (error instanceof TypeError) {
      // Network errors typically have messages like "Failed to fetch" or "NetworkError"
      const isNetworkError = error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('Failed') ||
        error.message.includes('ERR_');
      if (isNetworkError) {
        throw new Error(`Failed to connect to backend server at ${API_URL}. Make sure the backend is running on port 3001. Original error: ${error.message}`);
      }
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      throw new Error(`Invalid JSON response from ${url}. The backend may have returned an error or non-JSON response.`);
    }

    // Re-throw other errors (including our own Error instances)
    throw error;
  }
}

// Layout API
export const layoutApi = {
  // Get or create user's layout
  getLayout: () => apiFetch<Layout>('/api/layouts'),

  // Update layout properties
  updateLayout: (data: { name?: string; canvas_width?: number; canvas_height?: number }) =>
    apiFetch<Layout>('/api/layouts', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Get all elements for user's layout
  getElements: async () => {
    const elements = await apiFetch<any[]>('/api/layouts/elements');
    return elements.map(normalizeElement);
  },
};

// Warehouse Elements API
export const elementsApi = {
  // Create a new element
  create: async (data: CreateElementRequest) => {
    const element = await apiFetch<any>('/api/elements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeElement(element);
  },

  // Update an existing element
  update: async (id: string, data: UpdateElementRequest) => {
    const element = await apiFetch<any>(`/api/elements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return normalizeElement(element);
  },

  // Delete an element
  delete: (id: string) =>
    apiFetch<{ message: string; id: string }>(`/api/elements/${id}`, {
      method: 'DELETE',
    }),
};

// Picks API
export const picksApi = {
  // Upload CSV file with pick data
  uploadCSV: async (file: File): Promise<UploadPicksResponse> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const url = `${API_URL}/api/picks/upload`;
    console.log(`[API] Uploading CSV: POST ${url}`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
      });

      if (!response.ok) {
        const error: UploadPicksError = await response.json().catch(() => ({
          error: 'An error occurred during upload'
        }));
        throw error;
      }

      return response.json();
    } catch (error) {
      console.error(`[API] Error uploading CSV:`, error);

      // Re-throw UploadPicksError objects (with validation details)
      if (typeof error === 'object' && error !== null && 'error' in error) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new Error(`Failed to connect to backend server at ${API_URL}. Make sure the backend is running on port 3001.`);
      }

      throw error;
    }
  },

  // Get raw pick transactions with optional date filters
  getTransactions: (startDate?: string, endDate?: string): Promise<PickTransaction[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const queryString = params.toString();
    const endpoint = `/api/picks${queryString ? `?${queryString}` : ''}`;

    return apiFetch<PickTransaction[]>(endpoint);
  },

  // Get aggregated pick counts per element with optional date filters
  getAggregated: async (startDate?: string, endDate?: string): Promise<AggregatedPickData[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const queryString = params.toString();
    const endpoint = `/api/picks/aggregated${queryString ? `?${queryString}` : ''}`;

    const data = await apiFetch<any[]>(endpoint);
    // Normalize numbers
    return data.map(item => ({
      ...item,
      total_picks: Number(item.total_picks),
      days_count: Number(item.days_count),
    }));
  },

  // Clear all pick data
  clearAll: () =>
    apiFetch<{ message: string; rowsDeleted: number }>('/api/picks', {
      method: 'DELETE',
    }),

  // Get all dates that have pick data
  getDates: () => apiFetch<string[]>('/api/picks/dates'),
};
