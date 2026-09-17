/**
 * Frontend V8 WeakRef & FinalizationRegistry Leak-Free In-Memory Cache
 *
 * Prevents memory leaks in SPA client applications when caching crypto keys,
 * temporary session objects, or parsed message blobs.
 * Entries are reclaimed automatically by the browser's Garbage Collector.
 */

export interface CacheStats {
  readonly name: string;
  readonly size: number;
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
}

export class WeakRefCache<K extends string | number, V extends object> {
  private readonly map = new Map<K, WeakRef<V>>();
  private readonly registry: FinalizationRegistry<K>;
  private readonly survivorRing: (V | null)[];
  private survivorIndex = 0;

  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(
    public readonly name: string = 'frontend-weak-ref-cache',
    private readonly survivorRingSize = 16,
  ) {
    this.survivorRing = new Array<V | null>(survivorRingSize).fill(null);

    this.registry = new FinalizationRegistry<K>((deadKey: K) => {
      const ref = this.map.get(deadKey);
      if (ref && ref.deref() === undefined) {
        this.map.delete(deadKey);
        this.evictions++;
      }
    });
  }

  set(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      this.registry.unregister(existing);
    }

    const ref = new WeakRef(value);
    this.map.set(key, ref);
    this.registry.register(value, key, ref);

    if (this.survivorRingSize > 0) {
      this.survivorRing[this.survivorIndex] = value;
      this.survivorIndex = (this.survivorIndex + 1) % this.survivorRingSize;
    }
  }

  get(key: K): V | undefined {
    const ref = this.map.get(key);
    if (!ref) {
      this.misses++;
      return undefined;
    }

    const target = ref.deref();
    if (target === undefined) {
      this.map.delete(key);
      this.evictions++;
      this.misses++;
      return undefined;
    }

    this.hits++;
    return target;
  }

  has(key: K): boolean {
    const ref = this.map.get(key);
    if (!ref) return false;
    const target = ref.deref();
    if (target === undefined) {
      this.map.delete(key);
      this.evictions++;
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    const ref = this.map.get(key);
    if (ref) {
      this.registry.unregister(ref);
      return this.map.delete(key);
    }
    return false;
  }

  clear(): void {
    for (const ref of this.map.values()) {
      this.registry.unregister(ref);
    }
    this.map.clear();
    this.survivorRing.fill(null);
    this.survivorIndex = 0;
  }

  get size(): number {
    return this.map.size;
  }

  getStats(): CacheStats {
    return {
      name: this.name,
      size: this.map.size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
    };
  }
}
