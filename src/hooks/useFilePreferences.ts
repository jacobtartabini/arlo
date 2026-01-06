import { useState, useEffect, useCallback } from 'react';
import type { FilePreferences, FileSortOption, FileViewMode, FileTypeFilter } from '@/types/files';
import { DEFAULT_FILE_PREFERENCES } from '@/types/files';

const STORAGE_KEY = 'arlo_file_preferences';

export function useFilePreferences() {
  const [preferences, setPreferences] = useState<FilePreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_FILE_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_FILE_PREFERENCES;
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore storage errors
    }
  }, [preferences]);

  const setViewMode = useCallback((viewMode: FileViewMode) => {
    setPreferences(prev => ({ ...prev, viewMode }));
  }, []);

  const setSortOption = useCallback((sortOption: FileSortOption) => {
    setPreferences(prev => ({
      ...prev,
      sortField: sortOption.field,
      sortDirection: sortOption.direction,
    }));
  }, []);

  const setTypeFilter = useCallback((typeFilter: FileTypeFilter) => {
    setPreferences(prev => ({ ...prev, typeFilter }));
  }, []);

  return {
    preferences,
    setViewMode,
    setSortOption,
    setTypeFilter,
    sortOption: {
      field: preferences.sortField,
      direction: preferences.sortDirection,
    } as FileSortOption,
  };
}
