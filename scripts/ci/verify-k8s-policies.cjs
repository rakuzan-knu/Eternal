#!/usr/bin/env node

/**
 * Kubernetes Policy-as-Code Verification Script
 * Validates K8s manifests against security guardrails (non-root, readOnlyRootFS, no-latest-tag, resource-limits).
 */

const fs = require('fs');
const path = require('path');

const DEPLOYMENT_FILE = path.join(
  __dirname,
  '..',
  '..',
  'infrastructure',
  'kubernetes',
  'base',
  'deployment.yaml',
);

function verifyK8sPolicies() {
  console.log('🔍 Starting Kubernetes Policy-as-Code Verification...');

  if (!fs.existsSync(DEPLOYMENT_FILE)) {
    console.error(`❌ Deployment file not found at ${DEPLOYMENT_FILE}`);
    process.exit(1);
  }

  const content = fs.readFileSync(DEPLOYMENT_FILE, 'utf8');
  let errors = 0;

  // Rule 1: Disallow :latest tag
  if (/image:.*:latest/.test(content)) {
    console.error(
      `❌ Policy Violation [no-latest-tag]: Found container image with ':latest' tag in infrastructure/kubernetes/base/deployment.yaml`,
    );
    errors++;
  } else {
    console.log(`  ✓ Policy Passed: No ':latest' image tags found.`);
  }

  // Rule 2: Enforce non-root
  if (!content.includes('runAsNonRoot: true')) {
    console.error(
      `❌ Policy Violation [non-root]: Missing 'runAsNonRoot: true' in infrastructure/kubernetes/base/deployment.yaml`,
    );
    errors++;
  } else {
    console.log(`  ✓ Policy Passed: 'runAsNonRoot: true' is configured.`);
  }

  // Rule 3: Enforce readOnlyRootFilesystem
  if (!content.includes('readOnlyRootFilesystem: true')) {
    console.error(
      `❌ Policy Violation [readOnlyRootFS]: Missing 'readOnlyRootFilesystem: true' in infrastructure/kubernetes/base/deployment.yaml`,
    );
    errors++;
  } else {
    console.log(`  ✓ Policy Passed: 'readOnlyRootFilesystem: true' is configured.`);
  }

  // Rule 4: Enforce Resource Limits
  if (!content.includes('limits:') || !content.includes('requests:')) {
    console.error(
      `❌ Policy Violation [resource-limits]: Missing resource requests/limits in infrastructure/kubernetes/base/deployment.yaml`,
    );
    errors++;
  } else {
    console.log(`  ✓ Policy Passed: Resource limits & requests are configured.`);
  }

  if (errors > 0) {
    console.error(`❌ Kubernetes Policy-as-Code Verification FAILED with ${errors} error(s).`);
    process.exit(1);
  }

  console.log('🎉 All Kubernetes Policy-as-Code checks PASSED successfully!');
}

verifyK8sPolicies();
