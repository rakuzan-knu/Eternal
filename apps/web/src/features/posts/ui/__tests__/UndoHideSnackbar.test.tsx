import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import UndoHideSnackbar from '../UndoHideSnackbar';
import { useHiddenUndoStore } from '../../model/useHiddenUndoStore';
import { useHiddenPostsStore } from '@/shared/model/useHiddenPostsStore';
import React from 'react';

describe('UndoHideSnackbar', () => {
  it('returns null when activeUndo is null', () => {
    useHiddenUndoStore.setState({ activeUndo: null });
    const { container } = render(<UndoHideSnackbar />);
    expect(container.firstChild).toBeNull();
  });

  it('renders undo prompt when a post was recently hidden, ticks countdown and allows undo', () => {
    vi.useFakeTimers();
    useHiddenPostsStore.setState({ hiddenIds: new Set(['p-123']) });
    useHiddenUndoStore.setState({
      activeUndo: { postId: 'p-123', remainingSeconds: 5 },
    });

    render(<UndoHideSnackbar />);

    expect(screen.getByText('Post hidden from feed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /undo \(5s\)/i })).toBeInTheDocument();

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useHiddenUndoStore.getState().activeUndo?.remainingSeconds).toBe(4);

    const undoBtn = screen.getByRole('button', { name: /undo/i });
    fireEvent.click(undoBtn);

    expect(useHiddenPostsStore.getState().hiddenIds.has('p-123')).toBe(false);
    expect(useHiddenUndoStore.getState().activeUndo).toBeNull();

    vi.useRealTimers();
  });
});
