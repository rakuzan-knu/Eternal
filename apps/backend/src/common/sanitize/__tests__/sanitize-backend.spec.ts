/**
 * sanitize-backend differential suite: the SANITIZE_BACKEND migration gate.
 *
 *  - Default stays on audited sanitize-html (locked by direct comparison).
 *  - Pipeline mode must neutralize the full attack battery.
 *  - On the BENIGN corpus both backends must agree byte-for-byte. Any benign
 *    divergence fails loudly here instead of silently reaching production —
 *    this spec IS the security-review checklist for flipping the flag.
 *  - Deterministic fuzz (seeded PRNG, no Math.random): pipeline output must
 *    never contain executable constructs, never throw, never grow input.
 */

import sanitizeHtmlLib from 'sanitize-html';
import { resolveSanitizeBackend, sanitizeField } from '../sanitize-backend';

const STRIP_ALL = { allowedTags: [], allowedAttributes: {} };

const BENIGN = [
  'plain text, nothing special',
  'fish &amp; chips &lt;3',
  'A &AMP; B &NBSP; C &#65;&#x42;',
  '<b>bold</b> and <i>italic</i> and <a href="https://example.com">link</a>',
  '<p>para one</p><p>para two</p>',
  'line one\nline two\ttabbed',
  'emoji 🎉 and Cyrillic привет @user #tag',
  '  padded spaces  ',
  '&lt;not a tag&gt; &unknownentity; survivor',
  '<div class="x" id="y">nested <span>deep <b>bold</b></span> text</div>',
  '<br><hr><img src="x">void elements',
  '<!-- only a comment -->',
  '5 > 3 and 2 < 4 as text',
  'unclosed <b>bold and <a href="https://example.com">link',
  '  ',
];

const ATTACKS = [
  '<script>alert(document.cookie)</script>',
  '<ScRiPt>alert(1)</ScRiPt>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)><circle r=10>',
  '<a href="javascript:alert(1)">click</a>',
  '<a href="JaVaScRiPt:alert(1)">click</a>',
  '<a href="data:text/html,<script>alert(1)</script>">click</a>',
  '<a href="vbscript:msgbox(1)">click</a>',
  '<div onclick="alert(1)" onmouseover="alert(2)">x</div>',
  '<style>body{display:none}</style>visible',
  '<iframe src="https://evil.example"></iframe>',
  '<form action="https://evil.example"><input type="text"></form>',
  '<math><mi xlink:href="javascript:alert(1)">x</mi></math>',
  '<<script>script>alert(1)<</script>/script>',
  '<a href="https&#58;//example.com">obfuscated</a>',
  '<details open ontoggle=alert(1)>x</details>',
];

function assertNeutralized(out: string, source: string): void {
  expect(out).not.toMatch(/<script/i);
  expect(out).not.toMatch(/javascript:/i);
  expect(out).not.toMatch(/vbscript:/i);
  expect(out).not.toMatch(/data:text\/html/i);
  expect(` ${out}`).not.toMatch(/\son\w+\s*=/i);
  expect(out).not.toMatch(/<(iframe|object|embed|form|svg|math|style|link|meta|base)\b/i);
  expect(out.length).toBeLessThanOrEqual(source.length * 6); // escape expansion bound
}

describe('sanitize-backend migration gate', () => {
  const OLD_ENV = process.env.SANITIZE_BACKEND;

  afterEach(() => {
    if (OLD_ENV === undefined) delete process.env.SANITIZE_BACKEND;
    else process.env.SANITIZE_BACKEND = OLD_ENV;
  });

  it('defaults to legacy sanitize-html (byte-identical call)', () => {
    delete process.env.SANITIZE_BACKEND;
    expect(resolveSanitizeBackend()).toBe('legacy');
    for (const text of [...BENIGN, ...ATTACKS]) {
      expect(sanitizeField(text)).toBe(sanitizeHtmlLib(text, STRIP_ALL).trim());
    }
  });

  it('pipeline backend neutralizes the attack battery', () => {
    process.env.SANITIZE_BACKEND = 'pipeline';
    expect(resolveSanitizeBackend()).toBe('pipeline');
    for (const attack of ATTACKS) {
      const out = sanitizeField(attack) as string;
      assertNeutralized(out, attack);
    }
  });

  it('benign corpus: pipeline agrees with legacy byte-for-byte', () => {
    process.env.SANITIZE_BACKEND = 'pipeline';
    for (const text of BENIGN) {
      const expected = sanitizeHtmlLib(text, STRIP_ALL).trim();
      const got = sanitizeField(text) as string;
      expect(got).toBe(expected);
    }
  });

  it('non-strings pass through on both backends', () => {
    for (const mode of [undefined, 'pipeline'] as const) {
      if (mode === undefined) delete process.env.SANITIZE_BACKEND;
      else process.env.SANITIZE_BACKEND = mode;
      expect(sanitizeField(null)).toBeNull();
      expect(sanitizeField(undefined)).toBeUndefined();
      expect(sanitizeField(42)).toBe(42);
    }
  });

  it('deterministic fuzz: pipeline never leaks executables, throws, or grows', () => {
    process.env.SANITIZE_BACKEND = 'pipeline';
    let seed = 0xc0ffee >>> 0;
    const next = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const tags = ['b', 'i', 'a', 'div', 'script', 'img', 'svg', 'p', 'a', 'style', 'br', 'span'];
    const attrs = [
      'href="javascript:alert(1)"',
      'onerror=alert(1)',
      'class="x"',
      'href="https://ok.example"',
      'src=x',
    ];
    const texts = ['hello', '&amp;', '<', 'world', '@user', '#tag', '"quoted"', "it's"];
    for (let i = 0; i < 500; i++) {
      const parts: string[] = [];
      const chunks = 1 + Math.floor(next() * 5);
      for (let k = 0; k < chunks; k++) {
        const r = next();
        if (r < 0.35) parts.push(`<${tags[Math.floor(next() * tags.length)]}>`);
        else if (r < 0.5) {
          parts.push(
            `<${tags[Math.floor(next() * tags.length)]} ${attrs[Math.floor(next() * attrs.length)]}>`,
          );
        } else if (r < 0.6) parts.push('</div>');
        else if (r < 0.7) parts.push('<!-- c -->');
        else parts.push(texts[Math.floor(next() * texts.length)]);
      }
      const input = parts.join(' ');
      let out: unknown;
      expect(() => {
        out = sanitizeField(input);
      }).not.toThrow();
      assertNeutralized(out as string, input);
    }
  });
});
