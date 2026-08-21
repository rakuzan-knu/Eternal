import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PollComposer from '../PollComposer';
import React from 'react';

describe('PollComposer', () => {
  it('creates a poll with question and multiple options', () => {
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

    const submitBtn = screen.getByRole('button', { name: 'Create poll' });
    fireEvent.click(submitBtn);

    expect(onCreatePoll).toHaveBeenCalledWith('Best framework?', ['React', 'Vue']);
  });
});
