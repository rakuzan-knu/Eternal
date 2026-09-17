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

    // Context menu
    fireEvent.contextMenu(screen.getByText('Personal'));
    expect(onContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'f-personal' }),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('supports pointer drag and drop reordering', () => {
    const onReorder = vi.fn();
    render(
      <ChatFolderRail
        folders={mockFolders}
        conversations={[]}
        forcedUnreadIds={new Set()}
        activeFolderId="f-all"
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onContextMenu={vi.fn()}
        onReorder={onReorder}
      />,
    );

    const personalFolder = screen.getByText('Personal').closest('button')!;

    // Pointer down
    fireEvent.pointerDown(personalFolder, {
      clientX: 50,
      clientY: 50,
      pointerType: 'mouse',
    });

    // Pointer move > 6px to trigger startDrag
    fireEvent(
      window,
      new MouseEvent('pointermove', {
        clientX: 70,
        clientY: 50,
        bubbles: true,
      }),
    );

    // Pointer up to end drag
    fireEvent(window, new MouseEvent('pointerup', { bubbles: true }));
  });
});
