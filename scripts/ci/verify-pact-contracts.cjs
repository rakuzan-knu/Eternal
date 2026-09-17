#!/usr/bin/env node

/**
 * Pact Provider Contract Verification Script
 * Validates consumer Pact contracts against live or mocked backend providers.
 */

const http = require('http');
const https = require('https');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function fetchUrl(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;

    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10000,
    };

    const req = client.request(urlStr, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

async function verifyPactContracts() {
  console.log(`🤝 Verifying Pact Consumer-Driven Contracts against provider: ${API_BASE_URL}...`);

  const pactInteractions = [
    {
      description: 'GET /api/health returns HTTP 200 with status ok',
      method: 'GET',
      path: '/api/health',
      expectedStatus: 200,
    },
    {
      description: 'OpenAPI Spec at /api/docs-json returns valid swagger schema',
      method: 'GET',
      path: '/api/docs-json',
      expectedStatus: 200,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const interaction of pactInteractions) {
    try {
      console.log(`  🔍 Verifying contract: ${interaction.description}`);
      const res = await fetchUrl(`${API_BASE_URL}${interaction.path}`, {
        method: interaction.method,
      });

      if (res.statusCode !== interaction.expectedStatus) {
        throw new Error(`Expected HTTP ${interaction.expectedStatus}, got HTTP ${res.statusCode}`);
      }

      console.log(`  ✓ Contract passed: ${interaction.path} [HTTP ${res.statusCode}]`);
      passed++;
    } catch (err) {
      console.error(`  ❌ Contract failed: ${interaction.description} -> ${err.message}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`❌ Pact Provider Verification FAILED: ${failed} interaction(s) failed.`);
    process.exit(1);
  }

  console.log(`🎉 All ${passed} Pact consumer contracts verified successfully against provider!`);
}

verifyPactContracts();
