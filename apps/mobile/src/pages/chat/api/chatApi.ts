import type {
  AttachmentView,
  ConversationPage,
  ConversationView,
  MessageView,
  PaginatedMessages,
} from '@social-network/shared-contracts';
import { getMobileApi } from '@/shared/api/client';
import type { ImagePickerAsset } from 'expo-image-picker';
import { prepareMobileUploadForm } from '../../feed/api/directUploadForm';
import { appendAsset } from '../../feed/api/postForm';

export interface OutgoingImage {
  type: 'IMAGE';
  url: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
}

const conversationPath = (id: string) => `/conversations/${encodeURIComponent(id)}`;

export const chatApi = {
  conversations: async (cursor: string | undefined, signal: AbortSignal) =>
    (
      await getMobileApi().get<ConversationPage>('/conversations/page', {
        params: { limit: 25, cursor },
        signal,
      })
    ).data,
  conversation: async (id: string, signal: AbortSignal) =>
    (await getMobileApi().get<ConversationView>(conversationPath(id), { signal })).data,
  messages: async (id: string, before: string | undefined, signal: AbortSignal) =>
    (
      await getMobileApi().get<PaginatedMessages>(`${conversationPath(id)}/messages`, {
        params: { before, limit: 30 },
        signal,
      })
    ).data,
  send: async (
    id: string,
    body: {
      text?: string;
      clientMessageId: string;
      replyToId?: string;
      attachments?: OutgoingImage[];
    },
  ) =>
    (
      await getMobileApi().post<MessageView>(`${conversationPath(id)}/messages`, {
        ...body,
        conversationId: id,
      })
    ).data,
  edit: async (id: string, messageId: string, body: string) =>
    (
      await getMobileApi().patch<MessageView>(
        `${conversationPath(id)}/messages/${encodeURIComponent(messageId)}`,
        { body },
      )
    ).data,
  remove: async (id: string, messageId: string, forAll: boolean) => {
    await getMobileApi().delete(
      `${conversationPath(id)}/messages/${encodeURIComponent(messageId)}`,
      {
        data: { forAll },
      },
    );
  },
  react: async (id: string, messageId: string, emoji: string, active: boolean) => {
    const path = `${conversationPath(id)}/messages/${encodeURIComponent(messageId)}/reactions`;
    return (
      active
        ? await getMobileApi().post<MessageView>(path, { emoji })
        : await getMobileApi().delete<MessageView>(`${path}/${encodeURIComponent(emoji)}`)
    ).data;
  },
  search: async (id: string, q: string, signal: AbortSignal) =>
    (
      await getMobileApi().get<MessageView[]>(`${conversationPath(id)}/messages/search`, {
        params: { q, limit: 30 },
        signal,
      })
    ).data,
  uploadImage: async (id: string, image: ImagePickerAsset, signal?: AbortSignal) => {
    const api = getMobileApi();
    const form = new FormData();
    await appendAsset(form, 'file', image);
    const body = await prepareMobileUploadForm(api, form, 'chat', signal, id);
    return (
      await api.post<AttachmentView>(`${conversationPath(id)}/attachments`, body, {
        ...(signal ? { signal } : {}),
      })
    ).data;
  },
  markRead: async (id: string) => {
    await getMobileApi().post(`${conversationPath(id)}/messages/read`);
  },
  createGroup: async (input: { name: string; description?: string; memberIds: string[] }) =>
    (await getMobileApi().post<ConversationView>('/conversations/group', input)).data,
  updateGroup: async (id: string, patch: { name?: string; description?: string }) =>
    (await getMobileApi().patch<ConversationView>(`${conversationPath(id)}/group`, patch)).data,
  addMembers: async (id: string, memberIds: string[]) => {
    await getMobileApi().post(`${conversationPath(id)}/members`, { memberIds });
  },
  removeMember: async (id: string, userId: string) => {
    await getMobileApi().delete(`${conversationPath(id)}/members/${encodeURIComponent(userId)}`);
  },
  leave: async (id: string) => {
    await getMobileApi().delete(`${conversationPath(id)}/leave`);
  },
  openDirect: async (participantId: string) =>
    (await getMobileApi().post<ConversationView>('/conversations/direct', { participantId })).data,
};
