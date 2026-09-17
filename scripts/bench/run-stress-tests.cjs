#!/usr/bin/env node

/**
 * Pre-Release Automated Stress Testing & Profiling Engine
 * Runs full stress test suite before releases to detect RPS drops and Event Loop Lag.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function runStep(title, command) {
  console.log(`\n============================================================`);
  console.log(`▶️ ${title}`);
  console.log(`============================================================`);
  try {
    execSync(command, { stdio: 'inherit', cwd: path.resolve(__dirname, '../..') });
    console.log(`✅ ${title} completed successfully.`);
    return true;
  } catch (_e) {
    console.error(`❌ ${title} failed.`);
    return false;
  }
}

function main() {
  const isStrict = process.argv.includes('--strict');
  console.log('⚡ Starting Pre-Release Stress Testing & Profiling Pipeline...');
  console.log(`Mode: ${isStrict ? 'STRICT (Fail on regressions)' : 'STANDARD'}\n`);

  const startTime = Date.now();
  let passed = true;

  // Step 1: Pre-generate JWT tokens for 10,000 synthetic VUs
  const step1 = runStep(
    'Step 1: Generating 10,000 Deterministic Test JWT Tokens',
    'node benchmarks/k6/token-generator.cjs --count 10000',
  );
  if (!step1) passed = false;

  // Step 2: Run Autocannon Benchmarks with Event Loop Lag & ELU Profiling
  const strictFlag = isStrict ? ' --strict' : '';
  const step2 = runStep(
    'Step 2: Autocannon High-Throughput Benchmarks & Event Loop Profiling',
    `node scripts/bench/run-autocannon.cjs --duration 5 --connections 100${strictFlag}`,
  );
  if (!step2) passed = false;

  // Step 3: Run Baseline Regression & Performance SLA Verification
  const step3 = runStep(
    'Step 3: Performance SLA & Latency Regression Verification',
    'node scripts/ci/verify-performance-benchmarks.cjs',
  );
  if (!step3) passed = false;

  // Step 4: Run Clinic.js & Flamegraph CPU Profiling
  const step4 = runStep(
    'Step 4: Clinic.js Diagnostic & CPU Flamegraph Profiling',
    'node scripts/bench/run-clinic-profile.cjs --duration 5 --connections 100',
  );
  if (!step4) passed = false;

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n============================================================`);
  console.log(`🏁 STRESS TESTING & PROFILING SUMMARY (${totalDuration}s)`);
  console.log(`============================================================`);

  const reportPath = path.resolve(__dirname, '../../benchmarks/reports/latest-benchmark-report.md');
  if (fs.existsSync(reportPath)) {
    console.log(`📄 Latest Benchmark Report: ${reportPath}`);
  }

  if (!passed && isStrict) {
    console.error(
      '❌ Pre-Release Stress Testing FAILED. Do not deploy with performance regressions.',
    );
    process.exit(1);
  }

  console.log('🎉 All stress tests and performance SLA verifications PASSED cleanly!');
}

if (require.main === module) {
  main();
}
