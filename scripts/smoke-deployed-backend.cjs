#!/usr/bin/env node

/**
 * Black-box smoke test against the deployed backend (Render free tier).
 *
 * Usage:
 *   node scripts/smoke-deployed-backend.cjs [baseUrl]
 *   SMOKE_TARGET_URL=https://... node scripts/smoke-deployed-backend.cjs
 *
 * Free-tier services sleep after ~15 min idle, so the script warms the
 * service up patiently before asserting. All checks are read-only or
 * expected-failure (a 401 login) — no data is created or mutated.
 */

const http = require('http');
const https = require('https');

const DEFAULT_TARGET = 'https://social-network-backend-4h47.onrender.com';
const WARM_UP_TIMEOUT_MS = 150_000;
const CHECK_TIMEOUT_MS = 30_000;

function baseUrl() {
  const arg = process.argv[2];
  if (arg) return arg.replace(/\/+$/, '');
  if (process.env.SMOKE_TARGET_URL) return process.env.SMOKE_TARGET_URL.replace(/\/+$/, '');
  return DEFAULT_TARGET;
}

function fetchUrl(urlStr, options = {}, timeoutMs = CHECK_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(
      urlStr,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: timeoutMs,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
      },
    );

    req.on('timeout', () => req.destroy(new Error(`request timed out after ${timeoutMs}ms`)));
    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function warmUp(target) {
  const deadline = Date.now() + WARM_UP_TIMEOUT_MS;
  let attempt = 1;
  while (Date.now() < deadline) {
    try {
      const res = await fetchUrl(`${target}/health/live`, {}, 15_000);
      if (res.statusCode === 200) {
        console.log(`🔥 Service warm after ${attempt} attempt(s).`);
        return;
      }
      console.log(`⏳ Warm-up attempt ${attempt}: status ${res.statusCode}, retrying...`);
    } catch (error) {
      console.log(`⏳ Warm-up attempt ${attempt}: ${String(error.message || error)}, retrying...`);
    }
    attempt++;
    await sleep(5000);
  }
  throw new Error(`service did not become responsive within ${WARM_UP_TIMEOUT_MS / 1000}s`);
}

function check(name, fn) {
  return { name, fn };
}

async function runSmokeTests() {
  const target = baseUrl();
  console.log(`🚀 Smoke testing deployed backend: ${target}\n`);

  await warmUp(target);

  const checks = [
    check('GET /health/live returns 200 (process responsive)', async () => {
      const res = await fetchUrl(`${target}/health/live`);
      if (res.statusCode !== 200) throw new Error(`expected 200, got ${res.statusCode}`);
    }),
    check('GET /health/ready returns 200 (DB + Redis reachable)', async () => {
      const res = await fetchUrl(`${target}/health/ready`);
      if (res.statusCode !== 200) {
        throw new Error(`expected 200, got ${res.statusCode}: ${res.data.slice(0, 200)}`);
      }
    }),
    check('POST /auth/login rejects unknown credentials with 401 (full auth stack)', async () => {
      const res = await fetchUrl(`${target}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `smoke.${Date.now()}@example.invalid`,
          password: 'NotARealPassword123!',
        }),
      });
      if (res.statusCode !== 401) throw new Error(`expected 401, got ${res.statusCode}`);
    }),
    check('GET /posts?limit=1 returns 200 (public feed path)', async () => {
      const res = await fetchUrl(`${target}/posts?limit=1`);
      if (res.statusCode !== 200) throw new Error(`expected 200, got ${res.statusCode}`);
      JSON.parse(res.data);
    }),
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, fn } of checks) {
    try {
      await fn();
      passed++;
      console.log(`  ✅ ${name}`);
    } catch (error) {
      failed++;
      console.error(`  ❌ ${name}\n     ${String(error.message || error)}`);
    }
  }

  console.log(`\n📊 Smoke results: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runSmokeTests().catch((error) => {
  console.error(`\n💥 Smoke test aborted: ${String(error.message || error)}\n`);
  process.exit(1);
});
