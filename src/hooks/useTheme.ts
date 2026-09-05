import { useState, useEffect, useCallback } from 'react';
import { Theme } from '../types';

const THEME_STORAGE_KEY = 'sentinel_theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // Ignore localStorage access restrictions
    }
    return 'dark';
  });

  const applyTheme = useCallback((newTheme: Theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    root.setAttribute('data-theme', newTheme);
    root.style.colorScheme = newTheme;
  }, []);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      applyTheme(newTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch {
        // Ignore
      }
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Initial synchronization on mount
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue);
        applyTheme(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [applyTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  };
}
