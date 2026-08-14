#!/usr/bin/env node

/**
 * Infrastructure Test Suite (HCL Static Unit Tester)
 * Validates Terraform HCL infrastructure declarations for DevSecOps rule compliance.
 */

const fs = require('fs');
const path = require('path');

const INFRA_DIR = path.join(__dirname, '..', 'infrastructure');

function verifyTerraformHCL() {
  console.log('🏗️ Starting Infrastructure Test Suite (Free Tier Terraform Assertions)...');

  if (!fs.existsSync(INFRA_DIR)) {
    console.error(`❌ Infrastructure directory not found at ${INFRA_DIR}`);
    process.exit(1);
  }

  let passed = 0;
  let errors = 0;

  const checks = [
    {
      file: 'main.tf',
      assertion: (content) => content.includes('required_providers') && content.includes('vercel'),
      message: 'main.tf must specify Vercel required provider',
    },
    {
      file: 'budget.tf',
      assertion: (content) => content.includes('free_tier_limits') && content.includes('Free Tier'),
      message: 'budget.tf must declare $0 Zero-Cost Free Tier infrastructure budget policy',
    },
  ];

  for (const check of checks) {
    const filePath = path.join(INFRA_DIR, check.file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing Terraform file: ${check.file}`);
      errors++;
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    if (check.assertion(content)) {
      console.log(`  ✓ Infrastructure Test Passed: ${check.message}`);
      passed++;
    } else {
      console.error(`❌ Infrastructure Test Failed: ${check.message}`);
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`❌ Infrastructure Test Suite FAILED with ${errors} error(s).`);
    process.exit(1);
  }

  console.log(`🎉 All ${passed} Free Tier Infrastructure HCL unit tests PASSED successfully!`);
}

verifyTerraformHCL();
