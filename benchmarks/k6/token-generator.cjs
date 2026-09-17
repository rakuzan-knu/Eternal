#!/usr/bin/env node

/**
 * Fast Deterministic JWT Token Generator for 10,000 Stress-Testing Virtual Users.
 * Generates signed HS256 JWT access tokens matching the backend auth schema.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_SECRET =
  process.env.JWT_ACCESS_SECRET || 'super-secret-access-key-32-chars-long-or-more-123456';

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload, secret = DEFAULT_SECRET) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${signature}`;
}

function generateUserTokens(count = 10000, secret = DEFAULT_SECRET) {
  const users = [];
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 86400 * 7; // 7 days

  for (let i = 1; i <= count; i++) {
    const userId = `vu-user-${String(i).padStart(5, '0')}`;
    const username = `benchuser_${i}`;
    const email = `benchuser_${i}@example.com`;
    const jti = crypto.randomUUID();

    const payload = {
      type: 'access',
      sub: userId,
      email,
      username,
      jti,
      iat: now,
      exp,
    };

    const token = signJwt(payload, secret);
    users.push({
      userId,
      username,
      email,
      token,
    });
  }

  return users;
}

function main() {
  const args = process.argv.slice(2);
  let count = 10000;
  let outputPath = path.join(__dirname, 'tokens.json');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--out' && args[i + 1]) {
      outputPath = path.resolve(args[i + 1]);
      i++;
    }
  }

  console.log(`🔑 Generating ${count} deterministic test JWT tokens...`);
  const start = Date.now();
  const users = generateUserTokens(count);
  const durationMs = Date.now() - start;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(users, null, 2), 'utf-8');

  console.log(
    `✅ Successfully generated ${users.length} tokens in ${durationMs}ms -> ${outputPath}`,
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  signJwt,
  generateUserTokens,
};
