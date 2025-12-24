/* eslint-disable @typescript-eslint/no-explicit-any */
// API client for warehouse element placement

import { Layout, WarehouseElement, CreateElementRequest, UpdateElementRequest, PickTransaction, AggregatedPickData, UploadPicksResponse, UploadPicksError, RouteMarker, CreateRouteMarkerRequest, WalkDistanceData, Location, Item, AggregatedItemPickData, ItemPickTransaction } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

// Custom API Error class
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

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
      const errorData = await response.json().catch(() => ({ error: 'An error occurred' }));
      throw new ApiError(errorData.error || `HTTP ${response.status}`, response.status, errorData);
    }

    return response.json();
  } catch (error) {
    console.error(`[API] Error fetching ${url}:`, error);

    if (error instanceof ApiError) {
      throw error;
    }

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
  // Get all layouts for the authenticated user
  getLayouts: () => apiFetch<Layout[]>('/api/layouts'),

  // Create a new layout
  createLayout: (data: { name: string; canvas_width?: number; canvas_height?: number }) =>
    apiFetch<Layout>('/api/layouts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update layout properties
  updateLayout: (id: string, data: { name?: string; canvas_width?: number; canvas_height?: number }) =>
    apiFetch<Layout>(`/api/layouts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete a layout
  deleteLayout: (id: string) =>
    apiFetch<{ message: string; id: string }>(`/api/layouts/${id}`, {
      method: 'DELETE',
    }),

  // Get a specific layout
  getLayout: (id: string) => apiFetch<Layout>(`/api/layouts/${id}`),

  // Get all elements for a specific layout
  getElements: async (layoutId: string) => {
    const elements = await apiFetch<any[]>(`/api/layouts/${layoutId}/elements`);
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
  uploadCSV: async (file: File, layoutId: string): Promise<UploadPicksResponse> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const url = `${API_URL}/api/picks/upload`;
    console.log(`[API] Uploading CSV: POST ${url}`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('layoutId', layoutId);

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
  getTransactions: (layoutId: string, startDate?: string, endDate?: string): Promise<PickTransaction[]> => {
    const params = new URLSearchParams();
    params.append('layout_id', layoutId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const queryString = params.toString();
    const endpoint = `/api/picks${queryString ? `?${queryString}` : ''}`;

    return apiFetch<PickTransaction[]>(endpoint);
  },

  // Get aggregated pick counts per element with optional date filters
  getAggregated: async (layoutId: string, startDate?: string, endDate?: string): Promise<AggregatedPickData[]> => {
    const params = new URLSearchParams();
    params.append('layout_id', layoutId);
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
  clearAll: (layoutId: string) =>
    apiFetch<{ message: string; rowsDeleted: number }>(`/api/picks?layout_id=${layoutId}`, {
      method: 'DELETE',
    }),

  // Get all dates that have pick data
  getDates: (layoutId: string) => apiFetch<string[]>(`/api/picks/dates?layout_id=${layoutId}`),

  // Get item-level aggregated pick counts
  getItemsAggregated: async (layoutId: string, startDate?: string, endDate?: string): Promise<AggregatedItemPickData[]> => {
    const params = new URLSearchParams();
    params.append('layout_id', layoutId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const queryString = params.toString();
    const endpoint = `/api/picks/items/aggregated${queryString ? `?${queryString}` : ''}`;

    const data = await apiFetch<any[]>(endpoint);
    // Normalize numbers
    return data.map(item => ({
      ...item,
      total_picks: Number(item.total_picks),
      days_count: Number(item.days_count),
      x_coordinate: Number(item.x_coordinate),
      y_coordinate: Number(item.y_coordinate),
    }));
  },

  // Get all dates that have item-level pick data
  getItemsDates: (layoutId: string) => apiFetch<string[]>(`/api/picks/items/dates?layout_id=${layoutId}`),
};

// Locations API
export const locationsApi = {
  // Get all locations for a layout
  getAll: (layoutId: string): Promise<Location[]> =>
    apiFetch<Location[]>(`/api/locations?layout_id=${layoutId}`),

  // Get a single location
  get: (locationId: string): Promise<Location> =>
    apiFetch<Location>(`/api/locations/${locationId}`),

  // Update a location
  update: (locationId: string, data: { label?: string; relative_x?: number; relative_y?: number }): Promise<Location> =>
    apiFetch<Location>(`/api/locations/${locationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete a location
  delete: (locationId: string): Promise<{ message: string; id: string }> =>
    apiFetch<{ message: string; id: string }>(`/api/locations/${locationId}`, {
      method: 'DELETE',
    }),

  // Get locations for a specific element
  getByElement: (elementId: string): Promise<Location[]> =>
    apiFetch<Location[]>(`/api/locations/by-element/${elementId}`),
};

// Items API
export const itemsApi = {
  // Get all items for a layout
  getAll: (layoutId: string): Promise<Item[]> =>
    apiFetch<Item[]>(`/api/items?layout_id=${layoutId}`),

  // Get a single item
  get: (itemId: string): Promise<Item> =>
    apiFetch<Item>(`/api/items/${itemId}`),

  // Update an item
  update: (itemId: string, data: { description?: string }): Promise<Item> =>
    apiFetch<Item>(`/api/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Reassign item to a different location
  updateLocation: (itemId: string, locationId: string): Promise<Item> =>
    apiFetch<Item>(`/api/items/${itemId}/location`, {
      method: 'PUT',
      body: JSON.stringify({ location_id: locationId }),
    }),

  // Get pick history for an item
  getPicks: (itemId: string, startDate?: string, endDate?: string): Promise<ItemPickTransaction[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const queryString = params.toString();
    const endpoint = `/api/items/${itemId}/picks${queryString ? `?${queryString}` : ''}`;

    return apiFetch<ItemPickTransaction[]>(endpoint);
  },

  // Delete an item
  delete: (itemId: string): Promise<{ message: string; id: string }> =>
    apiFetch<{ message: string; id: string }>(`/api/items/${itemId}`, {
      method: 'DELETE',
    }),
};

// Route Markers API (for walk distance)
export const routeMarkersApi = {
  // Get all route markers for a layout
  getMarkers: (layoutId: string): Promise<RouteMarker[]> =>
    apiFetch<RouteMarker[]>(`/api/layouts/${layoutId}/route-markers`),

  // Create a new route marker
  create: (layoutId: string, data: CreateRouteMarkerRequest): Promise<RouteMarker> =>
    apiFetch<RouteMarker>(`/api/layouts/${layoutId}/route-markers`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update a route marker
  update: (markerId: string, data: Partial<CreateRouteMarkerRequest>): Promise<RouteMarker> =>
    apiFetch<RouteMarker>(`/api/route-markers/${markerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete a route marker
  delete: (markerId: string): Promise<{ message: string; id: string }> =>
    apiFetch<{ message: string; id: string }>(`/api/route-markers/${markerId}`, {
      method: 'DELETE',
    }),

  // Get walk distance calculation
  getWalkDistance: (layoutId: string, startDate?: string, endDate?: string): Promise<WalkDistanceData> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const queryString = params.toString();
    const endpoint = `/api/layouts/${layoutId}/walk-distance${queryString ? `?${queryString}` : ''}`;

    return apiFetch<WalkDistanceData>(endpoint);
  },
};
