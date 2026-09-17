import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatListHeaderMenu from '../ChatListHeaderMenu';
import React from 'react';

describe('ChatListHeaderMenu', () => {
  it('renders dropdown menu items and triggers onOpen', () => {
    const onClose = vi.fn();
    const onOpen = vi.fn();

    render(<ChatListHeaderMenu onClose={onClose} archivedCount={2} onOpen={onOpen} />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Archived chats')).toBeInTheDocument();
    expect(screen.getByText('Privacy and safety')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Archived chats'));
    expect(onOpen).toHaveBeenCalledWith('archive');

    fireEvent.click(screen.getByText('Settings'));
    expect(onOpen).toHaveBeenCalledWith('settings');

    fireEvent.click(screen.getByText('Privacy and safety'));
    expect(onOpen).toHaveBeenCalledWith('privacy');
  });
});
