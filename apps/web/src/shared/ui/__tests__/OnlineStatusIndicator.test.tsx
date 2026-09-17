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

  it('renders green gamepad icon when user is online and playing a game', () => {
    usePresenceStore.setState({
      onlineUserIds: new Set(['gamer-1']),
      userActivities: {
        'gamer-1': { type: 'gaming', title: 'Dota 2', isSteam: true },
      },
    });

    render(<OnlineStatusIndicator userId="gamer-1" variant="dot" />);
    const gamepad = screen.getByLabelText('Playing a game');
    expect(gamepad).toBeInTheDocument();
    expect(gamepad).toHaveAttribute('title', 'Playing Dota 2');
  });

  it('renders text variant with "Playing [game]" when playing a game', () => {
    usePresenceStore.setState({
      onlineUserIds: new Set(['gamer-1']),
      userActivities: {
        'gamer-1': { type: 'gaming', title: 'Counter-Strike 2', isSteam: true },
      },
    });

    render(<OnlineStatusIndicator userId="gamer-1" variant="text" />);
    expect(screen.getByText('Playing Counter-Strike 2')).toBeInTheDocument();
  });
});
