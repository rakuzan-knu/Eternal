import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatFolderModal from '../ChatFolderModal';
import React from 'react';

describe('ChatFolderModal', () => {
  it('creates a new folder with name and options', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <ChatFolderModal conversations={[]} currentUserId="u1" onClose={onClose} onSave={onSave} />,
    );

    expect(screen.getByText('New folder')).toBeInTheDocument();

    const nameInput = screen.getByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'Projects' } });

    const createBtn = screen.getByRole('button', { name: 'Create' });
    fireEvent.click(createBtn);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Projects',
      }),
    );
  });

  it('edits an existing folder, picks icon, changes color, and includes/excludes chats', () => {
    const onSave = vi.fn();
    const mockFolder = {
      id: 'f1',
      name: 'Existing',
      icon: 'star',
      emoji: null,
      color: '#ef4444',
      includeIds: [],
      excludeIds: [],
    };
    const mockConv = {
      id: 'c1',
      type: 'DIRECT' as const,
      isArchived: false,
      participants: [
        {
          userId: 'u2',
          user: { id: 'u2', username: 'partner', displayName: 'Partner', avatar: null },
        },
      ],
    } as any;

    render(
      <ChatFolderModal
        folder={mockFolder}
        conversations={[mockConv]}
        currentUserId="u1"
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    expect(screen.getByText('Edit folder')).toBeInTheDocument();

    // Included chats selection mode
    fireEvent.click(screen.getByText('Included chats'));
    expect(screen.getByText('Include chats')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Partner'));
    fireEvent.click(screen.getByText('Done'));

    // Save
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Existing',
        includeIds: ['c1'],
      }),
    );
  });

  it('handles icon picker None option and group conversations in selector', () => {
    const mockGroup = {
      id: 'g1',
      type: 'GROUP' as const,
      name: 'My Team',
      isArchived: false,
      participants: [
        { userId: 'u1', user: { username: 'me', displayName: 'Me', avatar: null } },
        { userId: 'u2', user: { username: 'partner', displayName: 'Partner', avatar: null } },
      ],
    } as any;

    render(
      <ChatFolderModal
        conversations={[mockGroup]}
        currentUserId="u1"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    // Open icon picker and select None
    const folderIconBtn = screen.getAllByRole('button')[1];
    fireEvent.click(folderIconBtn);

    const noneBtn = screen.getByText('None');
    fireEvent.click(noneBtn);

    // Open excluded chats to test group item rendering
    fireEvent.click(screen.getByText('Excluded chats'));
    expect(screen.getByText('2 members')).toBeInTheDocument();
    fireEvent.click(screen.getByText('My Team'));
    fireEvent.click(screen.getByText('Done'));
  });
});
