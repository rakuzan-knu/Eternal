import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FolderRenameModal } from '../ui/FolderRenameModal';
import { useMusicHubStore } from '../model/useMusicHubStore';

describe('FolderRenameModal', () => {
  beforeEach(() => {
    useMusicHubStore.setState({
      musicFolders: [
        {
          id: 'fld-1',
          name: 'Old Folder Name',
          playlistIds: [],
          createdAt: new Date().toISOString(),
        },
      ],
    });
  });

  it('renders modal with initial folder name and submits rename', () => {
    const handleClose = vi.fn();
    const folder = { id: 'fld-1', name: 'Old Folder Name' };

    render(<FolderRenameModal isOpen={true} onClose={handleClose} folder={folder} />);

    const input = screen.getByPlaceholderText('Folder name') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('Old Folder Name');

    fireEvent.change(input, { target: { value: 'New Renamed Folder' } });
    expect(input.value).toBe('New Renamed Folder');

    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(useMusicHubStore.getState().musicFolders[0].name).toBe('New Renamed Folder');
  });

  it('closes on cancel button click', () => {
    const handleClose = vi.fn();
    render(
      <FolderRenameModal
        isOpen={true}
        onClose={handleClose}
        folder={{ id: 'fld-1', name: 'Folder' }}
      />,
    );

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
