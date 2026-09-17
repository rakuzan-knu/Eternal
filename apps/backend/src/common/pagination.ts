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
  const count = hasNextPage ? limit : rows.length;
  const nextCursor = hasNextPage && count > 0 ? rows[count - 1].id : null;

  // Pre-allocate exact buffer upfront to prevent V8 array backing-store doubling
  const data = new Array<TData>(count);
  for (let i = 0; i < count; i++) {
    data[i] = map(rows[i]);
  }

  return {
    data,
    meta: { nextCursor, hasNextPage },
  };
}
