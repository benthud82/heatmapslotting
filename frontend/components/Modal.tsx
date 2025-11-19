'use client';

import React, { useEffect } from 'react';

interface ModalProps {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    footer?: React.ReactNode;
    width?: string;
}

export default function Modal({ title, children, onClose, footer, width = 'max-w-md' }: ModalProps) {
    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                className={`bg-slate-900 border-2 border-slate-700 rounded-lg shadow-2xl w-full ${width} max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200`}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-mono font-bold text-white tracking-tight">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                        aria-label="Close modal"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto text-slate-300">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800 bg-slate-950/50 rounded-b-lg">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
