import type { Paginated } from '../../common/pagination';
import type { CommentResponseDto } from '@common/contracts';

export type GetAllCommentsResult = Paginated<CommentResponseDto>;
