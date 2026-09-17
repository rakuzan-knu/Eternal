import { PNCounter } from '../pn-counter';
import { LWWElementSet } from '../lww-element-set';

describe('CRDT Data Structures', () => {
  describe('PNCounter', () => {
    it('should correctly increment and decrement on a single node', () => {
      const counter = new PNCounter('nodeA');
      expect(counter.value).toBe(0);

      counter.increment();
      counter.increment(4);
      expect(counter.value).toBe(5);

      counter.decrement(2);
      expect(counter.value).toBe(3);
    });

    it('should converge when merging state from multiple nodes', () => {
      const nodeA = new PNCounter('nodeA');
      const nodeB = new PNCounter('nodeB');

      nodeA.increment(10);
      nodeA.decrement(2); // value: 8

      nodeB.increment(5);
      nodeB.decrement(1); // value: 4

      // Merge B into A
      nodeA.merge(nodeB.toState());
      // nodeA P: {nodeA: 10, nodeB: 5}, N: {nodeA: 2, nodeB: 1} => 15 - 3 = 12
      expect(nodeA.value).toBe(12);

      // Merge A into B
      nodeB.merge(nodeA.toState());
      expect(nodeB.value).toBe(12);
    });
  });

  describe('LWWElementSet', () => {
    it('should track adds and removes with timestamps', () => {
      const set = new LWWElementSet('add');
      set.add('msg1', 100);
      expect(set.has('msg1')).toBe(true);
      expect(set.size).toBe(1);

      set.remove('msg1', 200);
      expect(set.has('msg1')).toBe(false);
      expect(set.size).toBe(0);

      // Obsolete add should not revive
      set.add('msg1', 150);
      expect(set.has('msg1')).toBe(false);

      // Newer add revives
      set.add('msg1', 250);
      expect(set.has('msg1')).toBe(true);
    });

    it('should merge remote states correctly', () => {
      const setA = new LWWElementSet('add');
      const setB = new LWWElementSet('add');

      setA.add('user1', 100);
      setA.add('user2', 150);

      setB.add('user2', 120);
      setB.remove('user1', 200);

      setA.merge(setB.toState());
      expect(setA.has('user1')).toBe(false); // tombstoned at 200 > 100
      expect(setA.has('user2')).toBe(true); // active at 150 > 120
    });
  });
});
