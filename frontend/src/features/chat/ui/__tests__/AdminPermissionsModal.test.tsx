import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPermissionsModal from '../AdminPermissionsModal';
import { ConversationParticipantView } from '@/entities/chat/model/types';
import { chatApi } from '../../api/chatApi';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    updateAdminPermissions: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('AdminPermissionsModal', () => {
  const mockAdmin: ConversationParticipantView = {
    userId: 'user-admin',
    nickname: 'Vice Boss',
    role: 'ADMIN',
    theme: 'default',
    muteLevel: 'NONE',
    mutedUntil: null,
    joinedAt: '2026-08-18T00:00:00.000Z',
    user: {
      id: 'user-admin',
      username: 'vice_boss',
      displayName: 'Vice Boss',
      avatar: null,
      isVerified: false,
    },
  };

  it('renders admin name and permission toggles', () => {
    render(
      <AdminPermissionsModal
        isOpen={true}
        onClose={vi.fn()}
        conversationId="conv-1"
        adminParticipant={mockAdmin}
      />,
    );

    expect(screen.getByText('Admin Permissions')).toBeInTheDocument();
    expect(screen.getByText('Vice Boss')).toBeInTheDocument();
    expect(screen.getByText('Edit group profile')).toBeInTheDocument();
    expect(screen.getByText("Delete other people's messages")).toBeInTheDocument();
    expect(screen.getByText('Block/mute members')).toBeInTheDocument();
    expect(screen.getByText('Pin messages')).toBeInTheDocument();
    expect(screen.getByText('Invite members')).toBeInTheDocument();
  });

  it('toggles permission switch and calls updateAdminPermissions on save', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <AdminPermissionsModal
        isOpen={true}
        onClose={handleClose}
        conversationId="conv-1"
        adminParticipant={mockAdmin}
        onSuccess={handleSuccess}
      />,
    );

    const editGroupRow = screen.getByText('Edit group profile');
    fireEvent.click(editGroupRow);

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(chatApi.updateAdminPermissions).toHaveBeenCalledWith(
        'conv-1',
        'user-admin',
        expect.objectContaining({
          canEditGroup: false,
          canDeleteMessages: true,
          canManageMembers: true,
          canPinMessages: true,
          canInviteUsers: true,
        }),
      );
    });
  });
});
