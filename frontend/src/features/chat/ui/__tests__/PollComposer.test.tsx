import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PollComposer from '../PollComposer';

describe('PollComposer', () => {
  it('renders question and options inputs and handles close', () => {
    const onClose = vi.fn();
    render(<PollComposer onClose={onClose} />);

    expect(screen.getByRole('heading', { name: 'Create poll' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask a question')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Option 1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Option 2')).toBeInTheDocument();

    const closeBtn = screen.getAllByRole('button')[0];
    fireEvent.click(closeBtn);
  });
});
