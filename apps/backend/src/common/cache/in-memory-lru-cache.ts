interface LruNode<K, V> {
  key: K;
  value: V;
  expiresAt: number;
  prev: LruNode<K, V> | null;
  next: LruNode<K, V> | null;
}

export interface LruCacheOptions {
  maxSize?: number;
  defaultTtlSeconds?: number;
}

export interface LruCacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  evictions: number;
  isDegraded: boolean;
  degradedSince?: string | undefined;
}

/**
 * High-performance In-Memory LRU Cache with TTL support and O(1) operations.
 * Implemented with a Doubly-Linked List and Hash Map.
 *
 * Designed as a resilient fallback cache when primary distributed cache (Redis)
 * is down or saturated, enabling the application to continue serving feed,
 * messages, and user queries in degraded read-only mode without 500 errors.
 */
export class InMemoryLruCache<K = string, V = unknown> {
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;

  private readonly map = new Map<K, LruNode<K, V>>();
  private head: LruNode<K, V> | null = null;
  private tail: LruNode<K, V> | null = null;

  private hits = 0;
  private misses = 0;
  private evictions = 0;

  private degraded = false;
  private degradedSinceDate?: Date | undefined;

  constructor(options?: LruCacheOptions) {
    this.maxSize = Math.max(10, options?.maxSize ?? 10_000);
    this.defaultTtlMs = Math.max(1_000, (options?.defaultTtlSeconds ?? 300) * 1_000);
  }

  get size(): number {
    return this.map.size;
  }

  isDegraded(): boolean {
    return this.degraded;
  }

  setDegraded(degraded: boolean): void {
    if (this.degraded !== degraded) {
      this.degraded = degraded;
      this.degradedSinceDate = degraded ? new Date() : undefined;
    }
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) {
      this.misses++;
      return undefined;
    }

    // Check TTL expiration
    if (Date.now() > node.expiresAt) {
      this.deleteNode(node);
      this.misses++;
      return undefined;
    }

    this.hits++;
    this.moveToHead(node);
    return node.value;
  }

  set(key: K, value: V, ttlSeconds?: number): void {
    const ttlMs = ttlSeconds ? ttlSeconds * 1_000 : this.defaultTtlMs;
    const expiresAt = Date.now() + ttlMs;

    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      existing.expiresAt = expiresAt;
      this.moveToHead(existing);
      return;
    }

    const newNode: LruNode<K, V> = {
      key,
      value,
      expiresAt,
      prev: null,
      next: null,
    };

    this.map.set(key, newNode);
    this.attachToHead(newNode);

    // Evict oldest node if exceeding capacity
    if (this.map.size > this.maxSize && this.tail) {
      this.deleteNode(this.tail);
      this.evictions++;
    }
  }

  has(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    if (Date.now() > node.expiresAt) {
      this.deleteNode(node);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    this.deleteNode(node);
    return true;
  }

  deleteByPattern(pattern: string): number {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const regex = new RegExp(`^${escaped}$`);
    let count = 0;
    for (const [key, node] of this.map.entries()) {
      if (typeof key === 'string' && regex.test(key)) {
        this.deleteNode(node);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [, node] of this.map.entries()) {
      if (now > node.expiresAt) {
        this.deleteNode(node);
        pruned++;
      }
    }
    return pruned;
  }

  getStats(): LruCacheStats {
    return {
      size: this.map.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      isDegraded: this.degraded,
      degradedSince: this.degradedSinceDate?.toISOString(),
    };
  }

  private attachToHead(node: LruNode<K, V>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private moveToHead(node: LruNode<K, V>): void {
    if (node === this.head) return;

    // Detach from current position
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
    if (node === this.tail) {
      this.tail = node.prev;
    }

    // Attach as new head
    this.attachToHead(node);
  }

  private deleteNode(node: LruNode<K, V>): void {
    this.map.delete(node.key);

    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }

    if (node === this.head) {
      this.head = node.next;
    }
    if (node === this.tail) {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
  }
}
