import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPermissionsModal from '../AdminPermissionsModal';
import { chatApi } from '../../api/chatApi';
import { ParticipantView } from '@/entities/chat/model/types';
import React from 'react';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    updateAdminPermissions: vi.fn(),
  },
}));

describe('AdminPermissionsModal', () => {
  const adminParticipant = {
    userId: 'u2',
    role: 'ADMIN' as const,
    joinedAt: '2026-01-01',
    user: { id: 'u2', username: 'admin_user', displayName: 'Admin User', avatar: null },
  } as unknown as ParticipantView;

  it('renders admin permissions toggles and updates permissions on save', async () => {
    vi.mocked(chatApi.updateAdminPermissions).mockResolvedValue({
      success: true,
    } as unknown as never);
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <AdminPermissionsModal
        isOpen={true}
        onClose={onClose}
        conversationId="c1"
        adminParticipant={adminParticipant}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByText('Admin Permissions')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Edit group profile')).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(chatApi.updateAdminPermissions).toHaveBeenCalledWith(
        'c1',
        'u2',
        expect.objectContaining({
          canEditGroup: true,
          canDeleteMessages: true,
          canManageMembers: true,
        }),
      );
    });
  });
});
