#!/usr/bin/env node
// Read-only checks. Origins are explicit so this also verifies the production split.
const roles = ['core', 'messenger', 'reels', 'music'];
const origins = process.argv.slice(2);
if (origins.length !== roles.length)
  throw new Error('Provide core, messenger, reels and music origins');
const paths = [
  '/v1/posts?limit=1',
  '/v1/conversations',
  '/v1/reels/feed?limit=1',
  '/v1/integrations/music/liked-tracks',
];
const statuses = [200, 401, 200, 401];

async function check(origin, path, status, role) {
  const response = await fetch(origin.replace(/\/+$/, '') + path, {
    signal: AbortSignal.timeout(30000),
  });
  if (response.status !== status)
    throw new Error(`${role} ${path}: expected ${status}, got ${response.status}`);
  if (!path.startsWith('/socket.io/') && response.headers.get('x-service-role') !== role)
    throw new Error(`${role}: deployment role header mismatch`);
  return response;
}

(async () => {
  for (let index = 0; index < roles.length; index++) {
    const role = roles[index];
    const origin = origins[index];
    const response = await check(origin, '/health/ready', 200, role);
    const readiness = await response.json();
    if (readiness.services?.database !== 'ok' || readiness.services?.redis !== 'ok')
      throw new Error(`${role}: dependency readiness failed`);
    for (let feature = 0; feature < paths.length; feature++) {
      await check(origin, paths[feature], feature === index ? statuses[feature] : 404, role);
    }
    if (role !== 'messenger') await check(origin, '/socket.io/?EIO=4&transport=polling', 403, role);
    console.log(
      `${role}: readiness, owned routes, wrong-service rejection and socket boundary passed`,
    );
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
