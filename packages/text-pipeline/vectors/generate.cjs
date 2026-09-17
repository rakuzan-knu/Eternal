/**
 * Generates packages/text-pipeline/vectors/v1.json — the shared conformance
 * contract for EVERY text-pipeline implementation (TS core, Rust crate, and
 * any future Swift/Kotlin/RN port).
 *
 * Each case is tagged with `implementations`: ["ts","rust"] (full parity) or
 * ["ts"] (rich-HTML rendering, TS-only in v1 — see README).
 *
 * Run: node vectors/generate.cjs (from packages/text-pipeline)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { processText } = require('../dist/index.js');

const CASES = [
  { name: 'plain-mentions', input: 'Hello @alex and @sam!', options: {} },
  { name: 'hashtags-mixed', input: 'loving #TypeScript and #nestjs everyday #привет', options: {} },
  {
    name: 'xss-text-mode',
    input: '<script>alert(1)</script>hi <b>bob</b> @bob',
    options: { mode: 'text' },
  },
  {
    name: 'xss-rich-anchors',
    input:
      '<p>Hello <a href="javascript:alert(1)">click</a> <a href="https://example.com">ok</a></p>',
    options: { mode: 'rich' },
  },
  {
    name: 'linkify-rich',
    input: 'visit https://example.com/a(b) and www.test.org, ok',
    options: { mode: 'rich', linkify: true },
  },
  {
    name: 'mention-bomb-spam',
    input: '@a @b @c @d @e @f @g BUY NOW click here!!!',
    options: { maxMentions: 5 },
  },
  { name: 'emoji-offsets', input: 'hi @bob 🎉 #party', options: {} },
  { name: 'empty', input: '', options: {} },
  { name: 'shouting', input: 'THIS IS A SHOUTING MESSAGE ABOUT NOTHING AT ALL', options: {} },
  { name: 'entities', input: 'fish &amp; chips &lt;3 @sam', options: {} },
  { name: 'entities-upper', input: 'A &AMP; B &NBSP; C &#65;', options: {} },
  {
    name: 'ports-and-localhost',
    input: 'dev at http://localhost:3000/x and http://example.com:8080/y',
    options: { linkify: true },
  },
  { name: 'hashtag-no-boundary', input: 'email#tag and #ok', options: {} },
];

const vectors = CASES.map((c) => {
  const r = processText(c.input, c.options);
  return {
    name: c.name,
    input: c.input,
    options: c.options,
    implementations: c.implementations || ['ts', 'rust'],
    expected: {
      text: r.text,
      html: r.html,
      mentions: r.mentions,
      mentionSpans: r.mentionSpans,
      hashtags: r.hashtags,
      hashtagSpans: r.hashtagSpans,
      links: r.links,
      spam: r.spam,
      capped: r.capped,
      truncated: r.truncated,
    },
  };
});

const doc = {
  version: 1,
  note: 'Shared text-pipeline v1 conformance contract. Spans are UTF-16 code-unit offsets.',
  vectors,
};

const outPath = path.join(__dirname, 'v1.json');
fs.writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`wrote ${outPath} (${vectors.length} vectors)`);
