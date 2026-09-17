import type { Prisma } from '@prisma/client';

export const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  bio: true,
  isPrivate: true,
  isVerified: true,
  primaryBadge: true,
  githubUsername: true,
  mergedPrsCount: true,
  badges: { select: { badgeId: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
