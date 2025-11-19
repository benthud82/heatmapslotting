'use client';

import React, { useEffect, useState } from 'react';

export interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
    onUndo?: () => void;
    onClose: () => void;
}

export default function Toast({ message, type = 'info', duration = 3000, onUndo, onClose }: ToastProps) {
    const [visible, setVisible] = useState(true);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 300); // Wait for exit animation
        }, duration);

        const progressInterval = setInterval(() => {
            setProgress((prev) => Math.max(0, prev - 100 / (duration / 100)));
        }, 100);

        return () => {
            clearTimeout(timer);
            clearInterval(progressInterval);
        };
    }, [duration, onClose]);

    return (
        <div
            className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-4 px-4 py-3 rounded shadow-xl border transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                } ${type === 'error' ? 'bg-red-900/90 border-red-500 text-white' :
                    type === 'success' ? 'bg-green-900/90 border-green-500 text-white' :
                        'bg-slate-800/90 border-slate-600 text-white'
                }`}
        >
            <span className="font-medium text-sm">{message}</span>

            {onUndo && (
                <button
                    onClick={onUndo}
                    className="px-3 py-1 text-xs font-bold bg-white/10 hover:bg-white/20 rounded transition-colors uppercase tracking-wider"
                >
                    Undo
                </button>
            )}

            <button onClick={() => setVisible(false)} className="text-white/50 hover:text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Progress bar for auto-dismiss */}
            <div className="absolute bottom-0 left-0 h-0.5 bg-white/20 w-full overflow-hidden rounded-b">
                <div
                    className="h-full bg-white/50 transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
