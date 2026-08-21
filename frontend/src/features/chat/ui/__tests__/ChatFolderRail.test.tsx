import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatFolderRail from '../ChatFolderRail';
import React from 'react';

describe('ChatFolderRail', () => {
  const mockFolders = [
    {
      id: 'f-all',
      name: 'All Chats',
      icon: 'folder',
      emoji: null,
      color: '#38bdf8',
      isSystem: true,
      includeIds: [],
      excludeIds: [],
    },
    {
      id: 'f-personal',
      name: 'Personal',
      icon: 'heart',
      emoji: null,
      color: '#ef4444',
      isSystem: false,
      includeIds: [],
      excludeIds: [],
    },
  ];

  it('renders folders and handles selection and creation', () => {
    const onSelect = vi.fn();
    const onCreate = vi.fn();
    const onContextMenu = vi.fn();
    const onReorder = vi.fn();

    render(
      <ChatFolderRail
        folders={mockFolders}
        conversations={[]}
        forcedUnreadIds={new Set()}
        activeFolderId="f-all"
        onSelect={onSelect}
        onCreate={onCreate}
        onContextMenu={onContextMenu}
        onReorder={onReorder}
      />,
    );

    expect(screen.getByText('All Chats')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Personal'));
    expect(onSelect).toHaveBeenCalledWith('f-personal');

    const createBtn = screen.getByRole('button', { name: 'Create chat folder' });
    fireEvent.click(createBtn);
    expect(onCreate).toHaveBeenCalled();
  });
});
