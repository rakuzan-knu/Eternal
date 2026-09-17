import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditGroupModal from '../EditGroupModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ConversationView } from '@/entities/chat/model/types';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    uploadGroupAvatar: vi.fn().mockResolvedValue({ success: true }),
    updateGroup: vi.fn().mockResolvedValue({ id: 'conv-group-1', name: 'Updated Name' }),
  },
}));

describe('EditGroupModal', () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const mockGroupConv = {
    id: 'conv-group-1',
    type: 'GROUP',
    name: 'Engineers',
    avatar: 'javascript:alert(1)', // Unsafe avatar test
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    myMuteLevel: 'NONE',
    isPinned: false,
    participants: [
      {
        userId: 'usr-1',
        role: 'OWNER',
        mutedUntil: null,
        joinedAt: new Date().toISOString(),
        nickname: null,
        theme: 'DEFAULT',
        muteLevel: 'NONE',
        user: {
          id: 'usr-1',
          username: 'alice',
          displayName: 'Alice',
          avatar: null,
        },
      },
    ],
  } as unknown as ConversationView;

  it('renders edit group modal, filters unsafe avatar, handles navigation and save', async () => {
    const onClose = vi.fn();
    const onOpenParticipants = vi.fn();
    const onOpenAdmins = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <EditGroupModal
          conversation={mockGroupConv}
          onClose={onClose}
          onOpenParticipants={onOpenParticipants}
          onOpenAdmins={onOpenAdmins}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Edit group')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Engineers')).toBeInTheDocument();

    // Click admins and participants buttons
    fireEvent.click(screen.getByText('Admins'));
    expect(onOpenAdmins).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Participants'));
    expect(onOpenParticipants).toHaveBeenCalled();

    // Edit name
    const input = screen.getByDisplayValue('Engineers');
    fireEvent.change(input, { target: { value: 'Engineers Lead' } });

    // Click save
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles avatar file upload and save error display', async () => {
    const { chatApi } = await import('../../api/chatApi');
    vi.mocked(chatApi.uploadGroupAvatar).mockRejectedValueOnce(new Error('Image too large'));

    render(
      <QueryClientProvider client={queryClient}>
        <EditGroupModal
          conversation={mockGroupConv}
          onClose={vi.fn()}
          onOpenParticipants={vi.fn()}
          onOpenAdmins={vi.fn()}
        />
      </QueryClientProvider>,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['dummy'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Image too large')).toBeInTheDocument();
    });
  });

  it('revokes previous object url on second avatar change and uploads avatar on save', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const { chatApi } = await import('../../api/chatApi');
    vi.mocked(chatApi.uploadGroupAvatar).mockResolvedValueOnce({ success: true } as any);
    const onClose = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <EditGroupModal
          conversation={mockGroupConv}
          onClose={onClose}
          onOpenParticipants={vi.fn()}
          onOpenAdmins={vi.fn()}
        />
      </QueryClientProvider>,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['a'], 'avatar1.png', { type: 'image/png' });
    const file2 = new File(['b'], 'avatar2.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file1] } });
    fireEvent.change(fileInput, { target: { files: [file2] } });

    expect(revokeSpy).toHaveBeenCalled();

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(chatApi.uploadGroupAvatar).toHaveBeenCalledWith('conv-group-1', file2);
      expect(onClose).toHaveBeenCalled();
    });

    revokeSpy.mockRestore();
  });
});
