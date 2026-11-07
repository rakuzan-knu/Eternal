import { _electron as electron, expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Duplex } from 'node:stream';

async function uploadProbe() {
  return new Promise<{ progress: number; received: number }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    let progress = 0;
    request.upload.onprogress = (event) => {
      if (event.loaded > 0) progress++;
    };
    request.onload = () => resolve({ progress, received: Number(request.responseText) });
    request.onerror = () => reject(new Error('Upload failed'));
    request.open('POST', '/upload');
    request.send(new Uint8Array(1024 * 1024));
  });
}

test('spike verifies HTTPS forwarding and the network fallback for upload progress', async () => {
  const info = test.info();
  const directory = await mkdtemp(join(tmpdir(), 'eternal-desktop-spike-'));
  const openssl =
    process.env.ETERNAL_TEST_OPENSSL ??
    (process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/openssl.exe' : 'openssl');
  await promisify(execFile)(openssl, [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '1',
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost',
    '-keyout',
    join(directory, 'key.pem'),
    '-out',
    join(directory, 'cert.pem'),
  ]);
  const certificate = await readFile(join(directory, 'cert.pem'), 'utf8');
  const server = createServer(
    { key: await readFile(join(directory, 'key.pem')), cert: certificate },
    async (request, response) => {
      if (request.url === '/set-cookies') {
        response.writeHead(302, {
          Location: '/cookies',
          'Set-Cookie': [
            'desktop_first=one; Secure; HttpOnly; SameSite=Lax; Path=/',
            'desktop_second=two; Secure; HttpOnly; SameSite=Lax; Path=/',
          ],
        });
        response.end();
      } else if (request.url === '/cookies') {
        response.setHeader('Content-Type', 'application/json');
        response.end(
          JSON.stringify({
            first: request.headers.cookie?.includes('desktop_first=one') ?? false,
            second: request.headers.cookie?.includes('desktop_second=two') ?? false,
          }),
        );
      } else if (request.url === '/upload') {
        let received = 0;
        for await (const chunk of request) received += Buffer.byteLength(chunk);
        response.end(String(received));
      } else if (request.url === '/stream') {
        response.writeHead(200, {
          'Content-Type': 'text/plain',
          'X-Content-Type-Options': 'nosniff',
        });
        response.flushHeaders();
        response.write('first');
        setTimeout(() => response.end('second'), 300);
      } else if (request.url === '/media' && request.headers.range === 'bytes=2-5') {
        response.writeHead(206, {
          'Content-Range': 'bytes 2-5/10',
          'Content-Length': '4',
          'Accept-Ranges': 'bytes',
        });
        response.end('2345');
      } else {
        response.setHeader('Content-Type', 'text/html');
        response.end('<!doctype html><title>Desktop network spike</title>');
      }
    },
  );
  const connections = new Set<Duplex>();
  server.on('connection', (connection) => {
    connections.add(connection);
    connection.on('close', () => connections.delete(connection));
  });
  server.on('upgrade', (request, socket) => {
    const accept = createHash('sha1')
      .update(`${request.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64');
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    socket.once('data', () => socket.end(Buffer.from([0x81, 2, 111, 107])));
  });
  await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Spike server unavailable');
  const origin = `https://localhost:${address.port}`;
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  environment.NODE_ENV = 'production';
  environment.ETERNAL_DESKTOP_LOCAL_RENDERER = '1';
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${join(directory, 'profile')}`],
    cwd: process.cwd(),
    env: environment,
  });
  try {
    await app.firstWindow();
    await app.evaluate(({ session }, cert) => {
      session.fromPartition('persist:eternal').setCertificateVerifyProc((request, callback) => {
        callback(
          request.hostname === 'localhost' && request.certificate.data.trim() === cert.trim()
            ? 0
            : -3,
        );
      });
    }, certificate);
    const nextWindow = app.waitForEvent('window');
    await app.evaluate(async ({ BrowserWindow, session }, url) => {
      const window = new BrowserWindow({
        show: false,
        webPreferences: {
          session: session.fromPartition('persist:eternal'),
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });
      await window.loadURL(url);
    }, origin);
    const page = await nextWindow;
    const cookies = await page.evaluate(async () => (await fetch('/set-cookies')).json());
    expect(cookies).toEqual({ first: true, second: true });
    const upload = await page.evaluate(uploadProbe);
    expect(upload.received).toBe(1024 * 1024);
    const stream = await page.evaluate(async () => {
      const response = await fetch('/stream');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Streaming response missing');
      const first = await reader.read();
      let tail = '';
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        tail += new TextDecoder().decode(next.value);
      }
      return { first: new TextDecoder().decode(first.value), tail };
    });
    expect(stream).toEqual({ first: 'first', tail: 'second' });
    const range = await page.evaluate(async () => {
      const response = await fetch('/media', { headers: { Range: 'bytes=2-5' } });
      return {
        status: response.status,
        range: response.headers.get('Content-Range'),
        body: await response.text(),
      };
    });
    expect(range).toEqual({ status: 206, range: 'bytes 2-5/10', body: '2345' });
    const socketMessage = await page.evaluate(
      () =>
        new Promise<string>((resolve, reject) => {
          const socket = new WebSocket(location.origin.replace('https:', 'wss:'));
          socket.onopen = () => socket.send('probe');
          socket.onmessage = (event) => {
            resolve(String(event.data));
            socket.close();
          };
          socket.onerror = () => reject(new Error('WebSocket failed'));
        }),
    );
    expect(socketMessage).toBe('ok');
    await app.evaluate(({ session }) => {
      session.fromPartition('persist:eternal').protocol.unhandle('https');
    });
    const directUpload = await page.evaluate(uploadProbe);
    expect(directUpload.received).toBe(1024 * 1024);
    expect(directUpload.progress).toBeGreaterThan(0);
    await info.attach('upload-comparison', {
      body: JSON.stringify({ intercepted: upload, direct: directUpload }),
      contentType: 'application/json',
    });
  } finally {
    await app.close();
    connections.forEach((connection) => connection.destroy());
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
