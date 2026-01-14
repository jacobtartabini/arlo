/**
 * Desktop Keyboard Shortcuts Hook
 * 
 * Provides global keyboard shortcuts for desktop users
 * (Mac Catalyst, Electron, and desktop web browsers).
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsDesktop } from './use-desktop';

interface ShortcutHandlers {
  onCommandPalette?: () => void;
  onNewNote?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
}

/**
 * Hook to enable desktop keyboard shortcuts
 */
export function useDesktopShortcuts(handlers?: ShortcutHandlers) {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only process on desktop
    if (!isDesktop) return;

    // Check for modifier key (Cmd on Mac, Ctrl on Windows/Linux)
    const isMod = e.metaKey || e.ctrlKey;
    const isShift = e.shiftKey;

    // Ignore if typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow Escape to blur input
      if (e.key === 'Escape') {
        target.blur();
      }
      return;
    }

    // Command palette: Cmd/Ctrl + K
    if (isMod && e.key === 'k') {
      e.preventDefault();
      handlers?.onCommandPalette?.();
      return;
    }

    // New note: Cmd/Ctrl + N
    if (isMod && e.key === 'n' && !isShift) {
      e.preventDefault();
      if (handlers?.onNewNote) {
        handlers.onNewNote();
      } else {
        navigate('/notes');
      }
      return;
    }

    // Search: Cmd/Ctrl + Shift + F
    if (isMod && isShift && e.key === 'f') {
      e.preventDefault();
      handlers?.onSearch?.();
      return;
    }

    // Settings: Cmd/Ctrl + ,
    if (isMod && e.key === ',') {
      e.preventDefault();
      if (handlers?.onSettings) {
        handlers.onSettings();
      } else {
        navigate('/settings');
      }
      return;
    }

    // Navigation shortcuts (no modifier needed)
    switch (e.key) {
      case 'g':
        // Go to shortcuts (press g then another key)
        break;
      case 'Escape':
        // Close dialogs/modals (handled by Radix)
        break;
      case '?':
        // Show keyboard shortcuts help
        if (isShift) {
          e.preventDefault();
          // Could open a shortcuts dialog
        }
        break;
    }

    // Quick navigation with Cmd/Ctrl + number
    if (isMod && /^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const routes = [
        '/',           // 1 - Dashboard
        '/chat',       // 2 - Chat
        '/notes',      // 3 - Notes
        '/calendar',   // 4 - Calendar
        '/inbox',      // 5 - Inbox
        '/productivity', // 6 - Productivity
        '/finance',    // 7 - Finance
        '/maps',       // 8 - Maps
        '/settings',   // 9 - Settings
      ];
      const index = parseInt(e.key) - 1;
      if (routes[index]) {
        navigate(routes[index]);
      }
    }
  }, [isDesktop, navigate, handlers]);

  useEffect(() => {
    if (!isDesktop) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop, handleKeyDown]);
}

export default useDesktopShortcuts;
