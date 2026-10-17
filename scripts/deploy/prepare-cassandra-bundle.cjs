const { writeFileSync, renameSync, rmSync } = require('node:fs');
const { randomUUID } = require('node:crypto');

// Render Secret Files accept text. Decode the private ZIP only at runtime,
// under the application user, before the Cassandra driver is instantiated.
const encoded = process.env.CASSANDRA_SECURE_CONNECT_BUNDLE_BASE64;
if (encoded) {
  const target = process.env.CASSANDRA_SECURE_CONNECT_BUNDLE;
  const bundle = Buffer.from(encoded, 'base64');
  if (
    !target ||
    bundle.length > 1024 * 1024 ||
    bundle.toString('base64') !== encoded ||
    !bundle.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  ) {
    throw new Error('Invalid Cassandra Secure Connect Bundle configuration');
  }
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, bundle, { flag: 'wx', mode: 0o600 });
    renameSync(temporary, target);
  } finally {
    rmSync(temporary, { force: true });
  }
}
