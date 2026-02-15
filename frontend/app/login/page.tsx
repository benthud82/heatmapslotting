'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    // Check if user is already authenticated and redirect to home
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // User is already logged in, redirect to home
                router.replace('/');
            } else {
                setChecking(false);
            }
        };
        checkAuth();
    }, [router]);

    // Show loading while checking auth status
    if (checking) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
            <AuthForm />
        </div>
    );
}
