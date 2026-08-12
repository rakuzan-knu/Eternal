import { apiClient as api } from '@/shared/api/httpClient';
import {
  ConversationView,
  MessageView,
  MuteLevel,
  PaginatedMessages,
  UserSnapshot,
} from '../../../entities/chat/model/types';

export const chatApi = {
  getConversations: () => api.get<ConversationView[]>('/conversations').then((r) => r.data),

  getConversation: (conversationId: string) =>
    api.get<ConversationView>(`/conversations/${conversationId}`).then((r) => r.data),

  createDirectConversation: (participantId: string) =>
    api.post<ConversationView>('/conversations/direct', { participantId }).then((r) => r.data),

  createGroupConversation: (name: string, memberIds: string[], description?: string) =>
    api
      .post<ConversationView>('/conversations/group', { name, memberIds, description })
      .then((r) => r.data),

  updateGroup: (conversationId: string, patch: { name?: string; description?: string }) =>
    api
      .patch<ConversationView>(`/conversations/${conversationId}/group`, patch)
      .then((r) => r.data),

  addMembers: (conversationId: string, memberIds: string[]) =>
    api.post(`/conversations/${conversationId}/members`, { memberIds }).then((r) => r.data),

  removeMember: (conversationId: string, userId: string) =>
    api.delete(`/conversations/${conversationId}/members/${userId}`).then((r) => r.data),

  leaveConversation: (conversationId: string) =>
    api.delete(`/conversations/${conversationId}/leave`).then((r) => r.data),

  promoteMember: (conversationId: string, userId: string) =>
    api.post(`/conversations/${conversationId}/members/${userId}/promote`).then((r) => r.data),

  demoteMember: (conversationId: string, userId: string) =>
    api.post(`/conversations/${conversationId}/members/${userId}/demote`).then((r) => r.data),

  transferOwnership: (conversationId: string, newOwnerId: string) =>
    api
      .post(`/conversations/${conversationId}/transfer-ownership`, { newOwnerId })
      .then((r) => r.data),

  getMessages: (conversationId: string, before?: string, limit = 20) =>
    api
      .get<PaginatedMessages>(`/conversations/${conversationId}/messages`, {
        params: { before, limit },
      })
      .then((r) => r.data),

  searchMessages: (conversationId: string, q: string, limit = 30) =>
    api
      .get<MessageView[]>(`/conversations/${conversationId}/messages/search`, {
        params: { q, limit },
      })
      .then((r) => r.data),

  setNickname: (conversationId: string, targetUserId: string, nickname: string | null) =>
    api
      .patch(`/conversations/${conversationId}/nickname`, { targetUserId, nickname })
      .then((r) => r.data),

  markRead: (conversationId: string) =>
    api.post(`/conversations/${conversationId}/messages/read`).then((r) => r.data),

  uploadAttachment: (
    conversationId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    return api
      .post(`/conversations/${conversationId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
      .then((r) => r.data);
  },

  mute: (conversationId: string, muteLevel: MuteLevel, mutedUntil?: string) =>
    api
      .patch(`/conversations/${conversationId}/mute`, { muteLevel, mutedUntil })
      .then((r) => r.data),

  archive: (conversationId: string) =>
    api.post(`/conversations/${conversationId}/archive`).then((r) => r.data),

  unarchive: (conversationId: string) =>
    api.delete(`/conversations/${conversationId}/archive`).then((r) => r.data),

  blockUser: (userId: string) =>
    api.post(`/conversations/users/${userId}/block`).then((r) => r.data),

  unblockUser: (userId: string) =>
    api.delete(`/conversations/users/${userId}/block`).then((r) => r.data),

  getBlockedUsers: () =>
    api.get<UserSnapshot[]>('/conversations/users/blocked').then((r) => r.data),

  reportUser: (userId: string, category: string, details?: string) =>
    api.post(`/conversations/users/${userId}/report`, { category, details }).then((r) => r.data),
};
