import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { it } from 'node:test';

// Exercise the implementation actually loaded by the backend's Axios.
const backendRequire = createRequire(new URL('../../apps/backend/package.json', import.meta.url));
const axiosRequire = createRequire(backendRequire.resolve('axios/package.json'));
const { http } = axiosRequire('follow-redirects');

for (const arrayHeaders of [false, true]) {
  it(`strips redirect credentials with ${arrayHeaders ? 'array' : 'object'} headers`, async () => {
    const target = createServer((request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(request.headers));
    });
    const redirect = createServer((_request, response) => {
      response.writeHead(302, { location: `http://127.0.0.1:${target.address().port}/` });
      response.end();
    });
    try {
      target.listen(0, '127.0.0.1');
      await once(target, 'listening');
      redirect.listen(0, '127.0.0.1');
      await once(redirect, 'listening');
      const credentials = {
        Authorization: 'Bearer test-only',
        Cookie: 'session=test-only',
        'Proxy-Authorization': 'Basic test-only',
        'X^Secret': 'custom-test-only',
        'X|Secret': 'custom-test-only',
        'X-Public': 'preserved',
      };
      const received = await new Promise((resolve, reject) => {
        const request = http.get(
          `http://127.0.0.1:${redirect.address().port}/`,
          {
            agent: false,
            headers: arrayHeaders ? Object.entries(credentials).flat() : credentials,
            sensitiveHeaders: ['X^Secret', 'X|Secret'],
          },
          (response) => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => {
              body += chunk;
            });
            response.on('end', () => {
              resolve(JSON.parse(body));
            });
            response.on('error', reject);
          },
        );
        request.on('error', reject);
        request.setTimeout(5_000, () => request.destroy(new Error('Redirect fixture timed out')));
      });
      for (const name of Object.keys(credentials).filter((name) => name !== 'X-Public'))
        assert.equal(received[name.toLowerCase()], undefined, `${name} leaked to redirect target`);
      assert.equal(received['x-public'], 'preserved');
    } finally {
      await Promise.all(
        [target, redirect].map(
          (server) =>
            new Promise((resolve) => {
              server.close(resolve);
              server.closeAllConnections();
            }),
        ),
      );
    }
  });
}
