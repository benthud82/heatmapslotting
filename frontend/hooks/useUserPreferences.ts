import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';

interface UserPreferences {
    user_id: string;
    skip_upload_tutorial: boolean;
    successful_uploads_count: number;
    subscription_tier: 'free' | 'pro' | 'enterprise';
    subscription_status: 'active' | 'canceled' | 'past_due' | 'incomplete';
}

export function useUserPreferences() {
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPreferences();
    }, []);

    const fetchPreferences = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await fetch(`${API_URL}/api/user/preferences`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch preferences');

            const data = await response.json();
            setPreferences(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load preferences');
        } finally {
            setLoading(false);
        }
    };

    const updateSkipTutorial = async (skip: boolean) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/user/preferences`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ skip_upload_tutorial: skip })
            });

            if (!response.ok) throw new Error('Failed to update preferences');

            const data = await response.json();
            setPreferences(prev => prev ? { ...prev, skip_upload_tutorial: data.skip_upload_tutorial } : data);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    return {
        preferences,
        loading,
        error,
        updateSkipTutorial,
        refresh: fetchPreferences
    };
}
