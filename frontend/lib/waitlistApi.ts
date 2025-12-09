/**
 * Waitlist API client
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface WaitlistSignupData {
  email: string;
  firstName: string;
  companyName?: string;
  companySize?: 'solo' | '2-10' | '11-50' | '51-200' | '200+';
  role?: string;
  referralCode?: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export interface WaitlistSignupResponse {
  message: string;
  position: number;
  referralCode: string;
  alreadyExists?: boolean;
}

export interface WaitlistStats {
  totalSignups: number;
  uniqueCompanies: number;
  confirmedSignups: number;
}

export interface WaitlistPosition {
  position: number;
  referralCode: string;
  referralCount: number;
}

/**
 * Join the waitlist
 */
export async function joinWaitlist(data: WaitlistSignupData): Promise<WaitlistSignupResponse> {
  const response = await fetch(`${API_URL}/api/waitlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to join waitlist');
  }

  return result;
}

/**
 * Get waitlist statistics for display
 */
export async function getWaitlistStats(): Promise<WaitlistStats> {
  const response = await fetch(`${API_URL}/api/waitlist/stats`);

  if (!response.ok) {
    // Return defaults if API fails
    return {
      totalSignups: 0,
      uniqueCompanies: 0,
      confirmedSignups: 0,
    };
  }

  return response.json();
}

/**
 * Check waitlist position by email
 */
export async function checkPosition(email: string): Promise<WaitlistPosition> {
  const response = await fetch(`${API_URL}/api/waitlist/position/${encodeURIComponent(email)}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check position');
  }

  return response.json();
}

/**
 * Helper to get UTM parameters from URL
 */
export function getUtmParams(): { utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; referralCode: string | null } {
  if (typeof window === 'undefined') {
    return { utmSource: null, utmMedium: null, utmCampaign: null, referralCode: null };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    referralCode: params.get('ref'),
  };
}
