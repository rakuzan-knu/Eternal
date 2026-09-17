import { Injectable } from '@nestjs/common';
import type {
  MessageView,
  ConversationView,
  ParticipantView,
  ReactionSummary,
} from '@common/contracts';
import {
  DEFAULT_MEMBER_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_OWNER_PERMISSIONS,
} from '@common/contracts';
import { makeReactionSummary } from '../common/v8/shape-stable';
import type {
  MessageWithDetails,
  ConversationWithDetails,
  ParticipantWithUser,
} from './interfaces/types';

@Injectable()
export class MessengerMapper {
  mapMessage(
    msg: MessageWithDetails,
    requestingUserId: string,
    pinnedMessageIds: Set<string> = new Set(),
  ): MessageView {
    const reactionMap = new Map<
      string,
      { count: number; selfReacted: boolean; users: MessageWithDetails['sender'][] }
    >();

    for (const r of msg.reactions ?? []) {
      const entry = reactionMap.get(r.emoji) ?? {
        count: 0,
        selfReacted: false,
        users: [],
      };
      entry.count++;
      if (r.userId === requestingUserId) entry.selfReacted = true;
      if (entry.users.length < 5) {
        const rWithUser = r as unknown as { user: MessageWithDetails['sender'] };
        entry.users.push(rWithUser.user);
      }
      reactionMap.set(r.emoji, entry);
    }

    const reactions: ReactionSummary[] = Array.from(reactionMap.entries()).map(([emoji, data]) =>
      makeReactionSummary(emoji, data.count, data.selfReacted, data.users),
    );

    const isDeletedForMe = msg.deletedFor?.some((d) => d.userId === requestingUserId) ?? false;
    const isMessageHidden = isDeletedForMe || msg.deletedForAll;

    const readBy: string[] = (msg.conversation?.participants ?? [])
      .filter((p) => p.userId !== msg.senderId && p.lastReadAt.getTime() >= msg.createdAt.getTime())
      .map((p) => p.userId);

    return {
      id: msg.id,
      conversationId: msg.conversationId,
      sender: msg.sender,
      body: isMessageHidden ? null : (msg.body ?? null),
      clientSeq: msg.clientSeq != null ? msg.clientSeq | 0 : null,
      messageType: msg.messageType,
      replyTo: msg.replyTo
        ? this.mapMessage(
            msg.replyTo as unknown as MessageWithDetails,
            requestingUserId,
            pinnedMessageIds,
          )
        : null,
      forwardedFrom: msg.forwardedFrom
        ? {
            id: msg.forwardedFrom.id,
            body: msg.forwardedFrom.body ?? null,
            sender: (msg.forwardedFrom as unknown as { sender: MessageWithDetails['sender'] })
              .sender,
          }
        : null,

      attachments: isMessageHidden
        ? []
        : (msg.attachments ?? []).map((a) => ({
            id: a.id,
            type: a.type,
            url: a.url,
            fileName: a.fileName ?? null,
            mimeType: a.mimeType ?? null,
            size: a.size != null ? a.size | 0 : null,
            width: a.width != null ? a.width | 0 : null,
            height: a.height != null ? a.height | 0 : null,
            duration: a.duration != null ? a.duration | 0 : null,
            thumbnailUrl: a.thumbnailUrl ?? null,
            waveform: (a as unknown as { waveform?: number[] }).waveform,
            isSpoiler: Boolean((a as unknown as { isSpoiler?: boolean }).isSpoiler),
          })),

      reactions,
      readBy,
      isEdited: !!msg.editedAt,
      isDeleted: msg.deletedForAll || isDeletedForMe,
      isPinned: pinnedMessageIds.has(msg.id),
      createdAt: msg.createdAt,
      editedAt: msg.editedAt ?? null,
    };
  }

  mapParticipant(p: ParticipantWithUser): ParticipantView {
    const effectiveTheme =
      p.theme && p.theme !== 'default' && p.theme.trim() !== ''
        ? p.theme
        : ((p.user as unknown as { defaultChatTheme?: string | null })?.defaultChatTheme ??
          'default');

    const defaultPermissions =
      p.role === 'OWNER'
        ? DEFAULT_OWNER_PERMISSIONS
        : p.role === 'ADMIN'
          ? DEFAULT_ADMIN_PERMISSIONS
          : DEFAULT_MEMBER_PERMISSIONS;

    const permissions =
      (p as unknown as { permissions?: number }).permissions !== undefined &&
      (p as unknown as { permissions?: number }).permissions !== 0
        ? (p as unknown as { permissions: number }).permissions | 0
        : defaultPermissions | 0;

    return {
      userId: p.userId,
      user: p.user,
      nickname: p.nickname ?? null,
      role: p.role,
      permissions,
      theme: effectiveTheme,
      muteLevel: p.muteLevel,
      mutedUntil: p.mutedUntil ?? null,
      joinedAt: p.joinedAt,
    };
  }

  mapConversation(
    conv: ConversationWithDetails,
    requestingUserId: string,
    unreadCount: number,
    blockCtx?: { blockedByMe: Set<string>; blockingMe: Set<string> },
  ): ConversationView {
    const myParticipant = conv.participants.find((p) => p.userId === requestingUserId);
    const myUser =
      myParticipant?.user ?? conv.participants.find((p) => p.userId === requestingUserId)?.user;
    const participantTheme = myParticipant?.theme;
    const effectiveTheme =
      participantTheme && participantTheme !== 'default' && participantTheme.trim() !== ''
        ? participantTheme
        : ((myUser as unknown as { defaultChatTheme?: string | null })?.defaultChatTheme ??
          'default');

    const pinnedMessageIds = new Set((conv.pinnedMessages ?? []).map((pm) => pm.messageId));

    const pinnedMessages = (conv.pinnedMessages ?? []).map((pm) =>
      this.mapMessage(pm.message, requestingUserId, pinnedMessageIds),
    );

    const blockedByMe = blockCtx?.blockedByMe ?? new Set<string>();
    const blockingMe = blockCtx?.blockingMe ?? new Set<string>();
    const otherUserId =
      conv.type === 'DIRECT'
        ? conv.participants.find((p) => p.userId !== requestingUserId)?.userId
        : undefined;
    const iBlockedThem = !!otherUserId && blockedByMe.has(otherUserId);
    const theyBlockedMe = !!otherUserId && blockingMe.has(otherUserId);

    const lastRaw = conv.messages && conv.messages.length > 0 ? conv.messages[0] : null;
    const lastSenderHidden =
      !!lastRaw && (blockedByMe.has(lastRaw.senderId) || blockingMe.has(lastRaw.senderId));
    const lastMessage =
      lastRaw && !lastSenderHidden
        ? this.mapMessage(lastRaw, requestingUserId, pinnedMessageIds)
        : null;

    const isMuteExpired =
      myParticipant?.mutedUntil && new Date(myParticipant.mutedUntil).getTime() <= Date.now();
    const effectiveMuteLevel = isMuteExpired ? 'NONE' : (myParticipant?.muteLevel ?? 'NONE');

    return {
      id: conv.id,
      type: conv.type,
      name: conv.name ?? null,
      avatar: conv.avatar ?? null,
      description: conv.description ?? null,
      createdById: conv.createdById ?? null,
      participants: conv.participants.map((p) => this.mapParticipant(p)),
      lastMessage,
      unreadCount: unreadCount | 0,
      myTheme: effectiveTheme,
      myMuteLevel: effectiveMuteLevel,
      myMutedUntil: isMuteExpired ? null : (myParticipant?.mutedUntil ?? null),
      myNickname: myParticipant?.nickname ?? null,
      isArchived: Boolean(myParticipant?.archivedAt),
      isPinned: Boolean(myParticipant?.pinnedAt),
      blockedByMe: iBlockedThem,
      blockingMe: theyBlockedMe,
      isBlocked: iBlockedThem || theyBlockedMe,
      pinnedMessages,
      sharedTheme: conv.sharedTheme ?? null,
      sharedThemeUpdatedAt: conv.sharedThemeUpdatedAt ?? null,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  }
}
