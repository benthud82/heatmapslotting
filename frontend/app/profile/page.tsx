'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

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

                    {/* Subscription Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800">
                            <h2 className="text-xl font-bold text-white">Subscription Plan</h2>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-900/20 to-slate-900 border border-blue-800 rounded-lg">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Standard Plan</h3>
                                    <p className="text-sm text-slate-400">Basic warehouse slotting features</p>
                                </div>
                                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded transition-colors">
                                    Upgrade
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
