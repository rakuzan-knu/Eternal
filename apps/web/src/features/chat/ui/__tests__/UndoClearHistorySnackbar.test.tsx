import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import UndoClearHistorySnackbar from '../UndoClearHistorySnackbar';
import { useClearHistoryUndoStore } from '../../model/useClearHistoryUndoStore';

describe('UndoClearHistorySnackbar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useClearHistoryUndoStore.setState({ activeUndo: null });
  });

  it('renders nothing when there is no active undo', () => {
    const { container } = render(<UndoClearHistorySnackbar />);
    expect(container.firstChild).toBeNull();
  });

  it('renders countdown and triggers cancelUndo on Undo button click', () => {
    const rollback = vi.fn();
    const execute = vi.fn();

    act(() => {
      useClearHistoryUndoStore.getState().startUndo({
        conversationId: 'conv-1',
        conversationTitle: 'Alice',
        forAll: true,
        rollback,
        execute,
      });
    });

    render(<UndoClearHistorySnackbar />);

    expect(screen.getByText(/History cleared: Alice/i)).toBeInTheDocument();
    expect(screen.getByText(/Deleted for everyone/i)).toBeInTheDocument();
    expect(screen.getByText(/Undo \(5s\)/i)).toBeInTheDocument();

    const undoBtn = screen.getByRole('button', { name: /Undo/i });
    fireEvent.click(undoBtn);

    expect(rollback).toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(useClearHistoryUndoStore.getState().activeUndo).toBeNull();
  });

  it('executes deletion when timer expires after 5 seconds', () => {
    const rollback = vi.fn();
    const execute = vi.fn();

    act(() => {
      useClearHistoryUndoStore.getState().startUndo({
        conversationId: 'conv-2',
        conversationTitle: 'Group Chat',
        forAll: false,
        rollback,
        execute,
      });
    });

    render(<UndoClearHistorySnackbar />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(execute).toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
    expect(useClearHistoryUndoStore.getState().activeUndo).toBeNull();
  });

  it('renders default text when conversationTitle is empty', () => {
    act(() => {
      useClearHistoryUndoStore.getState().startUndo({
        conversationId: 'conv-3',
        conversationTitle: '',
        forAll: false,
        rollback: vi.fn(),
        execute: vi.fn(),
      });
    });

    render(<UndoClearHistorySnackbar />);
    expect(screen.getByText('Chat history cleared')).toBeInTheDocument();
  });
});
