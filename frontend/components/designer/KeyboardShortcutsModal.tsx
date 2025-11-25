'use client';

import React from 'react';

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
    if (!isOpen) return null;

    const shortcuts = [
        {
            category: 'General', items: [
                { keys: ['Ctrl', 'S'], description: 'Save Layout' },
                { keys: ['Ctrl', 'Z'], description: 'Undo' },
                { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
            ]
        },
        {
            category: 'Editing', items: [
                { keys: ['Ctrl', 'C'], description: 'Copy Selection' },
                { keys: ['Ctrl', 'V'], description: 'Paste Selection' },
                { keys: ['Delete'], description: 'Delete Selection' },
                { keys: ['Ctrl', 'A'], description: 'Select All' },
                { keys: ['G'], description: 'Generate Pattern (Grid/Row)' },
                { keys: ['R'], description: 'Re-sequence Selection' },
            ]
        },
        {
            category: 'Tools', items: [
                { keys: ['V'], description: 'Select Tool' },
                { keys: ['Space'], description: 'Pan Canvas (Hold)' },
            ]
        },
        {
            category: 'View', items: [
                { keys: ['Ctrl', '+'], description: 'Zoom In' },
                { keys: ['Ctrl', '-'], description: 'Zoom Out' },
                { keys: ['Ctrl', '0'], description: 'Reset Zoom' },
            ]
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
                    <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 grid grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
                    {shortcuts.map((category) => (
                        <div key={category.category}>
                            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4">{category.category}</h3>
                            <div className="space-y-3">
                                {category.items.map((shortcut, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300">{shortcut.description}</span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, kIdx) => (
                                                <kbd key={kIdx} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-400 min-w-[24px] text-center">
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 text-center">
                    <p className="text-xs text-slate-500">Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">Esc</kbd> to close</p>
                </div>
            </div>
        </div>
    );
}
