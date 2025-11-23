'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export default function ProfilePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const { preferences, updateSkipTutorial, refresh } = useUserPreferences();
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    useEffect(() => {
        if (searchParams.get('upgrade') === 'success') {
            refresh();
            // Clean up URL
            router.replace('/profile');
        }
    }, [searchParams, refresh, router]);

    const handleUpgrade = async () => {
        try {
            setUpgrading(true);

            const token = localStorage.getItem('token');
            const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;

            if (!priceId) {
                setAlertMessage('Stripe configuration missing. Please contact support.');
                return;
            }

            const response = await fetch('http://localhost:3001/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ priceId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create checkout session');
            }

            // Redirect to Stripe Checkout
            window.location.href = data.sessionUrl;
        } catch (error) {
            console.error('Upgrade error:', error);
            setAlertMessage('Failed to start upgrade. Please try again.');
        } finally {
            setUpgrading(false);
        }
    };

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
            } else {
                setUser(session.user);
                setLoading(false);
            }
        };
        checkUser();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-blue-500 text-xl font-mono animate-pulse">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <Header title="User Profile" subtitle="Manage your account settings" />

            <main className="p-6">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Profile Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800">
                            <h2 className="text-xl font-bold text-white">Account Details</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Email Address
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={user?.email || ''}
                                        disabled
                                        className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-400 font-mono"
                                    />
                                    <span className="px-3 py-1 bg-green-900/30 text-green-400 text-xs font-bold rounded border border-green-700">
                                        VERIFIED
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    User ID
                                </label>
                                <input
                                    type="text"
                                    value={user?.id || ''}
                                    disabled
                                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-500 font-mono text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Upload Preferences Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800">
                            <h2 className="text-xl font-bold text-white">Upload Preferences</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-medium text-white">Skip Upload Tutorial</h3>
                                    <p className="text-sm text-slate-400 mt-1">
                                        If enabled, clicking "Upload Picks" will open the quick upload modal instead of the step-by-step wizard.
                                    </p>
                                </div>
                                <button
                                    onClick={() => updateSkipTutorial(!preferences?.skip_upload_tutorial)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences?.skip_upload_tutorial ? 'bg-blue-600' : 'bg-slate-700'
                                        }`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${preferences?.skip_upload_tutorial ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>

                            <div className="pt-4 border-t border-slate-800">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">Successful Uploads</span>
                                    <span className="text-lg font-mono font-bold text-white">
                                        {preferences?.successful_uploads_count || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subscription Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800">
                            <h2 className="text-xl font-bold text-white">Subscription Plan</h2>
                        </div>
                        <div className="p-6">
                            <div className={`flex items-center justify-between p-4 border rounded-lg ${preferences?.subscription_tier === 'pro'
                                ? 'bg-gradient-to-r from-green-900/20 to-slate-900 border-green-800'
                                : 'bg-gradient-to-r from-blue-900/20 to-slate-900 border-blue-800'
                                }`}>
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {preferences?.subscription_tier === 'pro' ? 'Pro Plan' : 'Free Plan'}
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        {preferences?.subscription_tier === 'pro'
                                            ? 'Unlimited access to all features'
                                            : 'Basic warehouse slotting features'}
                                    </p>
                                </div>
                                {preferences?.subscription_tier === 'pro' ? (
                                    <button
                                        className="px-4 py-2 bg-slate-700 text-slate-300 font-bold text-sm rounded cursor-default"
                                        disabled
                                    >
                                        Active
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={upgrading}
                                        className={`px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded transition-colors ${upgrading ? 'opacity-50 cursor-wait' : ''
                                            }`}
                                    >
                                        {upgrading ? 'Processing...' : 'Upgrade'}
                                    </button>
                                )}
                            </div>
                            {preferences?.subscription_tier === 'pro' && (
                                <div className="mt-4 text-center">
                                    <button className="text-sm text-slate-400 hover:text-white transition-colors">
                                        Manage Subscription
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {alertMessage && (
                <Modal
                    title="Notification"
                    onClose={() => setAlertMessage(null)}
                    width="max-w-sm"
                    footer={
                        <button
                            onClick={() => setAlertMessage(null)}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md"
                        >
                            OK
                        </button>
                    }
                >
                    <p className="text-slate-300">{alertMessage}</p>
                </Modal>
            )}
        </div>
    );
}
