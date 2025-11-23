'use client';

import React from 'react';
import Modal from './Modal';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isDestructive = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <Modal
            title={title}
            onClose={onCancel}
            width="max-w-sm"
            footer={
                <>
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-white font-medium rounded-md transition-colors shadow-lg ${isDestructive
                                ? 'bg-red-600 hover:bg-red-700 hover:shadow-red-900/20'
                                : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-900/20'
                            }`}
                    >
                        {confirmText}
                    </button>
                </>
            }
        >
            <p className="text-slate-300 leading-relaxed">
                {message}
            </p>
        </Modal>
    );
}
