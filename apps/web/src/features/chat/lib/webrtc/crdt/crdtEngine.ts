/**
 * Custom Conflict-Free Replicated Data Type (CRDT) Engine
 *
 * Implements pure P2P conflict resolution without a central server:
 * - Lamport Vector Clocks for causality tracking & concurrency detection
 * - Last-Write-Wins Element Set (LWW-Element-Set) with tombstone deletion
 * - State Vector & Delta Synchronization (Delta Sync) for low-bandwidth P2P transfers
 */

export class VectorClock {
  private clocks: Record<string, number>;

  constructor(initial: Record<string, number> = {}) {
    this.clocks = { ...initial };
  }

  public tick(nodeId: string): number {
    const current = this.clocks[nodeId] ?? 0;
    const next = current + 1;
    this.clocks[nodeId] = next;
    return next;
  }

  public get(nodeId: string): number {
    return this.clocks[nodeId] ?? 0;
  }

  public set(nodeId: string, counter: number): void {
    this.clocks[nodeId] = Math.max(this.clocks[nodeId] ?? 0, counter);
  }

  public merge(other: VectorClock | Record<string, number>): void {
    const otherClocks = other instanceof VectorClock ? other.clocks : other;
    for (const [nodeId, counter] of Object.entries(otherClocks)) {
      this.clocks[nodeId] = Math.max(this.clocks[nodeId] ?? 0, counter);
    }
  }

  /**
   * Returns true if this clock strictly dominates (happened after) other clock
   */
  public dominates(other: VectorClock): boolean {
    const otherClocks = other.clocks;
    let strictlyGreater = false;

    // Check all keys in other
    for (const [nodeId, otherVal] of Object.entries(otherClocks)) {
      const myVal = this.get(nodeId);
      if (myVal < otherVal) return false;
      if (myVal > otherVal) strictlyGreater = true;
    }

    // Check keys in this that might not be in other
    for (const [nodeId, myVal] of Object.entries(this.clocks)) {
      const otherVal = other.get(nodeId);
      if (myVal > otherVal) strictlyGreater = true;
    }

    return strictlyGreater;
  }

  /**
   * Returns true if two vector clocks are concurrent (neither dominates the other)
   */
  public isConcurrent(other: VectorClock): boolean {
    if (this.equals(other)) return false;
    return !this.dominates(other) && !other.dominates(this);
  }

  public equals(other: VectorClock): boolean {
    const allKeys = new Set([...Object.keys(this.clocks), ...Object.keys(other.clocks)]);
    for (const key of allKeys) {
      if (this.get(key) !== other.get(key)) return false;
    }
    return true;
  }

  public clone(): VectorClock {
    return new VectorClock(this.clocks);
  }

  public toJSON(): Record<string, number> {
    return { ...this.clocks };
  }

  public static fromJSON(json: Record<string, number>): VectorClock {
    return new VectorClock(json);
  }
}

export interface CRDTElement<T> {
  id: string;
  value: T;
  timestamp: number; // Lamport / Wall-clock timestamp (ms)
  vectorClock: Record<string, number>;
  nodeId: string;
  isDeleted: boolean; // Tombstone flag
}

export interface CRDTDelta<T> {
  senderNodeId: string;
  stateVector: Record<string, number>;
  elements: CRDTElement<T>[];
}

export type CRDTChangeListener<T> = (elements: Map<string, T>, changedIds: string[]) => void;

/**
 * LWW-Element-Set CRDT with Vector Clock causality and Delta-Sync
 */
export class LWWElementSetCRDT<T> {
  public readonly localNodeId: string;
  private readonly vectorClock: VectorClock;
  private readonly store: Map<string, CRDTElement<T>> = new Map();
  private readonly listeners: Set<CRDTChangeListener<T>> = new Set();

  constructor(localNodeId: string, initialClocks: Record<string, number> = {}) {
    this.localNodeId = localNodeId;
    this.vectorClock = new VectorClock(initialClocks);
  }

  /**
   * Inserts or updates an element in the CRDT
   */
  public set(id: string, value: T, customTimestamp?: number): CRDTElement<T> {
    const timestamp = customTimestamp ?? Date.now();
    this.vectorClock.tick(this.localNodeId);

    const newElement: CRDTElement<T> = {
      id,
      value,
      timestamp,
      vectorClock: this.vectorClock.toJSON(),
      nodeId: this.localNodeId,
      isDeleted: false,
    };

    this.store.set(id, newElement);
    this.notifyListeners([id]);
    return newElement;
  }

  /**
   * Marks an element as deleted with a tombstone
   */
  public delete(id: string, customTimestamp?: number): boolean {
    const existing = this.store.get(id);
    if (!existing || existing.isDeleted) return false;

    const timestamp = customTimestamp ?? Date.now();
    this.vectorClock.tick(this.localNodeId);

    const tombstone: CRDTElement<T> = {
      id,
      value: existing.value,
      timestamp,
      vectorClock: this.vectorClock.toJSON(),
      nodeId: this.localNodeId,
      isDeleted: true,
    };

    this.store.set(id, tombstone);
    this.notifyListeners([id]);
    return true;
  }

  public get(id: string): T | undefined {
    const entry = this.store.get(id);
    if (!entry || entry.isDeleted) return undefined;
    return entry.value;
  }

  public has(id: string): boolean {
    const entry = this.store.get(id);
    return Boolean(entry && !entry.isDeleted);
  }

  /**
   * Returns a snapshot of all active (non-deleted) elements
   */
  public getAll(): Map<string, T> {
    const active = new Map<string, T>();
    for (const [id, entry] of this.store.entries()) {
      if (!entry.isDeleted) {
        active.set(id, entry.value);
      }
    }
    return active;
  }

  /**
   * Returns state vector of highest seen sequence numbers per peer
   */
  public getStateVector(): Record<string, number> {
    return this.vectorClock.toJSON();
  }

  /**
   * Generates a compact delta package containing only entries newer
   * than the remote peer's state vector
   */
  public generateDelta(remoteStateVector: Record<string, number>): CRDTDelta<T> {
    const deltaElements: CRDTElement<T>[] = [];

    for (const element of this.store.values()) {
      const authorId = element.nodeId;
      const remoteCounter = remoteStateVector[authorId] ?? 0;
      const elementCounter = element.vectorClock[authorId] ?? 0;

      // If this element has updates newer than the remote peer has observed
      if (elementCounter > remoteCounter) {
        deltaElements.push(element);
      }
    }

    return {
      senderNodeId: this.localNodeId,
      stateVector: this.getStateVector(),
      elements: deltaElements,
    };
  }

  /**
   * Merges an incoming CRDT delta, applying LWW conflict resolution
   */
  public applyDelta(delta: CRDTDelta<T>): { updatedIds: string[]; changed: boolean } {
    const updatedIds: string[] = [];

    // Merge incoming vector clock
    this.vectorClock.merge(delta.stateVector);

    for (const incoming of delta.elements) {
      const existing = this.store.get(incoming.id);

      if (!existing) {
        this.store.set(incoming.id, incoming);
        updatedIds.push(incoming.id);
        continue;
      }

      // Conflict Resolution: LWW (Last-Write-Wins)
      // 1. Compare timestamps
      if (incoming.timestamp > existing.timestamp) {
        this.store.set(incoming.id, incoming);
        updatedIds.push(incoming.id);
      } else if (incoming.timestamp === existing.timestamp) {
        // 2. Deterministic Tie Breaker: Lexicographical node ID comparison
        if (incoming.nodeId.localeCompare(existing.nodeId) > 0) {
          this.store.set(incoming.id, incoming);
          updatedIds.push(incoming.id);
        } else if (incoming.nodeId === existing.nodeId) {
          // 3. Exact tie: Tombstones (deletions) take precedence
          if (incoming.isDeleted && !existing.isDeleted) {
            this.store.set(incoming.id, incoming);
            updatedIds.push(incoming.id);
          }
        }
      }
    }

    if (updatedIds.length > 0) {
      this.notifyListeners(updatedIds);
    }

    return { updatedIds, changed: updatedIds.length > 0 };
  }

  public subscribe(listener: CRDTChangeListener<T>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(changedIds: string[]): void {
    const all = this.getAll();
    for (const listener of this.listeners) {
      try {
        listener(all, changedIds);
      } catch (err) {
        console.warn('[CRDT] Listener error:', err);
      }
    }
  }
}
