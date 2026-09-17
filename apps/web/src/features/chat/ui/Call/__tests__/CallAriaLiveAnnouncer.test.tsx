import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CallAriaLiveAnnouncer } from '../CallAriaLiveAnnouncer';
import { useCallStore } from '../../../model/callStore';

describe('CallAriaLiveAnnouncer (WCAG 2.2 AAA)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useCallStore.setState({
      callStatus: 'idle',
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      connectionQuality: 'excellent',
      isReconnecting: false,
      reconnectCountdown: 15,
      reconnectRestored: false,
      isSatelliteModeEnabled: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders polite and assertive ARIA live regions with sr-only class', () => {
    const { container } = render(<CallAriaLiveAnnouncer />);

    const politeRegion = container.querySelector('[aria-live="polite"]');
    const assertiveRegion = container.querySelector('[aria-live="assertive"]');

    expect(politeRegion).not.toBeNull();
    expect(politeRegion?.getAttribute('role')).toBe('status');
    expect(assertiveRegion).not.toBeNull();
    expect(assertiveRegion?.getAttribute('role')).toBe('alert');
  });

  it('announces incoming call assertively and repeats periodically during ringing', () => {
    render(<CallAriaLiveAnnouncer />);

    act(() => {
      useCallStore.setState({ callStatus: 'ringing' });
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/Incoming call ringing/i);

    // Advance 6 seconds for recurring announcement
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/still ringing/i);
  });

  it('announces microphone and video toggle politely to screen readers', () => {
    render(<CallAriaLiveAnnouncer />);

    act(() => {
      useCallStore.setState({ isMuted: true });
    });
    expect(screen.getByRole('status')).toHaveTextContent('Microphone muted');

    act(() => {
      useCallStore.setState({ isMuted: false });
    });
    expect(screen.getByRole('status')).toHaveTextContent('Microphone unmuted');

    act(() => {
      useCallStore.setState({ isVideoOff: true });
    });
    expect(screen.getByRole('status')).toHaveTextContent('Camera turned off');
  });

  it('announces connection disruption assertively with countdown', () => {
    render(<CallAriaLiveAnnouncer />);

    act(() => {
      useCallStore.setState({
        callStatus: 'connected',
        isReconnecting: true,
        reconnectCountdown: 12,
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/Call connection interrupted/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/12 seconds remaining/i);
  });
});
