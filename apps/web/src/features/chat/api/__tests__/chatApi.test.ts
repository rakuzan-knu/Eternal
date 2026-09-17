import { describe, it, expect, vi } from 'vitest';
import { chatApi } from '../chatApi';
import { apiClient } from '@/shared/api/httpClient';

describe('chatApi', () => {
  it('calls conversation query and creation endpoints', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [{ id: 'conv-1' }] });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'conv-direct' } });
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { id: 'conv-1' } });

    const convs = await chatApi.getConversations();
    expect(getSpy).toHaveBeenCalledWith('/conversations');
    expect(convs).toEqual([{ id: 'conv-1' }]);

    await chatApi.getConversation('conv-1');
    expect(getSpy).toHaveBeenCalledWith('/conversations/conv-1');

    await chatApi.createDirectConversation('usr-2');
    expect(postSpy).toHaveBeenCalledWith('/conversations/direct', { participantId: 'usr-2' });

    await chatApi.createGroupConversation('Group A', ['u1', 'u2'], 'Desc');
    expect(postSpy).toHaveBeenCalledWith('/conversations/group', {
      name: 'Group A',
      memberIds: ['u1', 'u2'],
      description: 'Desc',
    });

    await chatApi.updateGroup('conv-1', { name: 'New Name' });
    expect(patchSpy).toHaveBeenCalledWith('/conversations/conv-1/group', { name: 'New Name' });

    const file = new File(['img'], 'avatar.png', { type: 'image/png' });
    await chatApi.uploadGroupAvatar('conv-1', file);
    expect(postSpy).toHaveBeenCalledWith('/conversations/conv-1/avatar', expect.any(FormData));
  });

  it('calls membership endpoints: add, remove, leave, promote, demote, transferOwnership', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true } });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { success: true } });

    await chatApi.addMembers('conv-1', ['u3']);
    expect(postSpy).toHaveBeenCalledWith('/conversations/conv-1/members', { memberIds: ['u3'] });

    await chatApi.removeMember('conv-1', 'u3');
    expect(deleteSpy).toHaveBeenCalledWith('/conversations/conv-1/members/u3');

    await chatApi.leaveConversation('conv-1');
    expect(deleteSpy).toHaveBeenCalledWith('/conversations/conv-1/leave');

    await chatApi.promoteMember('conv-1', 'u3');
    expect(postSpy).toHaveBeenCalledWith('/conversations/conv-1/members/u3/promote');

    await chatApi.demoteMember('conv-1', 'u3');
    expect(postSpy).toHaveBeenCalledWith('/conversations/conv-1/members/u3/demote');

    await chatApi.transferOwnership('conv-1', 'u3');
    expect(postSpy).toHaveBeenCalledWith('/conversations/conv-1/transfer-ownership', {
      newOwnerId: 'u3',
    });
  });

  it('calls message queries, activity, searching, markRead and sendMessage', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'm1' } });
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { success: true } });

    await chatApi.getMessages('conv-1', 'before-id', 20, 'after-id');
    expect(getSpy).toHaveBeenCalledWith('/conversations/conv-1/messages', {
      params: { before: 'before-id', after: 'after-id', limit: 20 },
    });

    await chatApi.getMessagesAround('conv-1', 'm-target', 50);
    expect(getSpy).toHaveBeenCalledWith('/conversations/conv-1/messages/around/m-target', {
      params: { limit: 50 },
    });

    await chatApi.getMessagesAroundDate('conv-1', '2026-01-01', 50);
    expect(getSpy).toHaveBeenCalledWith('/conversations/conv-1/messages/around-date', {
      params: { date: '2026-01-01', limit: 50 },
    });

    await chatApi.getChatActivity('conv-1', 2026, 8, 'UTC');
    expect(getSpy).toHaveBeenCalledWith('/conversations/conv-1/messages/activity', {
      params: { year: 2026, month: 8, timezone: 'UTC' },
    });

    await chatApi.getChatActivity('conv-1', 2026, 8);
    expect(getSpy).toHaveBeenCalledWith('/conversations/conv-1/messages/activity', {
      params: { year: 2026, month: 8, timezone: expect.any(String) },
    });

    await chatApi.searchMessages('conv-1', 'hello', 30);
    expect(getSpy).toHaveBeenCalledWith('/conversations/conv-1/messages/search', {
      params: { q: 'hello', limit: 30 },
    });

    await chatApi.setNickname('conv-1', 'u2', 'Bobby');
    expect(patchSpy).toHaveBeenCalledWith('/conversations/conv-1/nickname', {
      targetUserId: 'u2',
      nickname: 'Bobby',
    });

    await chatApi.markRead('conv-1');
    expect(postSpy).toHaveBeenCalledWith('/conversations/conv-1/messages/read');

    await chatApi.sendMessage('conv-1', { text: 'Hello' });
    expect(postSpy).toHaveBeenCalledWith('/conversations/conv-1/messages', {
      text: 'Hello',
      conversationId: 'conv-1',
    });
  });

  it('calls uploadAttachment, mute, archive, unarchive, block, unblock, delete, batch operations and theme endpoints', async () => {
    const postSpy = vi
      .spyOn(apiClient, 'post')
      .mockImplementation(async (url: string, data?: any, config?: any) => {
        if (config?.onUploadProgress) {
          config.onUploadProgress({ loaded: 50, total: 100 });
        }
        return { data: { success: true } };
      });
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { success: true } });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { success: true } });
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });

    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
    const progressSpy = vi.fn();
    await chatApi.uploadAttachment('conv-1', file, progressSpy);
    expect(progressSpy).toHaveBeenCalledWith(50);

    await chatApi.mute('conv-1', 'MUTED' as any);
    expect(patchSpy).toHaveBeenCalledWith('/conversations/conv-1/mute', {
      muteLevel: 'MUTED',
      mutedUntil: undefined,
    });

    await chatApi.archive('conv-1');
    expect(postSpy).toHaveBeenCalledWith('/conversations/conv-1/archive');

    await chatApi.unarchive('conv-1');
    expect(postSpy).toHaveBeenCalledWith('/conversations/conv-1/unarchive');

    await chatApi.blockUser('u-bad');
    expect(postSpy).toHaveBeenCalledWith('/conversations/users/u-bad/block');

    await chatApi.unblockUser('u-bad');
    expect(deleteSpy).toHaveBeenCalledWith('/conversations/users/u-bad/block');

    await chatApi.getBlockedUsers();
    expect(getSpy).toHaveBeenCalledWith('/conversations/users/blocked');

    await chatApi.deleteConversation('conv-1', true);
    expect(deleteSpy).toHaveBeenCalledWith('/conversations/conv-1', { params: { forAll: true } });

    await chatApi.clearHistory('conv-1', false);
    expect(deleteSpy).toHaveBeenCalledWith('/conversations/conv-1/history', {
      params: { forAll: false },
    });

    await chatApi.batchDeleteMessages('conv-1', ['m1', 'm2'], true);
    expect(postSpy).toHaveBeenCalledWith('/conversations/conv-1/messages/batch-delete', {
      messageIds: ['m1', 'm2'],
      forAll: true,
    });

    await chatApi.batchForwardMessages('conv-1', ['m1'], ['conv-2'], true);
    expect(postSpy).toHaveBeenCalledWith('/conversations/conv-1/messages/batch-forward', {
      messageIds: ['m1'],
      conversationIds: ['conv-2'],
      hideAuthor: true,
    });

    await chatApi.reportUser('u-bad', 'SPAM', 'details');
    expect(postSpy).toHaveBeenCalledWith('/conversations/users/u-bad/report', {
      category: 'SPAM',
      details: 'details',
    });

    await chatApi.updateAdminPermissions('conv-1', 'u-admin', { canPinMessages: true });
    expect(patchSpy).toHaveBeenCalledWith('/conversations/conv-1/members/u-admin/permissions', {
      canPinMessages: true,
    });

    await chatApi.setTheme('conv-1', 'cyberpunk', true);
    expect(patchSpy).toHaveBeenCalledWith('/conversations/conv-1/theme', {
      theme: 'cyberpunk',
      applyToAll: true,
    });

    await chatApi.restrictAccount('u-bad');
    expect(postSpy).toHaveBeenCalledWith('/conversations/users/u-bad/restrict');

    await chatApi.proposeTheme('conv-1', 'midnight');
    expect(postSpy).toHaveBeenCalledWith('/conversations/conv-1/theme/propose', {
      theme: 'midnight',
    });

    await chatApi.respondThemeProposal('conv-1', 'm1', 'ACCEPT');
    expect(postSpy).toHaveBeenCalledWith('/conversations/conv-1/theme/proposal/m1/respond', {
      action: 'ACCEPT',
    });

    await chatApi.unlinkSharedTheme('conv-1');
    expect(deleteSpy).toHaveBeenCalledWith('/conversations/conv-1/theme/shared');
  });
});
