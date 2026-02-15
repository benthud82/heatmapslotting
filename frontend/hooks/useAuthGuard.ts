'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthGuardResult {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
}

/**
 * Client-side auth guard hook for defense-in-depth protection.
 * The middleware provides server-side protection, but this hook:
 * 1. Handles session changes while the page is open
 * 2. Syncs the access token to localStorage for API calls
 * 3. Provides user data to components
 */
export function useAuthGuard(): AuthGuardResult {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check initial session
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    setUser(session.user);
                    // Sync token to localStorage for API calls
                    localStorage.setItem('token', session.access_token);
                } else {
                    setUser(null);
                    localStorage.removeItem('token');
                    // Redirect to landing if not authenticated
                    router.push('/landing');
                }
            } catch (error) {
                console.error('Auth guard error:', error);
                setUser(null);
                localStorage.removeItem('token');
                router.push('/landing');
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        // Subscribe to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_OUT' || !session) {
                    setUser(null);
                    localStorage.removeItem('token');
                    router.push('/landing');
                } else if (session?.user) {
                    setUser(session.user);
                    localStorage.setItem('token', session.access_token);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    return {
        user,
        loading,
        isAuthenticated: !!user,
    };
}
