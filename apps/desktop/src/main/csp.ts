import { createHash } from 'node:crypto';

export function createContentSecurityPolicy(html: string, development = false): string {
  const hashes = [
    ...html.matchAll(
      /<script(?=[\t\n\f\r />])(?:[^>"']|"[^"]*"|'[^']*')*>([\s\S]*?)<\/script(?=[\t\n\f\r />])(?:[^>"']|"[^"]*"|'[^']*')*>/gi,
    ),
  ]
    .filter((match) => match[1]?.trim())
    .map(
      (match) =>
        `'sha256-${createHash('sha256')
          .update(match[1] ?? '')
          .digest('base64')}'`,
    );
  const scripts = [
    "'self'",
    "'wasm-unsafe-eval'",
    'https://challenges.cloudflare.com',
    'https://sdk.scdn.co',
    'https://www.youtube.com',
    'https://s.ytimg.com',
    'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/',
    ...hashes,
  ];
  if (development) scripts.push("'unsafe-eval'", "'unsafe-inline'");
  return [
    "default-src 'self'",
    `script-src ${scripts.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "media-src 'self' blob: data: https:",
    `connect-src 'self' https: wss: blob:${development ? ' http://localhost:* ws://localhost:*' : ''}`,
    "frame-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function localHeaders(path: string, csp: string): Headers {
  return new Headers({
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(), payment=()',
    'Cache-Control': path.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
  });
}
