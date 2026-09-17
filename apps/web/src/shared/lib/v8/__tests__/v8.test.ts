import { describe, it, expect } from 'vitest';
import { preallocateArray, fastMap, fastFilterMap } from '../arrayPrealloc';
import { WeakRefCache } from '../weakRefCache';
import { CpuCircuitBreaker, CircuitState, withTimeBudget } from '../cpuCircuitBreaker';

describe('Frontend V8 Optimizations & Algorithm Protection', () => {
  describe('Array Pre-allocation', () => {
    it('preallocates arrays with Smi boundaries', () => {
      const arr = preallocateArray<number>(20);
      expect(arr.length).toBe(20);

      const neg = preallocateArray<number>(-1);
      expect(neg.length).toBe(0);
    });

    it('fastMap maps without dynamic resizing', () => {
      const src = [1, 2, 3];
      const res = fastMap(src, (x) => x * 2);
      expect(res).toEqual([2, 4, 6]);
      expect(res.length).toBe(3);
    });

    it('fastFilterMap performs single allocation filtering', () => {
      const src = [10, 15, 20, 25];
      const res = fastFilterMap(src, (x) => (x >= 20 ? x * 2 : null));
      expect(res).toEqual([40, 50]);
      expect(res.length).toBe(2);
    });
  });

  describe('WeakRefCache', () => {
    it('manages weak references and reports stats', () => {
      const cache = new WeakRefCache<string, { id: string }>('test', 2);
      const obj = { id: 'test-1' };
      cache.set('k1', obj);

      expect(cache.has('k1')).toBe(true);
      expect(cache.get('k1')).toBe(obj);

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);

      cache.delete('k1');
      expect(cache.has('k1')).toBe(false);
      expect(cache.get('k1')).toBeUndefined();
    });
  });

  describe('CpuCircuitBreaker & withTimeBudget', () => {
    it('executes within budget', () => {
      const val = withTimeBudget(
        () => 100 + 200,
        5,
        () => 0,
      );
      expect(val).toBe(300);
    });

    it('trips circuit breaker and falls back', () => {
      const breaker = new CpuCircuitBreaker('fe-breaker', {
        budgetMs: 2,
        tripThreshold: 2,
        cooldownMs: 500,
      });

      const slow = () => {
        const start = Date.now();
        while (Date.now() - start < 5) {
          Math.random();
        }
        return 'done';
      };

      breaker.execute(slow, () => 'fallback');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      breaker.execute(slow, () => 'fallback');
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      let slowRan = false;
      const res = breaker.execute(
        () => {
          slowRan = true;
          return 'slow';
        },
        (r) => `fallback-${r}`,
      );

      expect(slowRan).toBe(false);
      expect(res).toBe('fallback-CIRCUIT_OPEN');
    });
  });
});
