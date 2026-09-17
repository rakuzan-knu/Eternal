import { useCallback, useEffect, useState } from 'react';

export function useUndoRedoStack<T>() {
  const [current, setCurrent] = useState<T | null>(null);
  const [undoStack, setUndoStack] = useState<T[]>([]);
  const [redoStack, setRedoStack] = useState<T[]>([]);

  const commit = (next: T) => {
    setCurrent((prevCurrent) => {
      if (prevCurrent !== null) {
        setUndoStack((prevUndo) => [...prevUndo, prevCurrent]);
      }
      return next;
    });
    setRedoStack([]);
  };

  const undo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const last = prevUndo[prevUndo.length - 1];
      setCurrent((curr) => {
        if (curr) setRedoStack((r) => [...r, curr]);
        return last;
      });
      return prevUndo.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const last = prevRedo[prevRedo.length - 1];
      setCurrent((curr) => {
        if (curr) setUndoStack((u) => [...u, curr]);
        return last;
      });
      return prevRedo.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      if (e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    current,
    setCurrent,
    commit,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
