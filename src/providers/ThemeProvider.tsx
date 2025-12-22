import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'arlo-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [isDbSynced, setIsDbSynced] = useState(false);

  // Check for authenticated user and sync theme from database
  useEffect(() => {
    const syncTheme = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      
      if (uid && !isDbSynced) {
        // Fetch theme from user_settings
        const { data } = await supabase
          .from('user_settings')
          .select('theme')
          .eq('user_id', uid)
          .maybeSingle();
        
        if (data?.theme) {
          const dbTheme = data.theme as Theme;
          setThemeState(dbTheme);
          localStorage.setItem(storageKey, dbTheme);
          setIsDbSynced(true);
        }
      }
    };
    
    syncTheme();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      
      if (uid && !isDbSynced) {
        const { data } = await supabase
          .from('user_settings')
          .select('theme')
          .eq('user_id', uid)
          .maybeSingle();
        
        if (data?.theme) {
          const dbTheme = data.theme as Theme;
          setThemeState(dbTheme);
          localStorage.setItem(storageKey, dbTheme);
          setIsDbSynced(true);
        }
      } else if (!uid) {
        setIsDbSynced(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [storageKey, isDbSynced]);

  // Apply theme to DOM
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    // Update local state and localStorage
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);

    // Sync to database if authenticated
    if (userId) {
      supabase
        .from('user_settings')
        .update({ theme: newTheme })
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) {
            console.error('Error syncing theme to database:', error);
          }
        });
    }
  }, [storageKey, userId]);

  const value = {
    theme,
    setTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
