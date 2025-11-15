// API client for warehouse element placement

import { Layout, WarehouseElement, CreateElementRequest, UpdateElementRequest } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Generic fetch wrapper
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
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
  getElements: () => apiFetch<WarehouseElement[]>('/api/layouts/elements'),
};

// Warehouse Elements API
export const elementsApi = {
  // Create a new element
  create: (data: CreateElementRequest) =>
    apiFetch<WarehouseElement>('/api/elements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update an existing element
  update: (id: string, data: UpdateElementRequest) =>
    apiFetch<WarehouseElement>(`/api/elements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete an element
  delete: (id: string) =>
    apiFetch<{ message: string; id: string }>(`/api/elements/${id}`, {
      method: 'DELETE',
    }),
};
