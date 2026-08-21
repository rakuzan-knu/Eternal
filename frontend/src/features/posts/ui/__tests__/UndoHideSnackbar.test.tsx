import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UndoHideSnackbar from '../UndoHideSnackbar';
import { useHiddenUndoStore } from '../../model/useHiddenUndoStore';
import { useHiddenPostsStore } from '@/shared/model/useHiddenPostsStore';
import React from 'react';

describe('UndoHideSnackbar', () => {
  it('renders undo prompt when a post was recently hidden and allows undo', () => {
    useHiddenPostsStore.setState({ hiddenIds: new Set(['p-123']) });
    useHiddenUndoStore.setState({
      activeUndo: { postId: 'p-123', remainingSeconds: 5 },
    });

    render(<UndoHideSnackbar />);

    expect(screen.getByText('Post hidden from feed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /undo \(5s\)/i })).toBeInTheDocument();

    const undoBtn = screen.getByRole('button', { name: /undo \(5s\)/i });
    fireEvent.click(undoBtn);

    expect(useHiddenPostsStore.getState().hiddenIds.has('p-123')).toBe(false);
    expect(useHiddenUndoStore.getState().activeUndo).toBeNull();
  });
});
