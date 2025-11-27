import { useState, useCallback } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistory<T>(initialPresent: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    setState((currentState) => {
      const { past, present, future } = currentState;
      if (past.length === 0) return currentState;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((currentState) => {
      const { past, present, future } = currentState;
      if (future.length === 0) return currentState;

      const next = future[0];
      const newFuture = future.slice(1);

      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const set = useCallback((newPresent: T) => {
    setState((currentState) => {
      const { past, present } = currentState;
      
      // Optional: Deep compare here to prevent duplicate states if needed
      if (JSON.stringify(present) === JSON.stringify(newPresent)) {
          return currentState;
      }

      return {
        past: [...past, present],
        present: newPresent,
        future: [],
      };
    });
  }, []);

  // Helper to update without adding to history (for minor tweaks like cursor tracking, though typically state shouldn't hold cursor)
  const setPresentQuietly = useCallback((newPresent: T) => {
      setState(curr => ({ ...curr, present: newPresent }));
  }, []);

  return { 
      state: state.present, 
      set, 
      undo, 
      redo, 
      canUndo, 
      canRedo,
      setPresentQuietly 
  };
}