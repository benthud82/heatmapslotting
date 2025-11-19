'use client';

import React from 'react';
import Link from 'next/link';

interface MenuBarProps {
    layoutName: string;
}

export default function MenuBar({ layoutName }: MenuBarProps) {
    return (
        <header className="h-10 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-3 select-none z-40">
            {/* Left: Logo & Menus */}
            <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                    </div>
                    <span className="font-bold text-slate-200 text-sm tracking-tight hidden sm:inline">SLOTTING<span className="text-blue-500">PRO</span></span>
                </Link>

                <div className="h-4 w-px bg-slate-800"></div>

                {/* File Name */}
                <div className="text-sm text-slate-400 font-medium hover:text-white cursor-pointer transition-colors">
                    {layoutName}
                </div>

                {/* Menu Items (Placeholders) */}
                <nav className="hidden md:flex items-center gap-1 ml-2">
                    {['File', 'Edit', 'View', 'Help'].map((item) => (
                        <button
                            key={item}
                            className="px-3 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white rounded transition-colors"
                        >
                            {item}
                        </button>
                    ))}
                </nav>
            </div>
        </header>
    );
}
