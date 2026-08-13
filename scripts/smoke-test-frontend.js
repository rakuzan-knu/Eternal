#!/usr/bin/env node

/**
 * Frontend Smoke Test Script
 * Used to verify Vercel preview/staged deployments before production alias cutover.
 */

const http = require('http');
const https = require('https');

const TARGET_URL =
  process.env.VERCEL_PREVIEW_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
const MAX_ATTEMPTS = parseInt(process.env.SMOKE_MAX_ATTEMPTS || '10', 10);
const DELAY_MS = parseInt(process.env.SMOKE_DELAY_MS || '3000', 10);

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

async function runFrontendSmokeTest() {
  console.log(`🚀 Starting Frontend Smoke Test against: ${TARGET_URL}`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[Attempt ${attempt}/${MAX_ATTEMPTS}] Checking frontend availability...`);
    const res = await checkEndpoint(TARGET_URL);

    if (res.statusCode === 200) {
      if (
        res.data.includes('<div id="root">') ||
        res.data.includes('<title>') ||
        res.data.includes('html')
      ) {
        console.log(`✅ Frontend Smoke Test PASSED! HTML bundle verified.`);
        process.exit(0);
      } else {
        console.warn(`  Attempt ${attempt}: HTTP 200 returned but HTML target content missing.`);
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

  console.error(`❌ Frontend Smoke Test FAILED after ${MAX_ATTEMPTS} attempts.`);
  process.exit(1);
}

runFrontendSmokeTest();
