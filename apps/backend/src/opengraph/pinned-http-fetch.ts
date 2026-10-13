import * as http from 'node:http';
import * as https from 'node:https';
import type { LookupAddress } from 'node:dns';

/** Connect only to the addresses approved by the caller, preserving HTTP Host and TLS SNI. */
export function fetchPinned(
  url: string,
  init: RequestInit,
  addresses: LookupAddress[],
  maxBytes: number,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (!addresses.length) return reject(new Error('No approved addresses'));
    const parsed = new URL(url);
    const request = (parsed.protocol === 'https:' ? https : http).request(
      parsed,
      {
        method: 'GET',
        agent: false,
        headers: init.headers as Record<string, string>,
        signal: init.signal || undefined,
        lookup: (_hostname, options, callback) => {
          if (options.all) callback(null, addresses);
          else callback(null, addresses[0].address, addresses[0].family);
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on('error', reject);
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            response.destroy(new Error('Preview body exceeds limit'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(response.headers)) {
            if (value !== undefined)
              headers.set(key, Array.isArray(value) ? value.join(', ') : value);
          }
          const status = response.statusCode || 502;
          resolve(
            new Response(
              [204, 205, 304].includes(status) ? null : new Uint8Array(Buffer.concat(chunks)),
              { status, headers },
            ),
          );
        });
      },
    );
    request.on('error', reject);
    request.end();
  });
}
