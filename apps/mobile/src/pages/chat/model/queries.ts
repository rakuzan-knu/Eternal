import * as React from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { ConversationView, MessageView } from '@social-network/shared-contracts';
import { isEncryptedEnvelope, parseEnvelope } from '@social-network/shared-crypto';
import { useDebounce } from '@/shared/lib/useDebounce';
import {
  decryptMessageForDisplay,
  encryptMessageForPeer,
  ensureMessageIdentityRegistered,
  type DecryptResult,
} from '@/shared/lib/e2ee/messageE2ee';
import { nextMessageSeq } from '@/shared/lib/e2ee/e2eeState';
import { secureRandomUuid } from '@/shared/lib/e2ee/random';
import { getMobileApi } from '@/shared/api/client';
import { chatApi, type OutgoingImage } from '../api/chatApi';
import {
  applyIncomingToConversations,
  clearUnread,
  flattenMessages,
  orderMessages,
  toggleReaction,
  patchMessage,
  removeMessage,
  upsertMessage,
  type ChatMessage,
  type ConversationsData,
  type MessagesData,
} from './chat';
import { getChatSocket, useOpenConversation, useTypingStore } from './socket';

export const chatKeys = {
  all: (userId: string) => ['mobile', userId, 'chat'] as const,
  conversations: (userId: string) => [...chatKeys.all(userId), 'conversations'] as const,
  conversation: (userId: string, id: string) =>
    [...chatKeys.all(userId), 'conversation', id] as const,
  messages: (userId: string, id: string) => [...chatKeys.all(userId), 'messages', id] as const,
  decrypted: (userId: string, id: string, body: string) =>
    [...chatKeys.all(userId), 'decrypted', id, body] as const,
};

export function useConversations(userId: string) {
  return useInfiniteQuery({
    queryKey: chatKeys.conversations(userId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => chatApi.conversations(pageParam, signal),
    getNextPageParam: (page) => (page.hasMore && page.nextCursor ? page.nextCursor : undefined),
    staleTime: 30_000,
  });
}

export function useUnreadChats(userId: string) {
  const query = useConversations(userId);
  return React.useMemo(
    () =>
      query.data?.pages.reduce(
        (sum, page) =>
          sum +
          page.data.filter(
            (conversation) => !conversation.communityId && conversation.unreadCount > 0,
          ).length,
        0,
      ) ?? 0,
    [query.data],
  );
}

export function useConversation(userId: string, id: string) {
  const client = useQueryClient();
  return useQuery({
    queryKey: chatKeys.conversation(userId, id),
    queryFn: ({ signal }) => chatApi.conversation(id, signal),
    initialData: () =>
      client
        .getQueryData<ConversationsData>(chatKeys.conversations(userId))
        ?.pages.flatMap((page) => page.data)
        .find((conversation) => conversation.id === id),
    initialDataUpdatedAt: 0,
  });
}

export function useMessages(userId: string, id: string) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(userId, id),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => chatApi.messages(id, pageParam, signal),
    getNextPageParam: (page) => (page.hasMore && page.nextCursor ? page.nextCursor : undefined),
    staleTime: 15_000,
  });
}

export function useCreateGroup(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string; memberIds: string[] }) =>
      chatApi.createGroup(input),
    onSuccess: () => client.invalidateQueries({ queryKey: chatKeys.conversations(userId) }),
  });
}

/** Group administration; every change refreshes the conversation and the inbox. */
export function useGroupActions(userId: string, conversationId: string) {
  const client = useQueryClient();
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: chatKeys.conversation(userId, conversationId) }),
      client.invalidateQueries({ queryKey: chatKeys.conversations(userId) }),
    ]);
  return {
    rename: useMutation({
      mutationFn: (patch: { name?: string; description?: string }) =>
        chatApi.updateGroup(conversationId, patch),
      onSuccess: (conversation) => {
        client.setQueryData(chatKeys.conversation(userId, conversationId), conversation);
        void refresh();
      },
    }),
    add: useMutation({
      mutationFn: (memberIds: string[]) => chatApi.addMembers(conversationId, memberIds),
      onSuccess: () => void refresh(),
    }),
    remove: useMutation({
      mutationFn: (memberId: string) => chatApi.removeMember(conversationId, memberId),
      onSuccess: () => void refresh(),
    }),
    leave: useMutation({
      mutationFn: () => chatApi.leave(conversationId),
      onSuccess: () => {
        client.removeQueries({ queryKey: chatKeys.conversation(userId, conversationId) });
        client.removeQueries({ queryKey: chatKeys.messages(userId, conversationId) });
        void client.invalidateQueries({ queryKey: chatKeys.conversations(userId) });
      },
    }),
  };
}

export function useOpenDirect() {
  return useMutation({ mutationFn: (participantId: string) => chatApi.openDirect(participantId) });
}

export function useMarkRead(userId: string, id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => chatApi.markRead(id),
    onMutate: () =>
      client.setQueryData<ConversationsData>(chatKeys.conversations(userId), (data) =>
        clearUnread(data, id),
      ),
  });
}

/** Decrypts one body with an explicit state; results are cached per message+body. */
export function useDecryptedBody(
  userId: string,
  message: Pick<MessageView, 'id' | 'body' | 'sender'>,
  conversationId: string,
  peerUserId: string | null,
) {
  const body = message.body ?? '';
  return useQuery<DecryptResult>({
    queryKey: chatKeys.decrypted(userId, message.id, body),
    queryFn: () =>
      decryptMessageForDisplay(body, {
        peerUserId,
        conversationId,
        senderId: message.sender.id,
      }),
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    networkMode: 'always',
  });
}

export class SendBlockedError extends Error {
  constructor(readonly peerUserId: string) {
    super('Security key changed');
  }
}

/**
 * Sends through the confirmed HTTP path. 1:1 bodies are encrypted for every
 * peer device; a changed contact key blocks the send instead of downgrading.
 */
export interface SendInput {
  text: string;
  clientMessageId: string;
  replyTo?: ChatMessage | null;
  images?: ImagePickerAsset[];
}

async function encryptForConversation(
  text: string,
  userId: string,
  conversation: ConversationView | undefined,
  peerUserId: string | null,
  seq?: number,
): Promise<string | null> {
  if (!text || conversation?.type !== 'DIRECT' || !peerUserId) return null;
  try {
    return await encryptMessageForPeer(text, peerUserId, {
      conversationId: conversation.id,
      senderId: userId,
      seq: seq ?? (await nextMessageSeq(conversation.id)),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'E2eePinChangedError')
      throw new SendBlockedError(peerUserId);
    throw error;
  }
}

/**
 * Sends through the confirmed HTTP path. 1:1 text is encrypted for every peer
 * device; a changed contact key blocks the send instead of downgrading.
 * Images upload first (attachments are not end-to-end encrypted, as on web).
 */
export function useSendMessage(
  userId: string,
  conversation: ConversationView | undefined,
  peerUserId: string | null,
) {
  const client = useQueryClient();
  const conversationId = conversation?.id ?? '';
  return useMutation({
    mutationFn: async ({ text, clientMessageId, replyTo, images = [] }: SendInput) => {
      const body = (await encryptForConversation(text, userId, conversation, peerUserId)) ?? text;
      const attachments: OutgoingImage[] = [];
      for (const image of images) {
        const uploaded = await chatApi.uploadImage(conversationId, image);
        attachments.push({
          type: 'IMAGE',
          url: uploaded.url,
          ...(uploaded.fileName ? { fileName: uploaded.fileName } : {}),
          ...(uploaded.mimeType ? { mimeType: uploaded.mimeType } : {}),
          ...(uploaded.size ? { size: uploaded.size } : {}),
          width: uploaded.width ?? image.width,
          height: uploaded.height ?? image.height,
        });
      }
      return chatApi.send(conversationId, {
        clientMessageId,
        ...(body ? { text: body } : {}),
        ...(replyTo ? { replyToId: replyTo.id } : {}),
        ...(attachments.length ? { attachments } : {}),
      });
    },
    onMutate: async ({ text, clientMessageId, replyTo, images = [] }) => {
      const sender = conversation?.participants.find(
        (participant) => participant.userId === userId,
      )?.user;
      const optimistic: ChatMessage = {
        id: `local-${clientMessageId}`,
        clientMessageId,
        localStatus: 'sending',
        conversationId,
        sender: sender ?? { id: userId, username: '', displayName: null, avatar: null },
        body: text || null,
        messageType: images.length ? 'IMAGE' : 'TEXT',
        replyTo: replyTo ?? null,
        forwardedFrom: null,
        attachments: images.map((image, index) => ({
          id: `local-${clientMessageId}-${index}`,
          type: 'IMAGE',
          url: image.uri,
          fileName: image.fileName ?? null,
          mimeType: image.mimeType ?? null,
          size: image.fileSize ?? null,
          width: image.width,
          height: image.height,
          duration: null,
          thumbnailUrl: null,
        })),
        reactions: [],
        readBy: [],
        isEdited: false,
        isDeleted: false,
        isPinned: false,
        createdAt: new Date(),
        editedAt: null,
      };
      client.setQueryData<DecryptResult>(chatKeys.decrypted(userId, optimistic.id, text), {
        status: 'plain',
        text,
      });
      client.setQueryData<MessagesData>(chatKeys.messages(userId, conversationId), (data) =>
        upsertMessage(data, optimistic),
      );
    },
    onSuccess: (message, { text, clientMessageId }) => {
      if (message.body) {
        client.setQueryData<DecryptResult>(chatKeys.decrypted(userId, message.id, message.body), {
          status: message.body === text ? 'plain' : 'decrypted',
          text,
        });
      }
      client.setQueryData<MessagesData>(chatKeys.messages(userId, conversationId), (data) =>
        upsertMessage(data, message, clientMessageId),
      );
      client.setQueryData<ConversationsData>(chatKeys.conversations(userId), (data) =>
        applyIncomingToConversations(data, message, userId, conversationId),
      );
    },
    onError: (error, { clientMessageId }) => {
      const mine = (message: ChatMessage) => message.clientMessageId === clientMessageId;
      client.setQueryData<MessagesData>(chatKeys.messages(userId, conversationId), (data) =>
        error instanceof SendBlockedError
          ? removeMessage(data, mine)
          : patchMessage(data, mine, (message) => ({ ...message, localStatus: 'failed' })),
      );
    },
  });
}

/**
 * Plain messages edit as plain text. Encrypted ones must re-encrypt (keeping
 * the original sequence number when it belongs to this dialog) or fail.
 */
export async function resolveEditBody(
  original: string | null,
  text: string,
  conversationId: string,
  encrypt: (seq?: number) => Promise<string | null>,
): Promise<string> {
  if (!isEncryptedEnvelope(original)) return text;
  let seq: number | undefined;
  try {
    const parsed = parseEnvelope(original as string);
    if (parsed.v !== 1 && parsed.aad.conversationId === conversationId) seq = parsed.aad.seq;
  } catch {
    seq = undefined;
  }
  const encrypted = await encrypt(seq);
  if (!encrypted) throw new EditNotEncryptedError();
  return encrypted;
}

export class EditNotEncryptedError extends Error {
  constructor() {
    super('This message is end-to-end encrypted and the edit could not be encrypted.');
  }
}

/**
 * Edits keep the original protection: an encrypted message is re-encrypted
 * (reusing its sequence number) or the edit is refused — never downgraded
 * to plaintext.
 */
export function useEditMessage(
  userId: string,
  conversation: ConversationView | undefined,
  peerUserId: string | null,
) {
  const client = useQueryClient();
  const conversationId = conversation?.id ?? '';
  const key = chatKeys.messages(userId, conversationId);
  return useMutation({
    mutationFn: async ({ message, text }: { message: ChatMessage; text: string }) => {
      const body = await resolveEditBody(message.body, text, conversationId, (seq) =>
        encryptForConversation(text, userId, conversation, peerUserId, seq),
      );
      return { updated: await chatApi.edit(conversationId, message.id, body), body };
    },
    onMutate: async ({ message, text }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<MessagesData>(key);
      const draft = `local-edit:${text}`;
      client.setQueryData<DecryptResult>(chatKeys.decrypted(userId, message.id, draft), {
        status: 'plain',
        text,
      });
      client.setQueryData<MessagesData>(key, (data) =>
        patchMessage(
          data,
          (item) => item.id === message.id,
          (item) => ({ ...item, body: draft, isEdited: true }),
        ),
      );
      return { previous };
    },
    onSuccess: ({ updated, body }, { text }) => {
      client.setQueryData<DecryptResult>(
        chatKeys.decrypted(userId, updated.id, updated.body ?? body),
        {
          status: isEncryptedEnvelope(body) ? 'decrypted' : 'plain',
          text,
        },
      );
      client.setQueryData<MessagesData>(key, (data) => upsertMessage(data, updated));
    },
    onError: (_error, _input, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },
  });
}

export function useDeleteMessage(userId: string, conversationId: string) {
  const client = useQueryClient();
  const key = chatKeys.messages(userId, conversationId);
  return useMutation({
    mutationFn: ({ message, forAll }: { message: ChatMessage; forAll: boolean }) =>
      chatApi.remove(conversationId, message.id, forAll),
    onMutate: async ({ message, forAll }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<MessagesData>(key);
      client.setQueryData<MessagesData>(key, (data) =>
        forAll
          ? patchMessage(
              data,
              (item) => item.id === message.id,
              (item) => ({ ...item, isDeleted: true, body: null, attachments: [] }),
            )
          : removeMessage(data, (item) => item.id === message.id),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },
  });
}

export function useReactToMessage(userId: string, conversationId: string) {
  const client = useQueryClient();
  const key = chatKeys.messages(userId, conversationId);
  return useMutation({
    mutationFn: ({ message, emoji }: { message: ChatMessage; emoji: string }) =>
      chatApi.react(
        conversationId,
        message.id,
        emoji,
        !message.reactions.some((reaction) => reaction.emoji === emoji && reaction.selfReacted),
      ),
    onMutate: async ({ message, emoji }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<MessagesData>(key);
      client.setQueryData<MessagesData>(key, (data) =>
        patchMessage(
          data,
          (item) => item.id === message.id,
          (item) => ({ ...item, reactions: toggleReaction(item.reactions, emoji) }),
        ),
      );
      return { previous };
    },
    onSuccess: (updated) => {
      if (updated?.id)
        client.setQueryData<MessagesData>(key, (data) => upsertMessage(data, updated));
    },
    onError: (_error, _input, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },
  });
}

/**
 * Server search cannot see encrypted bodies, so results merge the server's
 * plaintext matches with a local scan of messages this device has decrypted.
 */
export function useMessageSearch(userId: string, conversationId: string, rawQuery: string) {
  const client = useQueryClient();
  const term = useDebounce(rawQuery.trim(), 300);
  const server = useQuery({
    queryKey: [...chatKeys.all(userId), 'search', conversationId, term],
    queryFn: ({ signal }) => chatApi.search(conversationId, term, signal),
    enabled: term.length > 1,
    staleTime: 30_000,
  });
  const messagesData = client.getQueryData<MessagesData>(chatKeys.messages(userId, conversationId));
  const results = React.useMemo(() => {
    if (term.length < 2) return [];
    const needle = term.toLowerCase();
    const local = flattenMessages(messagesData).filter((message) => {
      if (message.isDeleted || !message.body) return false;
      const decoded = client.getQueryData<DecryptResult>(
        chatKeys.decrypted(userId, message.id, message.body),
      );
      return (
        (decoded?.status === 'decrypted' || decoded?.status === 'plain') &&
        decoded.text.toLowerCase().includes(needle)
      );
    });
    const remote = (server.data ?? []).filter((message) => !isEncryptedEnvelope(message.body));
    return orderMessages([...local, ...remote]);
  }, [client, messagesData, server.data, term, userId]);
  return {
    term,
    results,
    isSearching: term.length > 1 && server.isFetching,
    isError: server.isError,
    pending: rawQuery.trim() !== term,
  };
}

export const newClientMessageId = () => secureRandomUuid();

function applyRead(
  client: QueryClient,
  userId: string,
  payload: { conversationId: string; userId: string; readAt: string },
) {
  const readAt = new Date(payload.readAt).getTime();
  client.setQueryData<MessagesData>(chatKeys.messages(userId, payload.conversationId), (data) =>
    patchMessage(
      data,
      (message) =>
        !message.localStatus &&
        new Date(message.createdAt).getTime() <= readAt &&
        !message.readBy.includes(payload.userId),
      (message) => ({ ...message, readBy: [...message.readBy, payload.userId] }),
    ),
  );
}

/** Session-wide realtime wiring: keeps inbox, open thread and typing state live. */
export function useChatRealtime(userId: string, enabled: boolean) {
  const client = useQueryClient();
  const openId = useOpenConversation((state) => state.id);
  const setTyping = useTypingStore((state) => state.set);

  React.useEffect(() => {
    if (!enabled) return;
    const socket = getChatSocket(userId);
    const refresh = () => {
      void client.invalidateQueries({ queryKey: chatKeys.conversations(userId) });
      void client.invalidateQueries({ queryKey: [...chatKeys.all(userId), 'messages'] });
    };
    const onNew = (payload: {
      conversationId: string;
      message: MessageView;
      clientMessageId?: string;
    }) => {
      const message = payload.message;
      client.setQueryData<MessagesData>(chatKeys.messages(userId, payload.conversationId), (data) =>
        upsertMessage(data, message, payload.clientMessageId),
      );
      const list = client.getQueryData<ConversationsData>(chatKeys.conversations(userId));
      const known = list?.pages.some((page) =>
        page.data.some((c) => c.id === payload.conversationId),
      );
      if (known)
        client.setQueryData<ConversationsData>(chatKeys.conversations(userId), (data) =>
          applyIncomingToConversations(data, message, userId, useOpenConversation.getState().id),
        );
      else void client.invalidateQueries({ queryKey: chatKeys.conversations(userId) });
      setTyping(payload.conversationId, message.sender.id, false);
    };
    const onEdited = (payload: { conversationId: string; message: MessageView }) =>
      client.setQueryData<MessagesData>(chatKeys.messages(userId, payload.conversationId), (data) =>
        upsertMessage(data, payload.message),
      );
    const onDeleted = (payload: { conversationId: string; messageId: string }) =>
      client.setQueryData<MessagesData>(chatKeys.messages(userId, payload.conversationId), (data) =>
        patchMessage(
          data,
          (message) => message.id === payload.messageId,
          (message) => ({ ...message, isDeleted: true, body: null }),
        ),
      );
    const onRead = (payload: { conversationId: string; userId: string; readAt: string }) =>
      applyRead(client, userId, payload);
    const onTyping = (payload: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (payload.userId !== userId)
        setTyping(payload.conversationId, payload.userId, payload.isTyping);
    };
    socket.on('newMessage', onNew);
    socket.on('messageReactionAdded', onEdited);
    socket.on('messageReactionRemoved', onEdited);
    socket.on('messageEdited', onEdited);
    socket.on('messageDeleted', onDeleted);
    socket.on('messageRead', onRead);
    socket.on('typing', onTyping);
    socket.on('conversationUpdated', refresh);
    socket.on('conversationDeleted', refresh);
    socket.on('messagesCleared', refresh);
    socket.on('resyncRequired', refresh);
    socket.on('connect', refresh);
    let refreshing = false;
    const onConnectError = (error: Error) => {
      if (refreshing || !/token|auth|unauthori[sz]ed/i.test(error.message)) return;
      refreshing = true;
      void getMobileApi()
        .get('/users/me')
        .then(() => socket.connect())
        .catch(() => undefined)
        .finally(() => {
          refreshing = false;
        });
    };
    socket.on('connect_error', onConnectError);
    if (!socket.connected) socket.connect();
    void ensureMessageIdentityRegistered();
    const heartbeat = setInterval(() => {
      if (socket.connected) socket.emit('heartbeat');
    }, 25_000);
    return () => {
      clearInterval(heartbeat);
      socket.off('newMessage', onNew);
      socket.off('messageReactionAdded', onEdited);
      socket.off('messageReactionRemoved', onEdited);
      socket.off('messageEdited', onEdited);
      socket.off('messageDeleted', onDeleted);
      socket.off('messageRead', onRead);
      socket.off('typing', onTyping);
      socket.off('conversationUpdated', refresh);
      socket.off('conversationDeleted', refresh);
      socket.off('messagesCleared', refresh);
      socket.off('resyncRequired', refresh);
      socket.off('connect', refresh);
      socket.off('connect_error', onConnectError);
    };
  }, [client, enabled, setTyping, userId]);

  React.useEffect(() => {
    if (!enabled || !openId) return;
    const socket = getChatSocket(userId);
    const join = () => socket.emit('joinConversation', { conversationId: openId });
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
      socket.emit('leaveConversation', { conversationId: openId });
    };
  }, [enabled, openId, userId]);
}

/** Emits typing start/stop around composer activity, throttled. */
export function useTypingEmitter(userId: string, conversationId: string) {
  const typing = React.useRef(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!typing.current) return;
    typing.current = false;
    getChatSocket(userId).emit('typingStop', { conversationId });
  }, [conversationId, userId]);
  const ping = React.useCallback(() => {
    const socket = getChatSocket(userId);
    if (!typing.current && socket.connected) {
      typing.current = true;
      socket.emit('typingStart', { conversationId });
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(stop, 3000);
  }, [conversationId, stop, userId]);
  React.useEffect(() => stop, [stop]);
  return { ping, stop };
}
