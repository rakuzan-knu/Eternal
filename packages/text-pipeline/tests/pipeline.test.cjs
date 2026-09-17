/**
 * text-pipeline v1 conformance suite (node:test, zero runtime dependencies).
 *
 *  - Golden vectors (vectors/v1.json): full result equality incl. spans,
 *    links, spam scores, caps flags.
 *  - Sanitizer security properties: script/JS-URL/event-handler elimination,
 *    idempotence, malformed markup handling.
 *  - Caps/truncation/edge behavior.
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  extractHashtags,
  extractMentions,
  findLinks,
  processText,
  sanitizeRich,
  sanitizeText,
  scoreSpamText,
} = require('../dist/index.js');

describe('golden vectors (vectors/v1.json — shared cross-language contract)', () => {
  const doc = require('../vectors/v1.json');
  assert.equal(doc.version, 1);
  for (const v of doc.vectors) {
    it(v.name, () => {
      const r = processText(v.input, v.options);
      assert.deepEqual(
        {
          text: r.text,
          html: r.html,
          mentions: [...r.mentions],
          mentionSpans: r.mentionSpans.map((s) => ({ ...s })),
          hashtags: [...r.hashtags],
          hashtagSpans: r.hashtagSpans.map((s) => ({ ...s })),
          links: r.links.map((l) => ({ ...l })),
          spam: { ...r.spam, reasons: [...r.spam.reasons] },
          capped: r.capped,
          truncated: r.truncated,
        },
        v.expected,
      );
    });
  }
});

describe('sanitizer security properties', () => {
  const attacks = [
    '<script>alert(1)</script>',
    '<ScRiPt>alert(1)</ScRiPt>',
    '<img src=x onerror=alert(1)>',
    '<a href="javascript:alert(1)">x</a>',
    '<a href="JaVaScRiPt:alert(1)">x</a>',
    '<a href="data:text/html,<script>alert(1)</script>">x</a>',
    '<svg onload=alert(1)>',
    '<div onclick="alert(1)">x</div>',
    '<<script>script>alert(1)<</script>/script>',
    '<style>body{display:none}</style>hello',
    '<!-- comment -->visible',
    '<a href="https://ok.example">x',
  ];
  for (const attack of attacks) {
    it(`neutralizes ${JSON.stringify(attack.slice(0, 40))} (text)`, () => {
      const out = sanitizeText(attack);
      // Text mode returns HTML-escaped safe text: every &<>"' must belong
      // to a known entity — nothing raw survives to form markup or URLs.
      const stripped = out.replace(/&(amp|lt|gt|quot|#x27|#\d+|#[xX][0-9a-fA-F]+);/g, '');
      assert.ok(!/[&<>"']/.test(stripped), `raw special char in ${JSON.stringify(out)}`);
      assert.ok(!/<script/i.test(out), 'no script tag');
      assert.ok(!/\son\w+\s*=/i.test(` ${out}`), 'no event handler');
    });
    it(`neutralizes ${JSON.stringify(attack.slice(0, 40))} (rich)`, () => {
      const out = sanitizeRich(attack);
      assert.ok(!/<script/i.test(out), 'no script tag');
      assert.ok(!/javascript:/i.test(out), 'no js url');
      assert.ok(!/\son\w+\s*=/i.test(` ${out}`), 'no event handler');
      assert.ok(!/<(img|svg|style|div|script)\b/i.test(out), 'no disallowed tag');
    });
  }

  it('rich keeps allowlisted formatting + safe links', () => {
    const out = sanitizeRich('<p>Hi <b>bob</b>, see <a href="https://example.com/x">this</a></p>');
    assert.ok(out.includes('<b>bob</b>'));
    assert.ok(
      out.includes('<a href="https://example.com/x" rel="noopener noreferrer nofollow">this</a>'),
    );
  });

  it('rich is idempotent', () => {
    const samples = [
      '<p>Hello <b>world</b> <a href="https://example.com">x</a></p>',
      'plain @user #tag https://example.com',
      '<script>evil()</script>text <img src=x onerror=y>',
    ];
    for (const s of samples) {
      assert.equal(sanitizeRich(sanitizeRich(s)), sanitizeRich(s));
    }
  });
});

describe('caps, truncation, edges', () => {
  it('caps flags and spam reasons', () => {
    const r = processText('@a @b @c', { maxMentions: 2 });
    assert.equal(r.capped, true);
    assert.ok(r.spam.reasons.includes('TOO_MANY_MENTIONS'));
  });

  it('truncates inputs over maxLength and reports it', () => {
    const r = processText(`x${'y'.repeat(200)}`, { maxLength: 10 });
    assert.equal(r.truncated, true);
    assert.ok(r.text.length <= 10);
  });

  it('handles null/undefined/empty', () => {
    for (const bad of [null, undefined, '']) {
      const r = processText(bad);
      assert.equal(r.text, '');
      assert.deepEqual([...r.mentions], []);
      assert.deepEqual([...r.hashtags], []);
      assert.equal(r.spam.score, 0);
    }
  });

  it('extractors mirror legacy boundary semantics', () => {
    assert.deepEqual(extractMentions('email@example.com @ok'), ['ok']);
    assert.deepEqual(extractMentions('@a,@b'), ['a', 'b']); // ',' (44) is a boundary
    assert.deepEqual(extractHashtags('a#b #c'), ['#b', '#c']);
    assert.deepEqual(findLinks('see (https://example.com/x).'), [
      { value: 'https://example.com/x', start: 5, end: 26, url: 'https://example.com/x' },
    ]);
  });

  it('spam scorer is deterministic and bounded', () => {
    const a = scoreSpamText('BUY NOW!!!', {
      mentionCount: 0,
      hashtagCount: 0,
      linkCount: 0,
      maxMentions: 5,
      maxHashtags: 8,
      maxLinks: 2,
    });
    const b = scoreSpamText('BUY NOW!!!', {
      mentionCount: 0,
      hashtagCount: 0,
      linkCount: 0,
      maxMentions: 5,
      maxHashtags: 8,
      maxLinks: 2,
    });
    assert.deepEqual(a, b);
    assert.ok(a.score >= 0 && a.score <= 1);
  });
});
