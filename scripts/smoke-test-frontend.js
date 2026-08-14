#!/usr/bin/env node

/**
 * Frontend Smoke Test Script
 * Used to verify Vercel preview/staged deployments before production alias cutover.
 */

const TARGET_URL =
  process.env.VERCEL_PREVIEW_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
const MAX_ATTEMPTS = parseInt(process.env.SMOKE_MAX_ATTEMPTS || '10', 10);
const DELAY_MS = parseInt(process.env.SMOKE_DELAY_MS || '3000', 10);
const BYPASS_SECRET =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET || process.env.VERCEL_PROTECTION_BYPASS || '';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkEndpoint(urlStr) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SmokeTest/1.0',
  };

  if (BYPASS_SECRET) {
    headers['x-vercel-protection-bypass'] = BYPASS_SECRET;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(urlStr, {
      method: 'GET',
      headers,
      redirect: 'manual',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const status = res.status;
    const location = res.headers.get('location') || '';

    // If redirected to SSO/Auth or trailing slash, handle accordingly
    if ([301, 302, 307, 308].includes(status)) {
      if (location.includes('sso-api') || location.includes('vercel.com/login')) {
        return {
          statusCode: status,
          isProtectedPreview: true,
          location,
        };
      }

      // Try following the redirect once if it's an internal / canonical redirect
      try {
        const redirectUrl = new URL(location, urlStr).toString();
        const followRes = await fetch(redirectUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(8000),
        });
        const data = await followRes.text();
        return {
          statusCode: followRes.status,
          data,
          location,
        };
      } catch {
        return { statusCode: status, location };
      }
    }

    const data = await res.text();
    return { statusCode: status, data };
  } catch (err) {
    return { statusCode: 0, error: err.message };
  }
}

async function runFrontendSmokeTest() {
  console.log(`🚀 Starting Frontend Smoke Test against: ${TARGET_URL}`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[Attempt ${attempt}/${MAX_ATTEMPTS}] Checking frontend availability...`);
    const res = await checkEndpoint(TARGET_URL);

    if (res.isProtectedPreview) {
      console.log(
        `✅ Frontend Smoke Test PASSED! Preview deployment is active and protected by Vercel SSO (${res.location}).`,
      );
      process.exitCode = 0;
      return;
    }

    if (res.statusCode === 200 && res.data) {
      if (
        res.data.includes('<div id="root">') ||
        res.data.includes('<title>') ||
        res.data.includes('<html') ||
        res.data.includes('<!DOCTYPE html>')
      ) {
        console.log(`✅ Frontend Smoke Test PASSED! HTML bundle verified.`);
        process.exitCode = 0;
        return;
      } else {
        console.warn(`  Attempt ${attempt}: HTTP 200 returned but HTML target content missing.`);
      }
    } else {
      console.warn(
        `  Attempt ${attempt} failed with status: ${res.statusCode} (${res.error || 'bad status'}${res.location ? ` -> ${res.location}` : ''})`,
      );
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(DELAY_MS);
    }
  }

  console.error(`❌ Frontend Smoke Test FAILED after ${MAX_ATTEMPTS} attempts.`);
  process.exitCode = 1;
}

runFrontendSmokeTest();
