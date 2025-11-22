'use client';

import { useState } from 'react';
import { Layout } from '@/lib/types';

interface LayoutManagerProps {
    layouts: Layout[];
    currentLayoutId: string | null;
    onLayoutSelect: (layoutId: string) => void;
    onLayoutCreate?: (name: string) => void;
    onLayoutRename?: (layoutId: string, newName: string) => void;
    onLayoutDelete?: (layoutId: string) => void;
    readOnly?: boolean;
}

export default function LayoutManager({
    layouts,
    currentLayoutId,
    onLayoutSelect,
    onLayoutCreate,
    onLayoutRename,
    onLayoutDelete,
    readOnly = false
}: LayoutManagerProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [newLayoutName, setNewLayoutName] = useState('');
    const [renameLayoutId, setRenameLayoutId] = useState<string | null>(null);

    const currentLayout = layouts.find(l => l.id === currentLayoutId);

    const handleCreate = () => {
        if (newLayoutName.trim() && onLayoutCreate) {
            onLayoutCreate(newLayoutName.trim());
            setNewLayoutName('');
            setShowCreateModal(false);
        }
    };

    const handleRename = () => {
        if (renameLayoutId && newLayoutName.trim() && onLayoutRename) {
            onLayoutRename(renameLayoutId, newLayoutName.trim());
            setNewLayoutName('');
            setRenameLayoutId(null);
            setShowRenameModal(false);
        }
    };

    const handleDelete = (layoutId: string) => {
        if (layouts.length <= 1) {
            alert('You must have at least one layout.');
            return;
        }
        if (confirm('Are you sure you want to delete this layout? All elements will be permanently removed.') && onLayoutDelete) {
            onLayoutDelete(layoutId);
            setShowDropdown(false);
        }
    };

    return (
        <>
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0  24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span className="text-sm font-medium">{currentLayout?.name || 'Select Layout'}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {showDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50">
                        {!readOnly && (
                            <div className="p-2 border-b border-slate-700">
                                <button
                                    onClick={() => {
                                        setShowCreateModal(true);
                                        setShowDropdown(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-slate-700 rounded-md"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create New Layout
                                </button>
                            </div>
                        )}

                        <div className="max-h-64 overflow-y-auto">
                            {layouts.map(layout => (
                                <div key={layout.id} className="flex items-center gap-2 p-2 hover:bg-slate-700">
                                    <button
                                        onClick={() => {
                                            onLayoutSelect(layout.id);
                                            setShowDropdown(false);
                                        }}
                                        className={`flex-1 text-left px-2 py-1.5 text-sm rounded ${layout.id === currentLayoutId ? 'text-blue-400 font-medium' : 'text-slate-300'}`}
                                    >
                                        {layout.name}
                                    </button>

                                    {!readOnly && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setRenameLayoutId(layout.id);
                                                    setNewLayoutName(layout.name);
                                                    setShowRenameModal(true);
                                                    setShowDropdown(false);
                                                }}
                                                className="p-1 text-slate-400 hover:text-blue-400"
                                                title="Rename"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>

                                            <button
                                                onClick={() => handleDelete(layout.id)}
                                                className="p-1 text-slate-400 hover:text-red-400"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Layout Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-96">
                        <h3 className="text-lg font-medium text-white mb-4">Create New Layout</h3>
                        <input
                            type="text"
                            value={newLayoutName}
                            onChange={(e) => setNewLayoutName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            placeholder="Layout name"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-md mb-4"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNewLayoutName('');
                                }}
                                className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Layout Modal */}
            {showRenameModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-96">
                        <h3 className="text-lg font-medium text-white mb-4">Rename Layout</h3>
                        <input
                            type="text"
                            value={newLayoutName}
                            onChange={(e) => setNewLayoutName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            placeholder="New layout name"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-md mb-4"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowRenameModal(false);
                                    setNewLayoutName('');
                                    setRenameLayoutId(null);
                                }}
                                className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRename}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md"
                            >
                                Rename
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
