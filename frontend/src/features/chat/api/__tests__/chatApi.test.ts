import { describe, it, expect, vi } from 'vitest';
import { chatApi } from '../chatApi';
import { apiClient } from '@/shared/api/httpClient';

describe('chatApi', () => {
  it('calls getConversations', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [{ id: 'conv-1' }] });
    const res = await chatApi.getConversations();
    expect(getSpy).toHaveBeenCalledWith('/conversations');
    expect(res).toEqual([{ id: 'conv-1' }]);
  });

  it('calls createDirectConversation', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'conv-direct' } });
    const res = await chatApi.createDirectConversation('usr-2');
    expect(postSpy).toHaveBeenCalledWith('/conversations/direct', { participantId: 'usr-2' });
    expect(res).toEqual({ id: 'conv-direct' });
  });

  it('calls markRead', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true } });
    const res = await chatApi.markRead('conv-1');
    expect(postSpy).toHaveBeenCalledWith('/conversations/conv-1/messages/read');
    expect(res).toEqual({ success: true });
  });
});
