/**
 * Optional Rust accelerator host for the portable cores.
 *
 * Same contract as the msg-codec loader (native-bindings.ts):
 *  - Zero hard dependencies; null on any load problem, never throws
 *    (except fail-fast MSG_*=native with no usable binary).
 *  - Every binary is cross-checked against the portable TS core before use.
 *  - Selection: MSG_TEXT / MSG_BLIND = 'auto' (default) | 'ts' | 'native'.
 *
 * Prebuild layout (CI publishes per platform on demand):
 *   node_modules/@social-network/<pkg>-<platform>-<arch>[-<libc>]/index.js
 * Local dev builds: <nativeRoot>/prebuilds/<pkg>.<triple>.node
 */

import * as path from 'node:path';
import { processText as coreProcessText } from '@social-network/text-pipeline';
import type { PipelineOptions } from '@social-network/text-pipeline';
import {
  signBlinded as coreSign,
  verifyTicket as coreVerify,
} from '@social-network/blinded-crypto';

export type AcceleratorSelection = 'auto' | 'ts' | 'native';

function parseSelection(envName: 'MSG_TEXT' | 'MSG_BLIND'): AcceleratorSelection {
  const mode = (process.env[envName] ?? 'auto').toLowerCase();
  if (mode === 'ts' || mode === 'native' || mode === 'auto') return mode;
  return 'auto';
}

function candidateTriples(): string[] {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === 'linux') return [`linux-${arch}-gnu`, `linux-${arch}-musl`];
  return [`${platform}-${arch}`];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// text-pipeline

export interface TextPipelineBinding {
  codecVersion(): number;
  selfTest?(): boolean;
  processText(input: string, optionsJson: string): string;
  sanitizeText(input: string): string;
  extractMentions(input: string): string[];
  extractHashtags(input: string): string[];
  levenshteinDistance?(a: string, b: string, maxDist: number): number;
  rankFuzzySearch?(term: string, candidatesJson: string, maxDist: number, limit: number): string;
}

function isTextBinding(value: unknown): value is TextPipelineBinding {
  return (
    isRecord(value) &&
    typeof value['processText'] === 'function' &&
    typeof value['sanitizeText'] === 'function' &&
    typeof value['extractMentions'] === 'function' &&
    typeof value['extractHashtags'] === 'function'
  );
}

function crossCheckText(binding: TextPipelineBinding): boolean {
  try {
    if (typeof binding.codecVersion === 'function' && binding.codecVersion() !== 1) return false;
    if (typeof binding.selfTest === 'function' && binding.selfTest() !== true) return false;
    if (
      typeof binding.levenshteinDistance === 'function' &&
      binding.levenshteinDistance('kitten', 'sitting', 10) !== 3
    ) {
      return false;
    }
    const samples: Array<{ input: string; options: PipelineOptions }> = [
      { input: 'Hello @alex #hi https://example.com/x', options: {} },
      { input: '<script>evil()</script>hi @bob 🎉 #party', options: { mode: 'text' } },
      { input: 'BUY NOW @a @b @c @d @e @f click here', options: { maxMentions: 5 } },
    ];
    for (const s of samples) {
      const expected = coreProcessText(s.input, s.options);
      const got = JSON.parse(binding.processText(s.input, JSON.stringify(s.options))) as Record<
        string,
        unknown
      >;
      for (const key of ['text', 'mentions', 'hashtags', 'capped', 'truncated'] as const) {
        if (JSON.stringify(got[key]) !== JSON.stringify(expected[key])) return false;
      }
      const gotSpam = got['spam'] as { score: unknown; reasons: unknown };
      if (gotSpam.score !== expected.spam.score) return false;
      if (JSON.stringify(gotSpam.reasons) !== JSON.stringify(expected.spam.reasons)) return false;
      const gotLinks = got['links'] as Array<Record<string, unknown>>;
      if (gotLinks.length !== expected.links.length) return false;
      for (let i = 0; i < gotLinks.length; i++) {
        const l = gotLinks[i];
        const e = expected.links[i];
        if (
          l['value'] !== e.value ||
          l['url'] !== e.url ||
          l['start'] !== e.start ||
          l['end'] !== e.end
        )
          return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function tryLoadTextPipeline(): TextPipelineBinding | null {
  const selection = parseSelection('MSG_TEXT');
  if (selection === 'ts') return null;
  const failures: string[] = [];
  const attempts: string[] = [];
  for (const triple of candidateTriples()) {
    attempts.push(
      `@social-network/text-pipeline-${triple}`,
      path.join(__dirname, '..', 'prebuilds', `text-pipeline.${triple}.node`),
    );
  }
  for (const candidate of attempts) {
    try {
      const loaded: unknown = require(candidate);
      const binding = (loaded as { default?: unknown }).default ?? loaded;
      if (!isTextBinding(binding)) {
        failures.push(`${candidate}: incompatible ABI`);
        continue;
      }
      if (!crossCheckText(binding)) {
        failures.push(`${candidate}: cross-check failed`);
        continue;
      }
      return binding;
    } catch (err) {
      failures.push(`${candidate}: ${(err as Error).message}`);
    }
  }
  if (selection === 'native') {
    throw new Error(`MSG_TEXT=native but no usable binary: ${failures.join(' | ')}`);
  }
  return null;
}

// blinded-crypto

export interface BlindedCryptoBinding {
  crateVersion(): number;
  selfTest?(): boolean;
  signBlinded(nHex: string, dHex: string, blindedHex: string): string;
  verifyTicket(nHex: string, eHex: string, ticketHex: string, signatureHex: string): boolean;
}

function isBlindedBinding(value: unknown): value is BlindedCryptoBinding {
  return (
    isRecord(value) &&
    typeof value['signBlinded'] === 'function' &&
    typeof value['verifyTicket'] === 'function'
  );
}

function crossCheckBlinded(binding: BlindedCryptoBinding): boolean {
  try {
    if (typeof binding.crateVersion === 'function' && binding.crateVersion() !== 1) return false;
    if (typeof binding.selfTest === 'function' && binding.selfTest() !== true) return false;
    // Textbook RSA n=3233: independent of any key material.
    const sig = binding.signBlinded('0ca1', '0ac1', '41');
    const expected = coreSign({ nHex: '0ca1', dHex: '0ac1', blindedHex: '41' });
    if (sig !== expected) return false;
    if (binding.verifyTicket('0ca1', '11', '41', sig) !== true) return false;
    if (binding.verifyTicket('0ca1', '11', '41', '0ae7') !== false) return false;
    return coreVerify({ nHex: '0ca1', eHex: '11', ticketHex: '41', signatureHex: sig }) === true;
  } catch {
    return false;
  }
}

export function tryLoadBlindedCrypto(): BlindedCryptoBinding | null {
  const selection = parseSelection('MSG_BLIND');
  if (selection === 'ts') return null;
  const failures: string[] = [];
  const attempts: string[] = [];
  for (const triple of candidateTriples()) {
    attempts.push(
      `@social-network/blinded-crypto-${triple}`,
      path.join(__dirname, '..', 'prebuilds', `blinded-crypto.${triple}.node`),
    );
  }
  for (const candidate of attempts) {
    try {
      const loaded: unknown = require(candidate);
      const binding = (loaded as { default?: unknown }).default ?? loaded;
      if (!isBlindedBinding(binding)) {
        failures.push(`${candidate}: incompatible ABI`);
        continue;
      }
      if (!crossCheckBlinded(binding)) {
        failures.push(`${candidate}: cross-check failed`);
        continue;
      }
      return binding;
    } catch (err) {
      failures.push(`${candidate}: ${(err as Error).message}`);
    }
  }
  if (selection === 'native') {
    throw new Error(`MSG_BLIND=native but no usable binary: ${failures.join(' | ')}`);
  }
  return null;
}

// feed-score

export interface FeedScoreBinding {
  crateVersion(): number;
  selfTest?(): boolean;
  scoreCandidates(candidatesJson: string, optionsJson: string): string;
}

function isFeedBinding(value: unknown): value is FeedScoreBinding {
  return isRecord(value) && typeof value['scoreCandidates'] === 'function';
}

function crossCheckFeed(binding: FeedScoreBinding): boolean {
  try {
    if (typeof binding.crateVersion === 'function' && binding.crateVersion() !== 1) return false;
    if (typeof binding.selfTest === 'function' && binding.selfTest() !== true) return false;
    const candidates = [
      {
        id: 'u1',
        distKm: 10,
        allowNearby: true,
        city: null,
        mutuals: [],
        mutualCount: 3,
        followersCount: 99,
        lastActiveAtMs: null,
      },
      {
        id: 'u2',
        distKm: null,
        allowNearby: true,
        city: 'Kyiv',
        mutuals: [{ id: 'm', username: 'ann', avatar: null }],
        mutualCount: 1,
        followersCount: 5,
        lastActiveAtMs: null,
      },
    ];
    const got = JSON.parse(binding.scoreCandidates(JSON.stringify(candidates), '{}')) as Array<
      Record<string, unknown>
    >;
    if (got.length !== 2 || got[0]['id'] !== 'u1' || got[1]['id'] !== 'u2') return false;
    if (Math.abs((got[0]['score'] as number) - 0.7) > 1e-9) return false;
    const r1 = got[0]['reason'] as Record<string, unknown>;
    if (r1['type'] !== 'NEARBY') return false;
    const r2 = got[1]['reason'] as Record<string, unknown>;
    if (r2['type'] !== 'MUTUAL_FRIENDS') return false;
    return true;
  } catch {
    return false;
  }
}

export function tryLoadFeedScore(): FeedScoreBinding | null {
  const raw = (process.env['MSG_FEED'] ?? 'auto').toLowerCase();
  const selection = raw === 'ts' || raw === 'native' || raw === 'auto' ? raw : 'auto';
  if (selection === 'ts') return null;
  const failures: string[] = [];
  const attempts: string[] = [];
  for (const triple of candidateTriples()) {
    attempts.push(
      `@social-network/feed-score-${triple}`,
      path.join(__dirname, '..', 'prebuilds', `feed-score.${triple}.node`),
    );
  }
  for (const candidate of attempts) {
    try {
      const loaded: unknown = require(candidate);
      const binding = (loaded as { default?: unknown }).default ?? loaded;
      if (!isFeedBinding(binding)) {
        failures.push(`${candidate}: incompatible ABI`);
        continue;
      }
      if (!crossCheckFeed(binding)) {
        failures.push(`${candidate}: cross-check failed`);
        continue;
      }
      return binding;
    } catch (err) {
      failures.push(`${candidate}: ${(err as Error).message}`);
    }
  }
  if (selection === 'native') {
    throw new Error(`MSG_FEED=native but no usable binary: ${failures.join(' | ')}`);
  }
  return null;
}
