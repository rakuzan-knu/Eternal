#!/usr/bin/env node

/**
 * Self-Healing Runbook: Automated Redis Memory Eviction & Diagnostic Ops
 *
 * Usage:
 *   node scripts/utils/self-healing-redis.cjs [--threshold=90] [--force] [--dry-run] [--patterns=...] [--json]
 */

const path = require('path');

function getRedisClient() {
  try {
    return require('ioredis');
  } catch {
    try {
      const backendPath = path.resolve(__dirname, '../../backend/node_modules/ioredis');
      return require(backendPath);
    } catch {
      const resolved = require.resolve('ioredis', {
        paths: [path.resolve(__dirname, '../../backend'), process.cwd()],
      });
      return require(resolved);
    }
  }
}

const Redis = getRedisClient();

const DEFAULT_PATTERNS = [
  'cache:feed:*',
  'cache:posts:*',
  'cache:users:*',
  'cache:stories:*',
  'cache:opengraph:*',
  'cache:search:*',
  'og:preview:*',
  'cache:comments:*',
];

const PROTECTED_PREFIXES = [
  'session:',
  'auth:',
  'lock:',
  'bull:',
  'queue:',
  'throttler:',
  'outbox:',
  'idempotency:',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    threshold: 90,
    force: false,
    dryRun: false,
    json: false,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    patterns: DEFAULT_PATTERNS,
    fallbackMaxMemory: parseInt(process.env.REDIS_MAX_MEMORY_BYTES || '536870912', 10), // 512MB
  };

  for (const arg of args) {
    if (arg === '--force') options.force = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--json') options.json = true;
    else if (arg.startsWith('--threshold=')) {
      options.threshold = parseFloat(arg.replace('--threshold=', '')) || 90;
    } else if (arg.startsWith('--redis-url=')) {
      options.redisUrl = arg.replace('--redis-url=', '');
    } else if (arg.startsWith('--patterns=')) {
      options.patterns = arg
        .replace('--patterns=', '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
    }
  }

  return options;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isProtected(key) {
  return PROTECTED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

async function inspectMemory(redis, fallbackMax) {
  try {
    const infoStr = await redis.info('memory');
    const lines = infoStr.split('\r\n');
    const map = {};
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        map[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
      }
    }

    const used = parseInt(map.used_memory || '0', 10) || 0;
    let max = parseInt(map.maxmemory || '0', 10) || 0;
    if (max <= 0) max = fallbackMax;

    const ratio = max > 0 ? used / max : 0;
    return {
      usedMemoryBytes: used,
      usedMemoryHuman: formatBytes(used),
      maxMemoryBytes: max,
      maxMemoryHuman: formatBytes(max),
      memoryRatio: ratio,
      memoryPercent: Math.round(ratio * 10000) / 100,
      fragmentationRatio: parseFloat(map.mem_fragmentation_ratio || '1.0'),
    };
  } catch (err) {
    return {
      usedMemoryBytes: 0,
      usedMemoryHuman: '0 B',
      maxMemoryBytes: fallbackMax,
      maxMemoryHuman: formatBytes(fallbackMax),
      memoryRatio: 0,
      memoryPercent: 0,
      fragmentationRatio: 1.0,
      error: err.message,
    };
  }
}

async function runSelfHealing() {
  const options = parseArgs();
  const startTime = Date.now();

  let redis;
  try {
    redis = new Redis(options.redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    redis.on('error', (err) => {
      if (!options.json) {
        // Suppress unhandled error crash
      }
    });
  } catch (err) {
    console.error(`[ERROR] Failed to connect to Redis at ${options.redisUrl}: ${err.message}`);
    process.exit(1);
  }

  let isConnected = false;
  try {
    await redis.ping();
    isConnected = true;
  } catch (err) {
    if (!options.json) {
      console.warn(
        `[WARN] Redis connection failed (${err.message}). Running in safe offline mode.`,
      );
    }
  }

  const memoryBefore = await inspectMemory(redis, options.fallbackMaxMemory);

  const shouldTrigger = options.force || memoryBefore.memoryPercent >= options.threshold;

  if (!options.json) {
    console.log(`\n======================================================`);
    console.log(` 🛡️  SELF-HEALING RUNBOOK: REDIS MEMORY RECOVERY`);
    console.log(`======================================================`);
    console.log(
      ` Memory Usage: ${memoryBefore.usedMemoryHuman} / ${memoryBefore.maxMemoryHuman} (${memoryBefore.memoryPercent}%)`,
    );
    console.log(` Threshold:    ${options.threshold}%`);
    console.log(
      ` Triggered:    ${shouldTrigger ? 'YES' : 'NO (Memory usage is within safe limits)'}`,
    );
    console.log(` Dry Run:      ${options.dryRun ? 'YES' : 'NO'}`);
    console.log(`------------------------------------------------------`);
  }

  if (!isConnected) {
    const offlineResult = {
      status: 'OFFLINE_SAFE',
      triggered: false,
      reason: 'Redis instance is offline or unreachable',
      memoryBefore,
      evictedCount: 0,
    };
    if (options.json) console.log(JSON.stringify(offlineResult, null, 2));
    else
      console.log(
        ` [INFO] Redis offline. No eviction performed.\n======================================================\n`,
      );
    try {
      redis.disconnect();
    } catch {}
    return;
  }

  if (!shouldTrigger && !options.dryRun) {
    const result = {
      status: 'HEALTHY',
      triggered: false,
      reason: `Memory ratio ${memoryBefore.memoryPercent}% < threshold ${options.threshold}%`,
      memoryBefore,
      evictedCount: 0,
    };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    await redis.quit();
    return;
  }

  const patterns = options.patterns.filter((p) => !isProtected(p));
  const evictedPatterns = {};
  let totalEvicted = 0;

  for (const pattern of patterns) {
    let count = 0;
    try {
      const stream = redis.scanStream({ match: pattern, count: 200 });
      for await (const resultKeys of stream) {
        const keys = resultKeys.filter((k) => !isProtected(k));
        if (keys.length > 0) {
          if (!options.dryRun) {
            await redis.unlink(...keys);
          }
          count += keys.length;
        }
      }
    } catch (err) {
      if (!options.json) console.error(`Error scanning pattern ${pattern}: ${err.message}`);
    }
    evictedPatterns[pattern] = count;
    totalEvicted += count;
  }

  const memoryAfter = await inspectMemory(redis, options.fallbackMaxMemory);
  const freedBytes = Math.max(0, memoryBefore.usedMemoryBytes - memoryAfter.usedMemoryBytes);
  const durationMs = Date.now() - startTime;

  const summary = {
    status: 'COMPLETED',
    triggered: true,
    dryRun: options.dryRun,
    reason: options.force
      ? 'Manual force trigger'
      : `Automated threshold exceeded (${memoryBefore.memoryPercent}% >= ${options.threshold}%)`,
    evictedCount: totalEvicted,
    evictedPatterns,
    freedBytes,
    freedHuman: formatBytes(freedBytes),
    memoryBefore,
    memoryAfter,
    durationMs,
    timestamp: new Date().toISOString(),
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(` 🧹 Eviction Summary:`);
    console.log(`   - Keys Evicted: ${totalEvicted}`);
    for (const [pat, cnt] of Object.entries(evictedPatterns)) {
      console.log(`     * ${pat}: ${cnt}`);
    }
    console.log(
      `   - Memory Before: ${memoryBefore.usedMemoryHuman} (${memoryBefore.memoryPercent}%)`,
    );
    console.log(
      `   - Memory After:  ${memoryAfter.usedMemoryHuman} (${memoryAfter.memoryPercent}%)`,
    );
    console.log(`   - Memory Freed:  ${formatBytes(freedBytes)}`);
    console.log(`   - Duration:      ${durationMs}ms`);
    console.log(`======================================================\n`);
  }

  await redis.quit();
}

void runSelfHealing();
