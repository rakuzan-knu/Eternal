import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PollComposer from '../PollComposer';

describe('PollComposer', () => {
  it('renders question and options inputs and handles close', () => {
    const onClose = vi.fn();
    render(<PollComposer onClose={onClose} />);

    expect(screen.getByRole('heading', { name: 'Create poll' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask a question...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Option 1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Option 2')).toBeInTheDocument();

    const closeBtn = screen.getAllByRole('button')[0];
    fireEvent.click(closeBtn);
  });

  it('submits poll when question and at least 2 options are filled', () => {
    const onCreatePoll = vi.fn();
    const onClose = vi.fn();
    render(<PollComposer onClose={onClose} onCreatePoll={onCreatePoll} />);

    const submitBtn = screen.getByRole('button', { name: 'Create poll' });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Ask a question...'), {
      target: { value: 'Favorite color?' },
    });
    fireEvent.change(screen.getByPlaceholderText('Option 1'), {
      target: { value: 'Purple' },
    });
    fireEvent.change(screen.getByPlaceholderText('Option 2'), {
      target: { value: 'Sky' },
    });

    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    expect(onCreatePoll).toHaveBeenCalledWith('Favorite color?', ['Purple', 'Sky']);
  });
});
