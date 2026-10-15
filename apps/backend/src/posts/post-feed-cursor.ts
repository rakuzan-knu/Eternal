import { BadRequestException } from '@nestjs/common';
import { paginate, type Paginated } from '../common/pagination';

const PREFIX = 'pf1:';
const RELATION_BOUNDARY = Symbol('post-feed-relation-boundary');
type Row = { id: string; createdAt?: Date | string; [RELATION_BOUNDARY]?: string };
type BoundaryWhere = { OR: [{ createdAt: { lt: Date } }, { createdAt: Date; id: { lt: string } }] };

/** A boundary contains its ordering values, so deleting its row cannot erase it. */
export function postFeedCursor(row: Row): string {
  if (row[RELATION_BOUNDARY]) return row[RELATION_BOUNDARY];
  if (!row.createdAt) return row.id;
  const date = new Date(row.createdAt);
  if (!Number.isFinite(date.getTime())) return row.id;
  return PREFIX + Buffer.from(JSON.stringify([date.toISOString(), row.id])).toString('base64url');
}
export function postFeedBoundary(after?: string): BoundaryWhere | undefined {
  if (!after?.startsWith(PREFIX)) return;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(after.slice(PREFIX.length), 'base64url').toString('utf8'),
    );
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 2 ||
      typeof parsed[0] !== 'string' ||
      typeof parsed[1] !== 'string' ||
      !parsed[1] ||
      parsed[1].length > 64
    )
      throw new Error('Invalid cursor');
    const date = new Date(parsed[0]);
    if (!Number.isFinite(date.getTime())) throw new Error('Invalid cursor');
    return { OR: [{ createdAt: { lt: date } }, { createdAt: date, id: { lt: parsed[1] } }] };
  } catch {
    throw new BadRequestException('Invalid post feed cursor');
  }
}
/** Saved/repost ordering belongs to the relation, rather than to the post. */
export function withPostFeedBoundary<T extends Row>(
  post: T,
  relation: { id?: string; createdAt?: Date | string },
): T {
  if (relation.id && relation.createdAt)
    Object.defineProperty(post, RELATION_BOUNDARY, {
      value: postFeedCursor({ id: relation.id, createdAt: relation.createdAt }),
    });
  return post;
}
export function paginatePostFeed<TItem extends Row, TData>(
  rows: TItem[],
  limit: number,
  map: (row: TItem) => TData,
): Paginated<TData> {
  const result = paginate(rows, limit, map);
  if (result.meta.hasNextPage && limit > 0)
    result.meta.nextCursor = postFeedCursor(rows[limit - 1]);
  return result;
}
