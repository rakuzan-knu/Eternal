import type { Paginated } from '../../common/pagination';
import type { CommentResponseDto } from '../dto/comment-response.dto';

export type GetAllCommentsResult = Paginated<CommentResponseDto>;
