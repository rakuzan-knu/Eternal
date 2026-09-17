import { paginate } from '../pagination';

describe('paginate utility', () => {
  interface MockItem {
    id: string;
    title: string;
  }

  const mapItem = (item: MockItem) => ({
    identifier: item.id,
    displayTitle: item.title.toUpperCase(),
  });

  it('returns empty data with null cursor when input array is empty', () => {
    const result = paginate([], 10, mapItem);

    expect(result).toEqual({
      data: [],
      meta: {
        nextCursor: null,
        hasNextPage: false,
      },
    });
  });

  it('returns all items with null cursor when count is less than limit', () => {
    const items: MockItem[] = [
      { id: '1', title: 'First' },
      { id: '2', title: 'Second' },
    ];

    const result = paginate(items, 5, mapItem);

    expect(result).toEqual({
      data: [
        { identifier: '1', displayTitle: 'FIRST' },
        { identifier: '2', displayTitle: 'SECOND' },
      ],
      meta: {
        nextCursor: null,
        hasNextPage: false,
      },
    });
  });

  it('returns all items with null cursor when count exactly equals limit', () => {
    const items: MockItem[] = [
      { id: '1', title: 'First' },
      { id: '2', title: 'Second' },
    ];

    const result = paginate(items, 2, mapItem);

    expect(result).toEqual({
      data: [
        { identifier: '1', displayTitle: 'FIRST' },
        { identifier: '2', displayTitle: 'SECOND' },
      ],
      meta: {
        nextCursor: null,
        hasNextPage: false,
      },
    });
  });

  it('slices data to limit and returns cursor when count exceeds limit', () => {
    const items: MockItem[] = [
      { id: 'item-1', title: 'One' },
      { id: 'item-2', title: 'Two' },
      { id: 'item-3', title: 'Three' },
    ];

    const result = paginate(items, 2, mapItem);

    expect(result).toEqual({
      data: [
        { identifier: 'item-1', displayTitle: 'ONE' },
        { identifier: 'item-2', displayTitle: 'TWO' },
      ],
      meta: {
        nextCursor: 'item-2',
        hasNextPage: true,
      },
    });
  });
});
