import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  it('renders icon, title and subtitle', () => {
    render(
      <EmptyState
        icon={<span data-testid="empty-icon">Icon</span>}
        title="No messages yet"
        subtitle="Start a conversation with someone"
      />,
    );

    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByText('Start a conversation with someone')).toBeInTheDocument();
  });
});
