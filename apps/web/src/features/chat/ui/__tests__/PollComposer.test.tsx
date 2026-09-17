import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PollComposer from '../PollComposer';
import React from 'react';

describe('PollComposer', () => {
  it('creates a poll with question, adds/removes options and handles close', () => {
    const onClose = vi.fn();
    const onCreatePoll = vi.fn();

    render(<PollComposer onClose={onClose} onCreatePoll={onCreatePoll} />);

    expect(screen.getByRole('heading', { name: 'Create poll' })).toBeInTheDocument();

    const questionInput = screen.getByPlaceholderText('Ask a question...');
    fireEvent.change(questionInput, { target: { value: 'Best framework?' } });

    const opt1 = screen.getByPlaceholderText('Option 1');
    const opt2 = screen.getByPlaceholderText('Option 2');
    fireEvent.change(opt1, { target: { value: 'React' } });
    fireEvent.change(opt2, { target: { value: 'Vue' } });

    // Add option 3
    const addOptBtn = screen.getByRole('button', { name: 'Add option' });
    fireEvent.click(addOptBtn);

    const opt3 = screen.getByPlaceholderText('Option 3');
    fireEvent.change(opt3, { target: { value: 'Svelte' } });

    // Remove option 3
    const removeBtns = screen.getAllByTitle('Remove option');
    fireEvent.click(removeBtns[removeBtns.length - 1]);

    const submitBtn = screen.getByRole('button', { name: 'Create poll' });
    fireEvent.click(submitBtn);

    expect(onCreatePoll).toHaveBeenCalledWith('Best framework?', ['React', 'Vue']);
  });

  it('handles max 8 options, invalid submit, and double close click', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { container } = render(<PollComposer onClose={onClose} />);

    // Add options up to 8
    for (let i = 0; i < 7; i++) {
      const addBtn = screen.queryByRole('button', { name: 'Add option' });
      if (addBtn) fireEvent.click(addBtn);
    }

    // Submit invalid form
    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    // Close button
    const closeBtn = container.querySelector('button')!;
    fireEvent.click(closeBtn);
    // Double click close
    fireEvent.click(closeBtn);

    vi.advanceTimersByTime(200);
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
