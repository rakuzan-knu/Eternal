import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatFolderContextMenu from '../ChatFolderContextMenu';
import React from 'react';

describe('ChatFolderContextMenu', () => {
  const folder = {
    id: 'f1',
    name: 'Work',
    icon: 'briefcase',
    emoji: null,
    color: '#ef4444',
    isSystem: false,
    includeIds: [],
    excludeIds: [],
  };

  it('renders context menu options and calls action handlers', () => {
    const onClose = vi.fn();
    const onEdit = vi.fn();
    const onMarkRead = vi.fn();
    const onDelete = vi.fn();

    render(
      <ChatFolderContextMenu
        folder={folder}
        x={100}
        y={100}
        onClose={onClose}
        onEdit={onEdit}
        onMarkRead={onMarkRead}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText('Edit folder')).toBeInTheDocument();
    expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Edit folder'));
    expect(onEdit).toHaveBeenCalled();
  });
});
