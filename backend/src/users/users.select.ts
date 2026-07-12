import type { Prisma } from '@prisma/client';

export const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
