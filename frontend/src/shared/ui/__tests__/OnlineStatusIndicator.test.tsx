import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import OnlineStatusIndicator from '../OnlineStatusIndicator';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { usePresenceStore } from '@/shared/model/usePresenceStore';

describe('OnlineStatusIndicator', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: 'current-user', isAuthenticated: true });
    usePresenceStore.setState({ onlineUserIds: new Set(['user-online']) });
  });

  it('renders online dot for current authenticated user', () => {
    render(<OnlineStatusIndicator userId="current-user" />);
    const dot = screen.getByLabelText('Online');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('bg-emerald-500');
  });

  it('renders online dot for user present in presence store', () => {
    render(<OnlineStatusIndicator userId="user-online" />);
    const dot = screen.getByLabelText('Online');
    expect(dot).toBeInTheDocument();
  });

  it('renders offline dot for offline user when showOfflineDot is true', () => {
    render(<OnlineStatusIndicator userId="user-offline" showOfflineDot={true} />);
    const dot = screen.getByLabelText('Offline');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('bg-gray-500');
  });

  it('renders null for offline user when showOfflineDot is false', () => {
    const { container } = render(
      <OnlineStatusIndicator userId="user-offline" showOfflineDot={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders text variant for online and offline users', () => {
    const { rerender } = render(<OnlineStatusIndicator userId="user-online" variant="text" />);
    expect(screen.getByText('Active now')).toBeInTheDocument();

    rerender(<OnlineStatusIndicator userId="user-offline" variant="text" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });
});
