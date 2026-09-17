/**
 * V8 WeakRef & FinalizationRegistry Native Leak-Free Cache
 *
 * Traditional in-memory caches hold strong references (`Map<string, HeavyData>`).
 * Under high loads or traffic spikes, thousands of temporary objects or session tokens
 * remain anchored in memory until an explicit TTL timer or LRU eviction runs.
 *
 * This implementation uses:
 *  1. `WeakRef<T>`: Holds a weak reference to cached objects. V8's Garbage Collector
 *     is free to reclaim them at any time during load drops or memory pressure.
 *  2. `FinalizationRegistry`: Automatically notified by V8 when an object is collected,
 *     allowing instant removal of the dead key from the internal Map without manual pruning.
 *  3. Survivor Ring: A tiny, fixed-size cyclic array that keeps hot objects alive
 *     across the current event loop turns before letting them become weakly held.
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

  /**
   * @param name Diagnostic identifier
   * @param survivorRingSize Number of recently added objects to temporarily retain strongly
   *                         across short-lived event loop microtasks (default 32)
   */
  constructor(
    public readonly name: string = 'weak-ref-cache',
    private readonly survivorRingSize = 32,
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

  /**
   * Stores a value in the cache with weak retention.
   */
  set(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      this.registry.unregister(existing);
    }

    const ref = new WeakRef(value);
    this.map.set(key, ref);
    this.registry.register(value, key, ref);

    // Keep recent items alive in survivor ring so they survive immediate minor GCs
    if (this.survivorRingSize > 0) {
      this.survivorRing[this.survivorIndex] = value;
      this.survivorIndex = (this.survivorIndex + 1) % this.survivorRingSize;
    }
  }

  /**
   * Retrieves a value if it has not yet been collected by V8's GC.
   */
  get(key: K): V | undefined {
    const ref = this.map.get(key);
    if (!ref) {
      this.misses++;
      return undefined;
    }

    const target = ref.deref();
    if (target === undefined) {
      // Object has been collected by GC
      this.map.delete(key);
      this.evictions++;
      this.misses++;
      return undefined;
    }

    this.hits++;
    return target;
  }

  /**
   * Checks whether the key exists and its object is still alive in memory.
   */
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

  /**
   * Removes an entry manually.
   */
  delete(key: K): boolean {
    const ref = this.map.get(key);
    if (ref) {
      this.registry.unregister(ref);
      return this.map.delete(key);
    }
    return false;
  }

  /**
   * Clears the cache and survivor ring.
   */
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

/**
 * WeakSessionMap: Attaches ephemeral metadata to session/user objects
 * without preventing them from being garbage collected.
 */
export class WeakSessionMap<K extends object, V> {
  private readonly weakMap = new WeakMap<K, V>();

  get(target: K): V | undefined {
    return this.weakMap.get(target);
  }

  set(target: K, value: V): this {
    this.weakMap.set(target, value);
    return this;
  }

  has(target: K): boolean {
    return this.weakMap.has(target);
  }

  delete(target: K): boolean {
    return this.weakMap.delete(target);
  }
}
