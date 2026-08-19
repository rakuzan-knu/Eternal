import { apiClient as api } from '@/shared/api/httpClient';
import { CommentType } from '@/entities/comment/model/types';
import { formatRelativeTime } from '@/shared/lib/formatRelativeTime';

export interface CommentListPage {
  comments: CommentType[];
  nextCursor?: string | null;
}

export function normalizeComment(c: Record<string, unknown> | null | undefined): CommentType {
  if (!c) {
    return {
      id: '',
      author: 'User',
      handle: 'user',
      avatar: null,
      text: '',
      time: 'just now',
      userId: '',
    };
  }

  const userObj = c.user as Record<string, unknown> | undefined;
  const replyToObj = c.replyToUser as Record<string, unknown> | undefined;

  return {
    id: String(c.id ?? ''),
    author:
      (c.author as string | undefined) ??
      (userObj?.displayName as string | undefined) ??
      (userObj?.username as string | undefined) ??
      'User',
    handle: (c.handle as string | undefined) ?? (userObj?.username as string | undefined) ?? 'user',
    avatar:
      (c.avatar as string | null | undefined) ??
      (userObj?.avatar as string | null | undefined) ??
      null,
    text: (c.text as string | undefined) ?? '',
    time: c.createdAt ? formatRelativeTime(c.createdAt as string) : 'just now',
    createdAt: c.createdAt as string | undefined,
    parentId: (c.parentId as string | null | undefined) ?? null,
    rootParentId: (c.rootParentId as string | null | undefined) ?? null,
    replyToUserId: (c.replyToUserId as string | null | undefined) ?? null,
    replyToUser: replyToObj
      ? {
          id: String(replyToObj.id ?? ''),
          username: String(replyToObj.username ?? 'user'),
          displayName:
            (replyToObj.displayName as string | undefined) ?? String(replyToObj.username ?? 'user'),
        }
      : null,
    mediaUrl: (c.mediaUrl as string | null | undefined) ?? null,
    userId: (c.userId as string | undefined) ?? '',
    isVerified: Boolean(c.isVerified ?? userObj?.isVerified),
    primaryBadge:
      (c.primaryBadge as string | null | undefined) ??
      (userObj?.primaryBadge as string | null | undefined) ??
      null,
    likesCount: Number(c.likesCount ?? 0),
    replyCount: Number(c.replyCount ?? 0),
    isLiked: Boolean(c.isLiked),
    isLikedByAuthor: Boolean(c.isLikedByAuthor),
    isPinned: Boolean(c.isPinned),
    isDeleted: Boolean(c.isDeleted),
  };
}

export const commentsApi = {
  getComments: async (
    postId: string | number,
    cursor?: string,
    limit = 20,
  ): Promise<CommentListPage> => {
    const res = await api.get<Record<string, unknown>>(`/posts/${postId}/comments`, {
      params: { after: cursor, limit },
    });
    const raw = res.data;
    const rawList = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.comments)
        ? raw.comments
        : Array.isArray(raw)
          ? raw
          : [];
    const meta = raw?.meta as { nextCursor?: string | null } | undefined;
    const nextCursor = meta?.nextCursor ?? (raw?.nextCursor as string | null | undefined) ?? null;
    return {
      comments: (rawList as Record<string, unknown>[]).map(normalizeComment),
      nextCursor,
    };
  },

  getReplies: async (
    rootCommentId: string,
    cursor?: string,
    limit = 20,
  ): Promise<CommentListPage> => {
    const res = await api.get<Record<string, unknown>>(`/comments/${rootCommentId}/replies`, {
      params: { after: cursor, limit },
    });
    const raw = res.data;
    const rawList = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.comments)
        ? raw.comments
        : Array.isArray(raw)
          ? raw
          : [];
    const meta = raw?.meta as { nextCursor?: string | null } | undefined;
    const nextCursor = meta?.nextCursor ?? (raw?.nextCursor as string | null | undefined) ?? null;
    return {
      comments: (rawList as Record<string, unknown>[]).map(normalizeComment),
      nextCursor,
    };
  },

  addComment: async (
    postId: string | number,
    text: string,
    parentId?: string,
    mediaUrl?: string,
    replyToUserId?: string,
    clientMutationId?: string,
  ): Promise<CommentType> => {
    const res = await api.post<Record<string, unknown>>(`/posts/${postId}/comments`, {
      text,
      parentId,
      mediaUrl,
      replyToUserId,
      clientMutationId,
    });
    return normalizeComment(res.data);
  },

  toggleLike: async (commentId: string): Promise<{ isLiked: boolean; likesCount: number }> => {
    const res = await api.post<{ isLiked: boolean; likesCount: number }>(
      `/comments/${commentId}/like`,
    );
    return res.data;
  },

  togglePin: async (commentId: string): Promise<{ isPinned: boolean }> => {
    const res = await api.post<{ isPinned: boolean }>(`/comments/${commentId}/pin`);
    return res.data;
  },

  deleteComment: async (commentId: string | number): Promise<void> => {
    await api.delete(`/comments/${commentId}`);
  },

  uploadMedia: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ url: string }>('/comments/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data?.url || '';
  },
};
