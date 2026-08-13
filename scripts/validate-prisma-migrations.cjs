#!/usr/bin/env node

/**
 * Prisma Migration Linter
 * Validates migration SQL files for non-breaking expand/contract compliance.
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'backend', 'prisma', 'migrations');

const DANGEROUS_PATTERNS = [
  { pattern: /\bDROP\s+COLUMN\b/i, name: 'DROP COLUMN (Violates Expand phase)' },
  { pattern: /\bRENAME\s+COLUMN\b/i, name: 'RENAME COLUMN (Use parallel column instead)' },
  { pattern: /\bRENAME\s+TABLE\b/i, name: 'RENAME TABLE (Use view/parallel table instead)' },
  {
    pattern: /\bSET\s+NOT\s+NULL\b/i,
    name: 'SET NOT NULL without DEFAULT (Can break active writers)',
  },
];

function lintMigrations() {
  console.log('🔍 Validating Prisma SQL migrations for Expand/Contract safety...');

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('ℹ️ No migrations directory found at backend/prisma/migrations. Skipping.');
    process.exit(0);
  }

  const migrationFolders = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  let errorsCount = 0;

  for (const folder of migrationFolders) {
    const sqlPath = path.join(MIGRATIONS_DIR, folder, 'migration.sql');
    if (!fs.existsSync(sqlPath)) continue;

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Skip contract migrations explicitly marked with comment '-- ALLOW_CONTRACT_PHASE'
    if (sqlContent.includes('-- ALLOW_CONTRACT_PHASE')) {
      console.log(`  ✓ Skipping contract migration: ${folder} (Explicitly marked)`);
      continue;
    }

    for (const { pattern, name } of DANGEROUS_PATTERNS) {
      if (pattern.test(sqlContent)) {
        console.error(`❌ Migration Error in [${folder}/migration.sql]:`);
        console.error(`   Found prohibited pattern: ${name}`);
        console.error(
          `   Rule: Use Expand/Contract pattern or mark with '-- ALLOW_CONTRACT_PHASE' if intentional.\n`,
        );
        errorsCount++;
      }
    }
  }

  if (errorsCount > 0) {
    console.error(`❌ Prisma Migration Validation FAILED with ${errorsCount} violation(s).`);
    process.exit(1);
  }

  console.log('🎉 All Prisma migrations passed Expand/Contract security checks!');
}

lintMigrations();
