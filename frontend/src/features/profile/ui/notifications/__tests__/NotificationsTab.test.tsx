import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotificationsTab from '../NotificationsTab';
import { useNotificationSettingsStore } from '@/shared/model/useNotificationSettingsStore';
import * as pushService from '@/shared/lib/browserPushNotifications';

vi.mock('@/shared/lib/messageNotificationSound', () => ({
  playPreviewNotificationSound: vi.fn(),
}));

describe('NotificationsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationSettingsStore.setState({
      enableNotifications: true,
      allowSound: true,
      volume: 100,
      showName: true,
      showText: true,
      privateChats: true,
      groups: true,
      reactions: true,
      likes: true,
      comments: true,
      reposts: true,
      followers: true,
      mentions: true,
      system: true,
      toastPosition: 'bottom-right',
      maxToasts: 3,
    });
  });

  it('renders all activity notification switches including Mentions and System & Verified', () => {
    render(<NotificationsTab />);

    expect(screen.getByText('Likes')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Reposts')).toBeInTheDocument();
    expect(screen.getByText('Followers')).toBeInTheDocument();
    expect(screen.getByText('Mentions')).toBeInTheDocument();
    expect(screen.getByText('System & Verified')).toBeInTheDocument();
  });

  it('toggles Mentions setting in store', () => {
    render(<NotificationsTab />);

    expect(useNotificationSettingsStore.getState().mentions).toBe(true);

    const heading = screen.getByText('Mentions');
    const row = heading.closest('.flex.items-center.justify-between');
    const toggleBtn = row?.querySelector('button');
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn!);
    expect(useNotificationSettingsStore.getState().mentions).toBe(false);
  });

  it('toggles System & Verified setting in store', () => {
    render(<NotificationsTab />);

    expect(useNotificationSettingsStore.getState().system).toBe(true);

    const heading = screen.getByText('System & Verified');
    const row = heading.closest('.flex.items-center.justify-between');
    const toggleBtn = row?.querySelector('button');
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn!);
    expect(useNotificationSettingsStore.getState().system).toBe(false);
  });

  it('requests browser push permission when Enable notifications is turned on', async () => {
    useNotificationSettingsStore.setState({ enableNotifications: false });
    const requestPermissionSpy = vi.spyOn(pushService, 'requestPushNotificationPermission');

    render(<NotificationsTab />);

    const heading = screen.getByText('Enable notifications');
    const row = heading.closest('.flex.items-center.justify-between');
    const toggleBtn = row?.querySelector('button');
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn!);

    await waitFor(() => {
      expect(requestPermissionSpy).toHaveBeenCalled();
      expect(useNotificationSettingsStore.getState().enableNotifications).toBe(true);
    });
  });

  it('sets Do Not Disturb snooze preset in store', () => {
    render(<NotificationsTab />);

    expect(screen.getByText('Do Not Disturb (Snooze)')).toBeInTheDocument();

    const oneHourBtn = screen.getByRole('button', { name: '1 hour' });
    fireEvent.click(oneHourBtn);

    expect(useNotificationSettingsStore.getState().dndUntil).not.toBeNull();
  });

  it('renders muted accounts accordion and allows unmuting', async () => {
    useNotificationSettingsStore.setState({
      mutedActorIds: ['user-100'],
      mutedActors: [
        {
          id: 'user-100',
          username: 'spammer',
          displayName: 'Spam User',
          avatar: null,
        },
      ],
    });

    render(<NotificationsTab />);

    const mutedAccordionBtn = screen.getByText('Muted Accounts').closest('button');
    expect(mutedAccordionBtn).toBeInTheDocument();

    // Open accordion
    fireEvent.click(mutedAccordionBtn!);

    expect(screen.getByText('Spam User')).toBeInTheDocument();
    expect(screen.getByText('@spammer')).toBeInTheDocument();

    const unmuteBtn = screen.getByRole('button', { name: 'Unmute' });
    fireEvent.click(unmuteBtn);

    expect(useNotificationSettingsStore.getState().mutedActorIds).toEqual([]);
  });
});
