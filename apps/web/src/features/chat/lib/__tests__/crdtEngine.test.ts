import { describe, it, expect, vi } from 'vitest';
import { VectorClock, LWWElementSetCRDT } from '../webrtc/crdt/crdtEngine';

describe('CRDT Engine (Vector Clocks & LWW-Element-Set)', () => {
  describe('VectorClock', () => {
    it('increments sequence counter monotonically on tick', () => {
      const clock = new VectorClock();
      expect(clock.tick('peerA')).toBe(1);
      expect(clock.tick('peerA')).toBe(2);
      expect(clock.get('peerA')).toBe(2);
      expect(clock.get('peerB')).toBe(0);
    });

    it('correctly assesses dominance (causality)', () => {
      const clock1 = new VectorClock({ peerA: 2, peerB: 1 });
      const clock2 = new VectorClock({ peerA: 1, peerB: 1 });

      expect(clock1.dominates(clock2)).toBe(true);
      expect(clock2.dominates(clock1)).toBe(false);
    });

    it('detects concurrent clocks (divergent parallel edits)', () => {
      const clockA = new VectorClock({ peerA: 2, peerB: 1 });
      const clockB = new VectorClock({ peerA: 1, peerB: 2 });

      expect(clockA.isConcurrent(clockB)).toBe(true);
      expect(clockB.isConcurrent(clockA)).toBe(true);
      expect(clockA.dominates(clockB)).toBe(false);
      expect(clockB.dominates(clockA)).toBe(false);
    });

    it('merges vector clocks by taking maximum sequence values', () => {
      const clockA = new VectorClock({ peerA: 3, peerB: 1 });
      const clockB = new VectorClock({ peerA: 1, peerB: 4, peerC: 2 });

      clockA.merge(clockB);

      expect(clockA.toJSON()).toEqual({
        peerA: 3,
        peerB: 4,
        peerC: 2,
      });
    });
  });

  describe('LWWElementSetCRDT', () => {
    it('sets, retrieves, and deletes items via tombstones', () => {
      const crdt = new LWWElementSetCRDT<string>('node-1');

      crdt.set('elem-1', 'initial-value');
      expect(crdt.get('elem-1')).toBe('initial-value');
      expect(crdt.has('elem-1')).toBe(true);

      crdt.delete('elem-1');
      expect(crdt.get('elem-1')).toBeUndefined();
      expect(crdt.has('elem-1')).toBe(false);
    });

    it('resolves concurrent writes with Last-Write-Wins (timestamp precedence)', () => {
      const crdtA = new LWWElementSetCRDT<{ color: string }>('node-A');
      const crdtB = new LWWElementSetCRDT<{ color: string }>('node-B');

      // Older write at t=1000
      crdtA.set('shape-1', { color: 'blue' }, 1000);
      // Newer write at t=2000
      crdtB.set('shape-1', { color: 'red' }, 2000);

      // Node A receives Delta from Node B
      const deltaFromB = crdtB.generateDelta(crdtA.getStateVector());
      const result = crdtA.applyDelta(deltaFromB);

      expect(result.changed).toBe(true);
      expect(crdtA.get('shape-1')?.color).toBe('red');
    });

    it('breaks ties deterministically using nodeId when timestamps are identical', () => {
      const crdtA = new LWWElementSetCRDT<string>('alice');
      const crdtB = new LWWElementSetCRDT<string>('bob'); // 'bob' > 'alice'

      const fixedTime = 1700000000;
      crdtA.set('text-box', 'Value from Alice', fixedTime);
      crdtB.set('text-box', 'Value from Bob', fixedTime);

      const deltaBtoA = crdtB.generateDelta(crdtA.getStateVector());
      crdtA.applyDelta(deltaBtoA);

      // 'bob' is lexicographically greater than 'alice', so Bob's value wins
      expect(crdtA.get('text-box')).toBe('Value from Bob');

      // Symmetry check: Alice's delta applied to Bob should not overwrite Bob
      const deltaAtoB = crdtA.generateDelta(crdtB.getStateVector());
      const resB = crdtB.applyDelta(deltaAtoB);
      expect(crdtB.get('text-box')).toBe('Value from Bob');
      expect(resB.changed).toBe(false);
    });

    it('generates compact deltas sending only newly modified elements', () => {
      const crdt = new LWWElementSetCRDT<string>('node-1');

      crdt.set('e1', 'v1');
      crdt.set('e2', 'v2');

      const fullDelta = crdt.generateDelta({});
      expect(fullDelta.elements.length).toBe(2);

      // Simulate remote peer having knowledge up to current state
      const remoteStateVector = crdt.getStateVector();
      const emptyDelta = crdt.generateDelta(remoteStateVector);
      expect(emptyDelta.elements.length).toBe(0);

      // Update one element
      crdt.set('e2', 'v2-modified');
      const singleItemDelta = crdt.generateDelta(remoteStateVector);
      expect(singleItemDelta.elements.length).toBe(1);
      expect(singleItemDelta.elements[0].id).toBe('e2');
      expect(singleItemDelta.elements[0].value).toBe('v2-modified');
    });

    it('notifies subscribers on updates', () => {
      const crdt = new LWWElementSetCRDT<number>('node-1');
      const listener = vi.fn();

      const unsubscribe = crdt.subscribe(listener);
      crdt.set('count', 42);

      expect(listener).toHaveBeenCalledTimes(1);
      const elementsMap = listener.mock.calls[0][0] as Map<string, number>;
      expect(elementsMap.get('count')).toBe(42);

      unsubscribe();
      crdt.set('count', 43);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
