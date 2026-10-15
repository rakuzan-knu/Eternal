import assert from 'node:assert/strict';
import { it } from 'node:test';
import { runInNewContext } from 'node:vm';
import { preserveMswOriginGuard } from '../msw-origin-guard.js';

const generatedWorker = `addEventListener('message', async function (event) {
  received.push(event.data);
});`;

it('keeps cross-origin messages out of a regenerated worker', async () => {
  const received = [];
  let message;
  runInNewContext(preserveMswOriginGuard(generatedWorker), {
    received,
    self: { location: { origin: 'https://eternal.example' } },
    addEventListener: (_, handler) => {
      message = handler;
    },
  });
  await message({ origin: 'https://external.example', data: 'foreign' });
  await message({ origin: 'https://eternal.example', data: 'local' });
  await message({ origin: '', data: 'originless' });
  assert.deepEqual(received, ['local', 'originless']);
});

it('does not duplicate the existing protection or change a guarded worker', () => {
  const guarded = preserveMswOriginGuard(generatedWorker);
  assert.equal(preserveMswOriginGuard(guarded), guarded);
});

it('rejects an unexpected worker format instead of silently dropping protection', () => {
  assert.throws(() => preserveMswOriginGuard('// unknown worker'), /message handler/);
});
