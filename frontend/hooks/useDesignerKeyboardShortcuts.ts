import { useEffect, useCallback } from 'react';

interface KeyboardShortcutActions {
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onSave?: () => void;
  onGeneratePattern?: () => void;
  onResequence?: () => void;
  onAutoAlign?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasElementsSelected?: boolean;
  hasMarkersSelected?: boolean;
  selectedElementCount?: number;
}

export function useDesignerKeyboardShortcuts(actions: KeyboardShortcutActions) {
  const {
    onUndo,
    onRedo,
    onCopy,
    onPaste,
    onCut,
    onDelete,
    onSelectAll,
    onSave,
    onGeneratePattern,
    onResequence,
    onAutoAlign,
    canUndo = false,
    canRedo = false,
    hasMarkersSelected = false,
    selectedElementCount = 0,
  } = actions;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    if (cmdOrCtrl) {
      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            if (canRedo) onRedo?.();
          } else {
            if (canUndo) onUndo?.();
          }
          break;
        case 'y':
          e.preventDefault();
          if (canRedo) onRedo?.();
          break;
        case 'a':
          e.preventDefault();
          onSelectAll?.();
          break;
        case 's':
          e.preventDefault();
          onSave?.();
          break;
        case 'c':
          e.preventDefault();
          onCopy?.();
          break;
        case 'v':
          e.preventDefault();
          onPaste?.();
          break;
        case 'x':
          e.preventDefault();
          onCut?.();
          break;
      }
    } else {
      switch (e.key.toLowerCase()) {
        case 'delete':
        case 'backspace':
          e.preventDefault();
          onDelete?.();
          break;
        case 'g':
          // G - Generate pattern (requires at least 1 element selected)
          if (selectedElementCount >= 1 && onGeneratePattern) {
            e.preventDefault();
            onGeneratePattern();
          }
          break;
        case 'r':
          // R - Resequence selection (requires at least 2 elements selected)
          if (selectedElementCount >= 2 && onResequence) {
            e.preventDefault();
            onResequence();
          }
          break;
        case 'a':
          // Shift+A - Auto-Align
          if (e.shiftKey && onAutoAlign) {
            e.preventDefault();
            onAutoAlign();
          }
          break;
      }
    }
  }, [
    onUndo,
    onRedo,
    onCopy,
    onPaste,
    onCut,
    onDelete,
    onSelectAll,
    onSave,
    onGeneratePattern,
    onResequence,
    onAutoAlign,
    canUndo,
    canRedo,
    selectedElementCount,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
