#!/usr/bin/env node

/**
 * Backend Smoke & Health Test Script
 * Used in deployment pipelines to verify post-deployment availability before cutover.
 */

import http from 'node:http';
import https from 'node:https';

const TARGET_URL = process.env.RENDER_URL || process.env.BACKEND_URL || 'http://localhost:3000';
const HEALTH_ENDPOINT = `${TARGET_URL.replace(/\/$/, '')}/api/health`;
const MAX_ATTEMPTS = parseInt(process.env.SMOKE_MAX_ATTEMPTS || '12', 10);
const DELAY_MS = parseInt(process.env.SMOKE_DELAY_MS || '5000', 10);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkEndpoint(urlStr) {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;
    const req = client.get(urlStr, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data });
      });
    });
    req.on('error', (err) => resolve({ statusCode: 0, error: err.message }));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ statusCode: 0, error: 'Request timeout' });
    });
  });
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
          process.exit(0);
        }
        console.warn(`⚠️ Endpoint returned 200 OK but health status was: ${body.status}`);
      } catch (e) {
        console.log(`✅ Backend responded 200 OK.`);
        process.exit(0);
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
  process.exit(1);
}

runBackendSmokeTest();
