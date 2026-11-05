import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createContentSecurityPolicy } from './csp';

function hash(script: string): string {
  return `'sha256-${createHash('sha256').update(script).digest('base64')}'`;
}

describe('bundled inline script CSP hashes', () => {
  it.each([
    '</script>',
    '</script >',
    '</ScRiPt\t>',
    '</script\n>',
    '</script\r\n>',
    '</script\f>',
    '</script/>',
    '</script ignored="value > other">',
  ])('hashes exactly the script body before the browser-recognized ending %j', (ending) => {
    const first = 'window.theme = "dark";';
    const second = 'window.ready = true;';
    const outside = '<div>outside script</div>';
    const policy = createContentSecurityPolicy(
      `<script>${first}${ending}${outside}<script>${second}</script>`,
    );
    expect(policy).toContain(hash(first));
    expect(policy).toContain(hash(second));
    expect(policy).not.toContain(hash(first + ending + outside + '<script>' + second));
  });

  it('respects quoted tag attributes and exact script tag names', () => {
    const script = 'window.name = "</scripture>";';
    const policy = createContentSecurityPolicy(
      `<script data-value="a > b">${script}</script ><script-data>notAScript()</script-data>`,
    );
    expect(policy).toContain(hash(script));
    expect(policy).not.toContain(hash('notAScript()'));
  });

  it('keeps the external SDK allowlist and disallows arbitrary production inline/eval scripts', () => {
    const policy = createContentSecurityPolicy('<script>window.theme = 1;</script >');
    const scripts = policy.split('; ').find((directive) => directive.startsWith('script-src '));
    expect(scripts).toContain('https://challenges.cloudflare.com');
    expect(scripts).toContain('https://sdk.scdn.co');
    expect(scripts).toContain('https://www.youtube.com');
    expect(scripts).toContain('https://s.ytimg.com');
    expect(scripts).toContain('https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/');
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(scripts).not.toContain(hash('untrustedScript()'));
  });
});
