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
});
