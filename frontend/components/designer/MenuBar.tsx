'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface MenuBarProps {
    layoutName: string;
    onAction: (action: string) => void;
    headerContent?: React.ReactNode;
}

interface MenuItem {
    label?: string;
    action?: string;
    shortcut?: string;
    divider?: boolean;
    disabled?: boolean;
}

interface Menu {
    label: string;
    items: MenuItem[];
}

export default function MenuBar({ layoutName, onAction, headerContent }: MenuBarProps) {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const menus: Menu[] = [
        {
            label: 'File',
            items: [
                { label: 'Save', action: 'save', shortcut: 'Ctrl+S' },
                { label: 'Export as PNG', action: 'export_png' },
                { label: 'Export as PDF', action: 'export_pdf' },
                { divider: true },
                { label: 'Print', action: 'print', shortcut: 'Ctrl+P' },
            ]
        },
        {
            label: 'Edit',
            items: [
                { label: 'Undo', action: 'undo', shortcut: 'Ctrl+Z' },
                { label: 'Redo', action: 'redo', shortcut: 'Ctrl+Shift+Z' },
                { divider: true },
                { label: 'Cut', action: 'cut', shortcut: 'Ctrl+X' },
                { label: 'Copy', action: 'copy', shortcut: 'Ctrl+C' },
                { label: 'Paste', action: 'paste', shortcut: 'Ctrl+V' },
                { label: 'Delete', action: 'delete', shortcut: 'Del' },
                { divider: true },
                { label: 'Select All', action: 'select_all', shortcut: 'Ctrl+A' },
            ]
        },
        {
            label: 'View',
            items: [
                { label: 'Zoom In', action: 'zoom_in', shortcut: 'Ctrl++' },
                { label: 'Zoom Out', action: 'zoom_out', shortcut: 'Ctrl+-' },
                { label: 'Fit to Screen', action: 'zoom_fit', shortcut: 'Ctrl+0' },
                { divider: true },
                { label: 'Toggle Grid', action: 'toggle_grid' },
                { label: 'Toggle Snap', action: 'toggle_snap' },
            ]
        },
        {
            label: 'Help',
            items: [
                { label: 'Keyboard Shortcuts', action: 'help_shortcuts' },
                { label: 'About', action: 'help_about' },
            ]
        }
    ];

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="h-10 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-3 select-none z-40" ref={menuRef}>
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

                {/* File Name or Custom Content */}
                {headerContent ? (
                    headerContent
                ) : (
                    <div className="text-sm text-slate-400 font-medium hover:text-white cursor-pointer transition-colors">
                        {layoutName}
                    </div>
                )}

                {/* Menu Items */}
                <nav className="hidden md:flex items-center gap-1 ml-2 relative">
                    {menus.map((menu) => (
                        <div key={menu.label} className="relative">
                            <button
                                onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
                                onMouseEnter={() => activeMenu && setActiveMenu(menu.label)}
                                className={`px-3 py-1 text-xs rounded transition-colors ${activeMenu === menu.label
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                {menu.label}
                            </button>

                            {/* Dropdown */}
                            {activeMenu === menu.label && (
                                <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900 border border-slate-700 rounded shadow-xl py-1 z-50">
                                    {menu.items.map((item, idx) => (
                                        <React.Fragment key={idx}>
                                            {item.divider ? (
                                                <div className="h-px bg-slate-800 my-1"></div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        if (!item.disabled && item.action) {
                                                            onAction(item.action);
                                                            setActiveMenu(null);
                                                        }
                                                    }}
                                                    disabled={item.disabled}
                                                    className={`w-full text-left px-4 py-1.5 text-xs flex items-center justify-between ${item.disabled
                                                        ? 'text-slate-600 cursor-not-allowed'
                                                        : 'text-slate-300 hover:bg-blue-600 hover:text-white'
                                                        }`}
                                                >
                                                    <span>{item.label}</span>
                                                    {item.shortcut && (
                                                        <span className="text-slate-500 font-mono text-[10px]">{item.shortcut}</span>
                                                    )}
                                                </button>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>
            </div>
        </header>
    );
}
