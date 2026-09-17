import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PNCounter, type PNCounterState } from './pn-counter';
import { LWWElementSet, type LWWState } from './lww-element-set';
import { RedisService } from '../../redis/redis.service';

export interface CrdtFlushOptions {
  /** Interval between background flush cycles in ms (default: 500ms) */
  flushIntervalMs?: number;
  /** Redis key prefix for PN-Counter states (default: 'crdt:pn:') */
  pnPrefix?: string;
  /** Redis key prefix for LWW states (default: 'crdt:lww:') */
  lwwPrefix?: string;
  /** Node identifier used in PN-Counter vector (default: process.pid) */
  nodeId?: string;
}

/**
 * Registry and flush service for in-memory CRDT instances.
 *
 * Creates named PNCounter / LWWElementSet instances and runs a background
 * flush loop that persists only dirty (changed) CRDTs to Redis — avoiding
 * unnecessary I/O for unchanged state.
 *
 * Usage:
 *  const counter = crdtRegistry.getPNCounter('post:likes:abc123');
 *  counter.increment();
 *  // → flushed to Redis within flushIntervalMs automatically
 */
@Injectable()
export class CrdtRegistryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CrdtRegistryService.name);

  private readonly pnCounters = new Map<string, PNCounter>();
  private readonly lwwSets = new Map<string, LWWElementSet>();

  private readonly nodeId: string;
  private readonly pnPrefix: string;
  private readonly lwwPrefix: string;
  private readonly flushIntervalMs: number;

  private flushTimer: NodeJS.Timeout | null = null;

  constructor(private readonly redisService: RedisService) {
    this.nodeId = String(process.pid);
    this.pnPrefix = 'crdt:pn:';
    this.lwwPrefix = 'crdt:lww:';
    this.flushIntervalMs = 500;
  }

  onModuleInit(): void {
    this.flushTimer = setInterval(() => {
      void this.flushDirty();
    }, this.flushIntervalMs);
    // Allow event loop to exit even if timer is pending
    this.flushTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    // Final flush attempt (best-effort, synchronous trigger)
    void this.flushDirty();
    this.pnCounters.clear();
    this.lwwSets.clear();
  }

  // ─── PN-Counter ────────────────────────────────────────────────────────────

  /**
   * Returns (or creates) a named PNCounter.
   * Hydrates from Redis asynchronously on first access.
   */
  getPNCounter(name: string): PNCounter {
    let counter = this.pnCounters.get(name);
    if (!counter) {
      counter = new PNCounter(this.nodeId);
      this.pnCounters.set(name, counter);
      void this.hydratePNCounter(name, counter);
    }
    return counter;
  }

  // ─── LWW-Element-Set ───────────────────────────────────────────────────────

  /**
   * Returns (or creates) a named LWWElementSet.
   */
  getLWWSet(name: string, bias: 'add' | 'remove' = 'add'): LWWElementSet {
    let set = this.lwwSets.get(name);
    if (!set) {
      set = new LWWElementSet(bias);
      this.lwwSets.set(name, set);
      void this.hydrateLWWSet(name, set);
    }
    return set;
  }

  // ─── Private flush logic ───────────────────────────────────────────────────

  private async flushDirty(): Promise<void> {
    const flushes: Promise<void>[] = [];

    for (const [name, counter] of this.pnCounters) {
      if (counter.dirty) {
        flushes.push(this.flushPNCounter(name, counter));
      }
    }
    for (const [name, set] of this.lwwSets) {
      if (set.dirty) {
        flushes.push(this.flushLWWSet(name, set));
      }
    }

    if (flushes.length > 0) {
      await Promise.allSettled(flushes);
    }

    // Prune clean inactive CRDT instances if memory map exceeds max capacity
    const MAX_CRDT_INSTANCES = 10_000;
    if (this.pnCounters.size > MAX_CRDT_INSTANCES) {
      for (const [name, counter] of this.pnCounters) {
        if (!counter.dirty) {
          this.pnCounters.delete(name);
          if (this.pnCounters.size <= MAX_CRDT_INSTANCES) break;
        }
      }
    }
    if (this.lwwSets.size > MAX_CRDT_INSTANCES) {
      for (const [name, set] of this.lwwSets) {
        if (!set.dirty) {
          this.lwwSets.delete(name);
          if (this.lwwSets.size <= MAX_CRDT_INSTANCES) break;
        }
      }
    }
  }

  private async flushPNCounter(name: string, counter: PNCounter): Promise<void> {
    try {
      const state = counter.toState();
      await this.redisService.set(`${this.pnPrefix}${name}`, JSON.stringify(state), 86400);
      counter.markClean();
    } catch (err) {
      this.logger.warn(`[CRDT] Failed to flush PNCounter '${name}': ${String(err)}`);
      // Will retry on next cycle since dirty is preserved
    }
  }

  private async flushLWWSet(name: string, set: LWWElementSet): Promise<void> {
    try {
      const state = set.toState();
      await this.redisService.set(`${this.lwwPrefix}${name}`, JSON.stringify(state), 86400);
      set.markClean();
    } catch (err) {
      this.logger.warn(`[CRDT] Failed to flush LWWSet '${name}': ${String(err)}`);
      // Will retry on next cycle since dirty is preserved
    }
  }

  private async hydratePNCounter(name: string, counter: PNCounter): Promise<void> {
    try {
      const raw = await this.redisService.get(`${this.pnPrefix}${name}`);
      if (raw) {
        const state = JSON.parse(raw) as PNCounterState;
        counter.merge(state);
        counter.markClean();
      }
    } catch {
      // Non-fatal: counter starts at 0, converges on next flush cycle
    }
  }

  private async hydrateLWWSet(name: string, set: LWWElementSet): Promise<void> {
    try {
      const raw = await this.redisService.get(`${this.lwwPrefix}${name}`);
      if (raw) {
        const state = JSON.parse(raw) as LWWState;
        set.merge(state);
        set.markClean();
      }
    } catch {
      // Non-fatal
    }
  }
}
