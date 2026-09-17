import { Injectable } from '@nestjs/common';
import { InMemoryBloomFilter, type BloomFilterOptions } from './in-memory-bloom-filter';

/**
 * Named instances with tuned parameters for each use-case.
 * All instances live for the process lifetime — warm from startup.
 */
const FILTER_CONFIGS: Record<string, BloomFilterOptions> = {
  // Usernames: ~500k expected, 0.01% FPR → ~1.2 MB bit-array
  username: { expectedElements: 500_000, falsePositiveRate: 0.0001 },
  // Emails: same scale
  email: { expectedElements: 500_000, falsePositiveRate: 0.0001 },
  // JWT IDs (JTIs): short-lived tokens, keep filter small
  jti: { expectedElements: 100_000, falsePositiveRate: 0.001 },
  // Message read receipts: per-conversation sets are small
  messageRead: { expectedElements: 50_000, falsePositiveRate: 0.01 },
};

/**
 * Injectable wrapper for in-memory Bloom Filters.
 *
 * Provides named filter instances for common membership pre-checks.
 * Filters answer "definitely NOT present" with zero I/O, eliminating
 * redundant DB SELECT queries for the majority of lookups.
 */
@Injectable()
export class InMemoryBloomFilterService {
  private readonly filters = new Map<string, InMemoryBloomFilter>();

  /**
   * Returns the named filter, creating it with default config if not present.
   */
  getFilter(name: string, options?: BloomFilterOptions): InMemoryBloomFilter {
    let filter = this.filters.get(name);
    if (!filter) {
      const config = options ??
        FILTER_CONFIGS[name] ?? { expectedElements: 10_000, falsePositiveRate: 0.01 };
      filter = new InMemoryBloomFilter(config);
      this.filters.set(name, filter);
    }
    return filter;
  }

  /** Shorthand: add element to named filter */
  add(filterName: string, element: string): void {
    this.getFilter(filterName).add(element);
  }

  /**
   * Shorthand: test element in named filter.
   * Returns false → definitely not present (no DB needed).
   * Returns true → probably present (may need DB confirmation).
   */
  has(filterName: string, element: string): boolean {
    const filter = this.filters.get(filterName);
    if (!filter) return false; // filter not initialized → can't confirm absence
    return filter.has(element);
  }

  /**
   * Returns false if the filter is certain the element is absent.
   * Semantic inverse of has() — more readable at call sites.
   */
  definitelyAbsent(filterName: string, element: string): boolean {
    return !this.has(filterName, element);
  }

  /** Clear a specific named filter (e.g. after bulk data import). */
  clear(filterName: string): void {
    this.filters.get(filterName)?.clear();
  }

  /** Stats for observability / metrics. */
  getStats(filterName: string): { count: number; fpr: number; bitCapacity: number } | null {
    const f = this.filters.get(filterName);
    if (!f) return null;
    return {
      count: f.count,
      fpr: f.estimatedFalsePositiveRate,
      bitCapacity: f.bitCapacity,
    };
  }
}
