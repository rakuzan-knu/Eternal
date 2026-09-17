import { ObjectPool } from '../object-pool';

describe('ObjectPool', () => {
  it('acquires pre-allocated items from pool', () => {
    let createCount = 0;
    const pool = new ObjectPool<{ id: number; data: string }>({
      initialCapacity: 3,
      factory: () => ({ id: ++createCount, data: '' }),
    });

    expect(pool.size).toBe(3);

    const item1 = pool.acquire();
    const item2 = pool.acquire();

    expect(pool.size).toBe(1);
    expect(createCount).toBe(3);

    pool.release(item1);
    expect(pool.size).toBe(2);

    pool.release(item2);
    expect(pool.size).toBe(3);
  });

  it('allocates new items when pool is depleted and honors maxCapacity on release', () => {
    const pool = new ObjectPool<{ val: number }>({
      initialCapacity: 1,
      maxCapacity: 2,
      factory: () => ({ val: 1 }),
      resetFn: (item) => {
        item.val = 0;
      },
    });

    const item1 = pool.acquire();
    const item2 = pool.acquire(); // creates new
    const item3 = pool.acquire(); // creates new

    expect(pool.size).toBe(0);

    item1.val = 10;
    pool.release(item1);
    expect(item1.val).toBe(0);
    expect(pool.size).toBe(1);

    pool.release(item2);
    expect(pool.size).toBe(2);

    pool.release(item3); // dropped due to maxCapacity = 2
    expect(pool.size).toBe(2);
  });

  it('runWith safely acquires and releases item', () => {
    const pool = new ObjectPool<{ active: boolean }>({
      initialCapacity: 2,
      factory: () => ({ active: false }),
      resetFn: (item) => {
        item.active = false;
      },
    });

    const result = pool.runWith((item) => {
      item.active = true;
      return 'done';
    });

    expect(result).toBe('done');
    expect(pool.size).toBe(2);
  });

  it('runWithAsync safely acquires and releases item', async () => {
    const pool = new ObjectPool<{ count: number }>({
      initialCapacity: 2,
      factory: () => ({ count: 0 }),
      resetFn: (item) => {
        item.count = 0;
      },
    });

    const result = await pool.runWithAsync(async (item) => {
      item.count = 42;
      return Promise.resolve(item.count);
    });

    expect(result).toBe(42);
    expect(pool.size).toBe(2);
  });

  it('clear() empties the pool', () => {
    const pool = new ObjectPool<{ id: number }>({
      initialCapacity: 5,
      factory: () => ({ id: 1 }),
    });

    expect(pool.size).toBe(5);
    pool.clear();
    expect(pool.size).toBe(0);
  });
});
