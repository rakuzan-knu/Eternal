import { preallocateArray, fastMap, fastFilterMap } from '../array-prealloc';
import { WeakRefCache, WeakSessionMap } from '../weak-ref-cache';
import { CpuCircuitBreaker, CircuitState, withTimeBudget } from '../time-budget';
import {
  Permission,
  UserFlags,
  DEFAULT_MEMBER_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  fastPathCanSend,
  fastPathUserActive,
  fastPathCanModerate,
} from '@common/contracts';
import { FastPathChatService } from '../../../messenger/services/fast-path-chat.service';

describe('V8 Performance & Algorithm Protection', () => {
  describe('1. Array Pre-allocation', () => {
    it('should preallocate array of exact size with Smi boundary', () => {
      const arr = preallocateArray<number>(50);
      expect(arr.length).toBe(50);

      const negativeArr = preallocateArray<number>(-5);
      expect(negativeArr.length).toBe(0);
    });

    it('should transform items via fastMap without dynamic push overhead', () => {
      const input = [1, 2, 3, 4, 5];
      const result = fastMap(input, (x) => x * 10);
      expect(result).toEqual([10, 20, 30, 40, 50]);
      expect(result.length).toBe(5);
    });

    it('should filter and map in a single allocation via fastFilterMap', () => {
      const input = [1, 2, 3, 4, 5, 6];
      const result = fastFilterMap(input, (x) => (x % 2 === 0 ? `even-${x}` : null));
      expect(result).toEqual(['even-2', 'even-4', 'even-6']);
      expect(result.length).toBe(3);
    });
  });

  describe('2. WeakRef & FinalizationRegistry Cache', () => {
    it('should cache and retrieve objects weakly without leaking memory', () => {
      const cache = new WeakRefCache<string, { id: string; name: string }>('test-cache', 4);
      const obj = { id: 'u1', name: 'User 1' };

      cache.set('u1', obj);
      expect(cache.has('u1')).toBe(true);
      expect(cache.get('u1')).toBe(obj);

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(1);

      cache.delete('u1');
      expect(cache.has('u1')).toBe(false);
      expect(cache.get('u1')).toBeUndefined();
    });

    it('should manage ephemeral metadata in WeakSessionMap', () => {
      const sessionMap = new WeakSessionMap<{ id: string }, { role: string }>();
      const userRef = { id: 'user-123' };

      sessionMap.set(userRef, { role: 'ADMIN' });
      expect(sessionMap.has(userRef)).toBe(true);
      expect(sessionMap.get(userRef)).toEqual({ role: 'ADMIN' });

      sessionMap.delete(userRef);
      expect(sessionMap.has(userRef)).toBe(false);
    });
  });

  describe('3. CPU Circuit Breaker & 5ms Time Budget', () => {
    it('should execute fast operations normally without tripping', () => {
      const result = withTimeBudget(
        () => 42 * 2,
        5,
        () => 0,
      );
      expect(result).toBe(84);
    });

    it('should invoke fallback when operation exceeds budget', () => {
      const result = withTimeBudget(
        () => {
          const start = Date.now();
          while (Date.now() - start < 10) {
            // simulate CPU heavy computation exceeding 5ms
          }
          return 'completed';
        },
        5,
        () => 'fallback-result',
      );
      expect(result).toBe('fallback-result');
    });

    it('should open circuit breaker upon consecutive budget trips', () => {
      const breaker = new CpuCircuitBreaker('test-breaker', {
        budgetMs: 2,
        tripThreshold: 2,
        cooldownMs: 500,
      });

      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      const heavyOp = () => {
        const start = Date.now();
        while (Date.now() - start < 5) {
          Math.random();
        }
        return 'done';
      };

      // Trip 1
      breaker.execute(heavyOp, () => 'fallback');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      // Trip 2 -> OPEN
      breaker.execute(heavyOp, () => 'fallback');
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Subsequent call should fast-fail without running heavyOp
      let heavyCalled = false;
      const result = breaker.execute(
        () => {
          heavyCalled = true;
          return 'ok';
        },
        (reason) => `fast-fallback-${reason}`,
      );

      expect(heavyCalled).toBe(false);
      expect(result).toBe('fast-fallback-CIRCUIT_OPEN');
    });
  });

  describe('4. Fast-Path / Slow-Path Pattern', () => {
    it('should allow valid sending on fast-path via Smi bitwise check', () => {
      expect(fastPathCanSend(DEFAULT_MEMBER_PERMISSIONS, Permission.CAN_SEND_TEXT)).toBe(true);
      expect(fastPathCanSend(DEFAULT_MEMBER_PERMISSIONS, Permission.CAN_SEND_MEDIA)).toBe(true);
    });

    it('should reject immediately if user is banned or muted', () => {
      const mutedMask = DEFAULT_MEMBER_PERMISSIONS | Permission.IS_MUTED;
      expect(fastPathCanSend(mutedMask, Permission.CAN_SEND_TEXT)).toBe(false);

      const bannedMask = DEFAULT_MEMBER_PERMISSIONS | Permission.IS_BANNED;
      expect(fastPathCanSend(bannedMask, Permission.CAN_SEND_TEXT)).toBe(false);
    });

    it('should validate active user status in single CPU instruction', () => {
      const activeUser = UserFlags.IS_ACTIVE | UserFlags.CAN_POST;
      expect(fastPathUserActive(activeUser)).toBe(true);

      const bannedUser = UserFlags.IS_ACTIVE | UserFlags.IS_BANNED;
      expect(fastPathUserActive(bannedUser)).toBe(false);
    });

    it('should evaluate moderation privileges on fast-path', () => {
      expect(fastPathCanModerate(DEFAULT_ADMIN_PERMISSIONS)).toBe(true);
      expect(fastPathCanModerate(DEFAULT_MEMBER_PERMISSIONS)).toBe(false);
    });

    it('should cache and evaluate chat permissions via FastPathChatService', () => {
      const service = new FastPathChatService();
      expect(service.checkFastPath('c1', 'u1', Permission.CAN_SEND_TEXT)).toBeNull(); // Cache miss

      service.setPermissions('c1', 'u1', DEFAULT_MEMBER_PERMISSIONS);
      expect(service.checkFastPath('c1', 'u1', Permission.CAN_SEND_TEXT)).toBe(true); // Cache hit & allowed

      service.setPermissions('c1', 'u1', DEFAULT_MEMBER_PERMISSIONS | Permission.IS_MUTED);
      expect(service.checkFastPath('c1', 'u1', Permission.CAN_SEND_TEXT)).toBe(false); // Cache hit & denied

      service.invalidate('c1', 'u1');
      expect(service.checkFastPath('c1', 'u1', Permission.CAN_SEND_TEXT)).toBeNull(); // Evicted
    });
  });
});
