export type Paginated<T> = {
  data: T[];
  meta: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
};

export function paginate<TItem extends { id: string }, TData>(
  rows: TItem[],
  limit: number,
  map: (item: TItem) => TData,
): Paginated<TData> {
  const hasNextPage = rows.length > limit;
  const page = hasNextPage ? rows.slice(0, limit) : rows;
  const nextCursor = hasNextPage ? page[page.length - 1].id : null;
  return {
    data: page.map(map),
    meta: { nextCursor, hasNextPage },
  };
}
