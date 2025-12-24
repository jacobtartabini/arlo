import { useState, useCallback, useRef } from 'react';
import type { SceneState, HistoryEntry } from '@/types/creation';

const MAX_HISTORY_SIZE = 50;

export function useCreationHistory(initialState: SceneState) {
  const [history, setHistory] = useState<HistoryEntry[]>([{
    sceneState: initialState,
    description: 'Initial state',
    timestamp: Date.now()
  }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isUndoRedoRef = useRef(false);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const pushState = useCallback((state: SceneState, description: string) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    setHistory(prev => {
      // Remove any future states if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add new state
      newHistory.push({
        sceneState: JSON.parse(JSON.stringify(state)), // Deep clone
        description,
        timestamp: Date.now()
      });
      
      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
  }, [currentIndex]);

  const undo = useCallback((): SceneState | null => {
    if (!canUndo) return null;
    
    isUndoRedoRef.current = true;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return JSON.parse(JSON.stringify(history[newIndex].sceneState));
  }, [canUndo, currentIndex, history]);

  const redo = useCallback((): SceneState | null => {
    if (!canRedo) return null;
    
    isUndoRedoRef.current = true;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return JSON.parse(JSON.stringify(history[newIndex].sceneState));
  }, [canRedo, currentIndex, history]);

  const reset = useCallback((state: SceneState) => {
    setHistory([{
      sceneState: JSON.parse(JSON.stringify(state)),
      description: 'Reset',
      timestamp: Date.now()
    }]);
    setCurrentIndex(0);
  }, []);

  return {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    currentDescription: history[currentIndex]?.description || ''
  };
}
