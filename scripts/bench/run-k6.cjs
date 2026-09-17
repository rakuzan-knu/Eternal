#!/usr/bin/env node

/**
 * k6 Benchmark CLI Runner
 * Checks for k6 availability, generates tokens, and executes specified k6 scenario.
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { generateUserTokens } = require('../../benchmarks/k6/token-generator.cjs');

function checkK6Installed() {
  try {
    execSync('k6 version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const scriptName = args[0] || 'real-user-simulation.js';
  const scriptPath = path.resolve(__dirname, '../../benchmarks/k6', scriptName);

  if (!fs.existsSync(scriptPath)) {
    console.error(`❌ k6 script not found: ${scriptPath}`);
    console.log('Available scripts:');
    console.log('  - real-user-simulation.js (10,000 VUs, feed + sockets)');
    console.log('  - feed-stress.js (feed queries & pagination)');
    console.log('  - socket-stress.js (WebSocket connection & messaging)');
    process.exit(1);
  }

  // Ensure tokens.json exists without TOCTOU race conditions
  const tokensPath = path.resolve(__dirname, '../../benchmarks/k6/tokens.json');
  try {
    const fd = fs.openSync(tokensPath, 'wx');
    try {
      console.log('🔑 Generating tokens.json for 10,000 VUs...');
      const users = generateUserTokens(10000);
      fs.writeFileSync(fd, JSON.stringify(users, null, 2), 'utf-8');
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
    // File already exists - no generation needed
  }

  if (!checkK6Installed()) {
    console.log('\n⚠️ k6 CLI is not installed on this system.');
    console.log('ℹ️ Installation instructions:');
    console.log('   - Windows (Chocolatey): choco install k6');
    console.log('   - Windows (Winget):     winget install k6');
    console.log('   - macOS (Homebrew):     brew install k6');
    console.log('   - Linux (Debian/Ubuntu): sudo apt-get install k6');
    console.log('   - Docker: docker run --rm -i grafana/k6 run - < ' + scriptPath);
    console.log('\n💡 Falling back to Node.js Autocannon benchmark runner:');
    execSync('node scripts/bench/run-autocannon.cjs', { stdio: 'inherit' });
    return;
  }

  console.log(`🚀 Executing k6 benchmark: ${scriptName}...`);
  const extraArgs = args.slice(1);
  const k6Process = spawn('k6', ['run', scriptPath, ...extraArgs], {
    stdio: 'inherit',
    cwd: path.dirname(scriptPath),
  });

  k6Process.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ k6 benchmark finished with exit code ${code}`);
      process.exit(code || 1);
    }
    console.log(`🎉 k6 benchmark finished successfully!`);
  });
}

if (require.main === module) {
  main();
}
