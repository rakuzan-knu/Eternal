import { InMemoryBloomFilter } from '../in-memory-bloom-filter';

describe('InMemoryBloomFilter', () => {
  it('should reliably identify definitely absent items with zero false negatives', () => {
    const filter = new InMemoryBloomFilter({ expectedElements: 1000, falsePositiveRate: 0.001 });

    const inserted = ['alex', 'dmitry', 'katya', 'user_123', 'admin@example.com'];
    for (const item of inserted) {
      filter.add(item);
    }

    // Must return true for all inserted elements (zero false negatives)
    for (const item of inserted) {
      expect(filter.has(item)).toBe(true);
    }

    // Must return false for uninserted elements (with high probability)
    const absent = ['non_existent_user_999', 'random_email_404@test.com', 'anonymous_user'];
    for (const item of absent) {
      expect(filter.has(item)).toBe(false);
    }
  });

  it('should support clearing bits without reallocating arrays', () => {
    const filter = new InMemoryBloomFilter({ expectedElements: 100, falsePositiveRate: 0.01 });
    filter.add('temp_user');
    expect(filter.has('temp_user')).toBe(true);

    filter.clear();
    expect(filter.count).toBe(0);
    expect(filter.has('temp_user')).toBe(false);
  });
});
