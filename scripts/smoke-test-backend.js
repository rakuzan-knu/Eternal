#!/usr/bin/env node

/**
 * Backend Smoke & Health Test Script
 * Used in deployment pipelines to verify post-deployment availability before cutover.
 */

const TARGET_URL = process.env.RENDER_URL || process.env.BACKEND_URL || 'http://localhost:3000';
const HEALTH_ENDPOINT = `${TARGET_URL.replace(/\/$/, '')}/api/health`;
const MAX_ATTEMPTS = parseInt(process.env.SMOKE_MAX_ATTEMPTS || '12', 10);
const DELAY_MS = parseInt(process.env.SMOKE_DELAY_MS || '5000', 10);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkEndpoint(urlStr) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(urlStr, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SmokeTest/1.0',
        Accept: 'application/json',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.text();
    return { statusCode: res.status, data };
  } catch (err) {
    return { statusCode: 0, error: err.message };
  }
}

async function runBackendSmokeTest() {
  console.log(`🚀 Starting Backend Smoke Test against: ${HEALTH_ENDPOINT}`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[Attempt ${attempt}/${MAX_ATTEMPTS}] Checking health endpoint...`);
    const res = await checkEndpoint(HEALTH_ENDPOINT);

    if (res.statusCode === 200) {
      try {
        const body = JSON.parse(res.data);
        if (body.status === 'ok' || body.status === 'success' || body.status === 'up') {
          console.log(`✅ Backend Smoke Test PASSED! Response:`, JSON.stringify(body));
          process.exitCode = 0;
          return;
        }
        console.warn(`⚠️ Endpoint returned 200 OK but health status was: ${body.status}`);
      } catch (e) {
        console.log(`✅ Backend responded 200 OK.`);
        process.exitCode = 0;
        return;
      }
    } else {
      console.warn(
        `  Attempt ${attempt} failed with status: ${res.statusCode} (${res.error || 'bad status'})`,
      );
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(DELAY_MS);
    }
  }

  console.error(`❌ Backend Smoke Test FAILED after ${MAX_ATTEMPTS} attempts.`);
  process.exitCode = 1;
}

runBackendSmokeTest();
