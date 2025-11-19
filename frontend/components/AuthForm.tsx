'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import Modal from './Modal';

export default function AuthForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (view === 'sign_up') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/auth/callback`,
                    },
                });
                if (error) throw error;
                setShowSuccessModal(true);
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push('/');
                router.refresh();
            }
        } catch (error: any) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="w-full max-w-md p-8 space-y-8 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl shadow-blue-900/20">
                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50 mb-6">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                        {view === 'sign_in' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                        {view === 'sign_in'
                            ? 'Sign in to access your warehouse layouts'
                            : 'Get started with heatmap slotting optimization'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                placeholder="name@company.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-900/50 hover:shadow-blue-900/70 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                PROCESSING...
                            </span>
                        ) : (
                            view === 'sign_in' ? 'SIGN IN' : 'CREATE ACCOUNT'
                        )}
                    </button>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-800"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-slate-900 text-slate-500">or</span>
                    </div>
                </div>

                <div className="text-center">
                    <button
                        onClick={() => {
                            setView(view === 'sign_in' ? 'sign_up' : 'sign_in');
                            setError(null);
                        }}
                        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                        {view === 'sign_in'
                            ? "Don't have an account? Sign Up"
                            : "Already have an account? Sign In"}
                    </button>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <Modal
                    title="Check Your Email"
                    onClose={() => setShowSuccessModal(false)}
                    footer={
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                        >
                            Got it
                        </button>
                    }
                >
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-lg text-slate-200">
                            We've sent a confirmation link to <span className="font-bold text-white">{email}</span>.
                        </p>
                        <p className="text-sm text-slate-400">
                            Please check your inbox and click the link to activate your account.
                        </p>
                    </div>
                </Modal>
            )}
        </>
    );
}
