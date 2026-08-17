import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BadgeModal, { type Badge } from '../BadgeModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('BadgeModal', () => {
  const queryClient = new QueryClient();

  const mockBadges: Badge[] = [
    { id: 'DEVELOPER', name: 'Developer', description: 'Core Developer', icon: <span /> },
  ];

  it('renders null when not open', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BadgeModal isOpen={false} onClose={vi.fn()} badges={mockBadges} />
      </QueryClientProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders badge modal content when open and closes on close button click', () => {
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <BadgeModal isOpen={true} onClose={onClose} badges={mockBadges} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('User Badges')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('Core Developer')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
