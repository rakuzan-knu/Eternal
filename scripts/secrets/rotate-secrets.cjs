#!/usr/bin/env node

/**
 * Automated Secrets Rotation Script
 * Generates cryptographically secure keys (JWT Secrets, Encryption Keys)
 * and synchronizes with Render REST API and production environment configs.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');

const DRY_RUN = process.argv.includes('--dry-run');

function generateSecureSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function rotateSecrets() {
  console.log('🔄 Starting Automated Secret Rotation Procedure...');

  const newSecrets = {
    JWT_ACCESS_SECRET: generateSecureSecret(32),
    JWT_REFRESH_SECRET: generateSecureSecret(32),
    BACKUP_ENCRYPTION_KEY: generateSecureSecret(32),
    SESSION_SECRET: generateSecureSecret(32),
  };

  console.log('🔑 Newly generated cryptographically secure secrets:');
  for (const [key, val] of Object.entries(newSecrets)) {
    console.log(
      `  • ${key}: [${val.substring(0, 6)}...${val.substring(val.length - 4)}] (length: ${val.length} chars)`,
    );
  }

  if (DRY_RUN) {
    console.log(
      '\n🔍 [DRY RUN] Secrets generated successfully. No live external API calls or file mutations performed.',
    );
    process.exit(0);
  }

  // Update .env.example if missing keys
  const envExamplePath = path.join(__dirname, '..', '..', '.env.example');
  try {
    let content = fs.readFileSync(envExamplePath, 'utf8');
    let updated = false;
    for (const key of Object.keys(newSecrets)) {
      if (!content.includes(key)) {
        content += `\n${key}=your_${key.toLowerCase()}_value`;
        updated = true;
      }
    }
    if (updated) {
      fs.writeFileSync(envExamplePath, content, 'utf8');
      console.log('  ✓ Updated .env.example key references.');
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      const safeErrorMessage = String(err && err.message ? err.message : err).replace(
        /[\r\n]/g,
        '',
      );
      console.warn(`  ⚠️ Could not update .env.example: ${safeErrorMessage}`);
    }
  }

  // Sync to Render API if credentials exist
  const renderApiKey = process.env.RENDER_API_KEY;
  const renderServiceId = process.env.RENDER_SERVICE_ID;

  if (renderApiKey && renderServiceId) {
    console.log(`🚀 Synchronizing rotated secrets to Render Service ID: ${renderServiceId}...`);

    const payload = Object.entries(newSecrets).map(([key, value]) => ({
      key,
      value,
    }));

    const data = JSON.stringify(payload);

    const req = https.request(
      `https://api.render.com/v1/services/${renderServiceId}/env-vars`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${renderApiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ Secrets successfully rotated and synchronized to Render API!');
          } else {
            const safeBody = String(body).replace(/[\r\n]/g, '');
            console.error(
              `❌ Render API secret rotation sync failed (HTTP ${res.statusCode}): ${safeBody}`,
            );
            process.exit(1);
          }
        });
      },
    );

    req.on('error', (err) => {
      const safeErrorMessage = String(err && err.message ? err.message : err).replace(
        /[\r\n]/g,
        '',
      );
      console.error(`❌ Error communicating with Render API: ${safeErrorMessage}`);
      process.exit(1);
    });

    req.write(data);
    req.end();
  } else {
    console.log(
      'ℹ️ RENDER_API_KEY or RENDER_SERVICE_ID not set. Rotated secrets generated locally.',
    );
  }
}

rotateSecrets();
