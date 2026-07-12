import { type Comment } from '@prisma/client';
import type { Paginated } from '../../common/pagination';

export type GetAllCommentsResult = Paginated<Comment>;
