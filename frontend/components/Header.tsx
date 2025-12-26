'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/api';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    children?: React.ReactNode; // For custom page-specific controls (e.g. Designer status)
}

export default function Header({ title = 'Warehouse Heatmap Slotting', subtitle, children }: HeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userTier, setUserTier] = useState<string>('free');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email) {
                setUserEmail(session.user.email);
                // Ensure token is synced for API calls
                if (session.access_token) {
                    localStorage.setItem('token', session.access_token);

                    // Fetch user preferences for tier
                    try {
                        const response = await fetch(`${API_URL}/api/user/preferences`, {
                            headers: { Authorization: `Bearer ${session.access_token}` }
                        });
                        if (response.ok) {
                            const data = await response.json();
                            setUserTier(data.subscription_tier || 'free');
                        }
                    } catch (err) {
                        console.error('Failed to fetch user tier', err);
                    }
                }
            } else {
                localStorage.removeItem('token');
            }
        };
        getUser();

        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const navItems = [
        { name: 'Home', href: '/' },
        { name: 'Designer', href: '/designer' },
        { name: 'Heatmap', href: '/heatmap' },
        { name: 'Upload', href: '/upload' },
        { name: 'Dashboard', href: '/dashboard' },
    ];

    // Helper to check if link is active
    const isActive = (path: string) => {
        if (path === '/' && pathname !== '/') return false;
        return pathname.startsWith(path);
    };

    return (
        <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-2 border-blue-500 shadow-2xl shadow-blue-900/20 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Left: Logo & Title */}
                    <div className="flex items-center gap-4">
                        <Link href="/" className="relative group">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50 transition-transform group-hover:scale-105">
                                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
                                </svg>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
                        </Link>

                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight leading-tight">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="text-xs font-mono text-blue-400">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Center: Navigation */}
                    <nav className="hidden md:flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`px-4 py-2 rounded-md text-sm font-mono font-bold transition-all ${isActive(item.href)
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    {/* Right: Custom Content & User Profile */}
                    <div className="flex items-center gap-4">
                        {/* Page-specific controls (injected via children) */}
                        {children}

                        {/* User Profile Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-3 pl-4 border-l border-slate-700 hover:opacity-80 transition-opacity"
                            >
                                <span className="text-right hidden sm:block">
                                    <span className="block text-xs font-bold text-white">
                                        {userEmail ? userEmail.split('@')[0] : 'User'}
                                    </span>
                                    <span className="block text-[10px] font-mono text-slate-400 uppercase">
                                        {userTier === 'pro' ? 'Pro Plan' : userTier === 'enterprise' ? 'Enterprise' : 'Free Plan'}
                                    </span>
                                </span>
                                <span className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center border-2 border-slate-600 text-white font-bold">
                                    {userEmail ? userEmail[0].toUpperCase() : 'U'}
                                </span>
                            </button>

                            {/* Dropdown Menu */}
                            {isProfileOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                    <div className="px-4 py-3 border-b border-slate-800">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Signed in as</p>
                                        <p className="text-sm text-white truncate">{userEmail}</p>
                                    </div>

                                    <Link
                                        href="/profile"
                                        className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                                        onClick={() => setIsProfileOpen(false)}
                                    >
                                        Your Profile
                                    </Link>
                                    <Link
                                        href="/admin"
                                        className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                                        onClick={() => setIsProfileOpen(false)}
                                    >
                                        Admin Dashboard
                                    </Link>
                                    <button
                                        onClick={() => {
                                            window.dispatchEvent(new CustomEvent('show-onboarding'));
                                            setIsProfileOpen(false);
                                        }}
                                        className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                                    >
                                        Show Onboarding Guide
                                    </button>

                                    <div className="border-t border-slate-800 mt-1 pt-1">
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
