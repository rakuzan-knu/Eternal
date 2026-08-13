#!/usr/bin/env node

/**
 * API Contract Verification Script
 * Validates the live NestJS OpenAPI specification and core route contracts.
 */

const http = require('http');
const https = require('https');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function fetchUrl(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;
    const req = client.get(urlStr, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${urlStr}`));
    });
  });
}

async function verifyContract() {
  console.log(`🔍 Verifying API Contract against: ${API_BASE_URL}...`);

  const requiredEndpointGroups = [
    ['/api/health', '/health'],
    ['/api/auth/login', '/auth/login'],
    ['/api/auth/register', '/auth/register'],
    ['/api/posts', '/posts'],
  ];

  try {
    const docsRes = await fetchUrl(`${API_BASE_URL}/api/docs-json`);
    if (docsRes.statusCode !== 200) {
      throw new Error(`OpenAPI spec endpoint returned HTTP ${docsRes.statusCode}`);
    }

    let openApiSpec;
    try {
      openApiSpec = JSON.parse(docsRes.data);
    } catch (err) {
      throw new Error(`Failed to parse OpenAPI JSON spec: ${err.message}`);
    }

    if (!openApiSpec.openapi && !openApiSpec.swagger) {
      throw new Error('Response is not a valid OpenAPI / Swagger document');
    }

    console.log(`✅ OpenAPI Spec Version: ${openApiSpec.openapi || openApiSpec.swagger}`);
    console.log(`✅ Title: ${openApiSpec.info?.title || 'Unknown'}`);

    const paths = openApiSpec.paths || {};
    const missingPaths = [];

    for (const group of requiredEndpointGroups) {
      const found = group.find((ep) => paths[ep]);
      if (!found) {
        missingPaths.push(group[0]);
      } else {
        console.log(`  ✓ Route documented: ${found}`);
      }
    }

    if (missingPaths.length > 0) {
      throw new Error(
        `Missing required API contract routes in OpenAPI spec: ${missingPaths.join(', ')}`,
      );
    }

    console.log('🎉 API Contract Verification PASSED successfully!');
  } catch (error) {
    console.error(`❌ API Contract Verification FAILED: ${error.message}`);
    process.exit(1);
  }
}

verifyContract();
