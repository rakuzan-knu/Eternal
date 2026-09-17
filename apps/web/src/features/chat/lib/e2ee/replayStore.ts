/**
 * Inbound freshness for message-layer E2EE: replay rejection + gap detection.
 *
 * Model:
 *  - Every v2/v3 envelope carries (conversationId, senderId, senderDevice,
 *    seq). seq is the sender's per-conversation monotonic counter, persisted
 *    in localStorage, so it survives reloads; the scope includes the sending
 *    DEVICE because two devices of one user run independent counters.
 *  - Replay = exact envelope bytes seen before (ct hash in a bounded
 *    seen-set) → REJECTED, never rendered.
 *  - Gap = seq jump or counter anomaly → ACCEPTED but flagged (warn +
 *    diagnostics). Gaps also happen legitimately (multi-tab send races share
 *    one localStorage counter), so they must never block rendering —
 *    otherwise we'd turn races into message loss.
 *  - v1 envelopes have no seq: they still get exact-duplicate rejection via
 *    the seen-set (free replay protection for legacy traffic).
 *
 * All state lives in guarded localStorage (single keys, hard caps) with
 * in-memory mirrors. Storage failure degrades to fail-open freshness
 * (memory only) — never to a send/receive break.
 */

export type FreshnessVerdict = 'fresh' | 'replay' | 'gap';

export interface FreshnessResult {
  readonly verdict: FreshnessVerdict;
  readonly highest: number;
}

const STORE_KEY = 'e2ee_replay_v1';
const SEQ_KEY = 'e2ee_msg_seq_v1';
const MAX_SEEN = 1000;
const MAX_SCOPES = 500;
const MAX_SEQ_CONVS = 500;
const MAX_SEQ = 2 ** 31 - 1;

interface ReplayDiskState {
  highest: Record<string, number>;
  seen: string[];
}

function readJson(key: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Corrupt state: start over (fail safe — freshness resets, crypto does not).
  }
  return null;
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota/private mode: freshness stays memory-only for this session.
  }
}

let memHighest: Record<string, number> | null = null;
let memSeen: string[] | null = null;
let memSeq: Map<string, number> | null = null;
let replaysDetected = 0;
let gapsDetected = 0;

function loadReplay(): { highest: Record<string, number>; seen: string[] } {
  if (!memHighest || !memSeen) {
    const disk = readJson(STORE_KEY) as Partial<ReplayDiskState> | null;
    memHighest =
      disk?.highest && typeof disk.highest === 'object'
        ? (disk.highest as Record<string, number>)
        : {};
    memSeen = Array.isArray(disk?.seen)
      ? (disk.seen as string[]).filter((s) => typeof s === 'string')
      : [];
  }
  return { highest: memHighest, seen: memSeen };
}

function pruneScopes(highest: Record<string, number>): void {
  const names = Object.keys(highest);
  if (names.length > MAX_SCOPES) {
    for (const name of names.slice(0, names.length - MAX_SCOPES)) delete highest[name];
  }
}

function saveReplay(highest: Record<string, number>, seen: string[]): void {
  writeJson(STORE_KEY, { highest, seen });
}

/**
 * Scope format: `${conversationId}:${senderId}:${senderDevice}` (v2/v3) or
 * `${conversationId}:${senderId}:v1` (legacy, seq-less).
 */
export function isKnownDuplicate(scope: string, ctHash: string): boolean {
  const { seen } = loadReplay();
  return seen.includes(`${scope}:${ctHash}`);
}

export async function checkInboundFreshness(opts: {
  scope: string;
  seq?: number;
  ctHash: string;
}): Promise<FreshnessResult> {
  const { highest, seen } = loadReplay();
  const seenKey = `${opts.scope}:${opts.ctHash}`;
  if (seen.includes(seenKey)) {
    replaysDetected += 1;
    return { verdict: 'replay', highest: highest[opts.scope] ?? -1 };
  }
  seen.push(seenKey);
  if (seen.length > MAX_SEEN) seen.splice(0, seen.length - MAX_SEEN);

  if (opts.seq == null) {
    saveReplay(highest, seen);
    return { verdict: 'fresh', highest: highest[opts.scope] ?? -1 };
  }
  const prev = highest[opts.scope];
  if (prev == null) {
    highest[opts.scope] = opts.seq;
    pruneScopes(highest);
    saveReplay(highest, seen);
    return { verdict: 'fresh', highest: opts.seq };
  }
  if (opts.seq <= prev) {
    // Counter anomaly (e.g. multi-tab race), new bytes: accept, flag.
    gapsDetected += 1;
    saveReplay(highest, seen);
    return { verdict: 'gap', highest: prev };
  }
  highest[opts.scope] = opts.seq;
  const verdict: FreshnessVerdict = opts.seq > prev + 1 ? 'gap' : 'fresh';
  if (verdict === 'gap') gapsDetected += 1;
  pruneScopes(highest);
  saveReplay(highest, seen);
  return { verdict, highest: opts.seq };
}

/** Next outbound seq for a conversation (per-device persisted counter). */
export function nextMessageSeq(conversationId: string): number {
  if (!memSeq) {
    const disk = readJson(SEQ_KEY);
    const counters = disk?.counters;
    memSeq = new Map<string, number>();
    if (counters && typeof counters === 'object' && !Array.isArray(counters)) {
      for (const [k, v] of Object.entries(counters)) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          memSeq.set(k, v);
        }
      }
    }
  }
  const next = (memSeq.get(conversationId) ?? 0) + 1;
  if (next > MAX_SEQ) {
    // Unreachable in practice (2B messages per dialog); fail closed loudly
    // rather than wrap and collide with the replay window.
    throw new Error('E2EE message sequence exhausted for this conversation');
  }
  memSeq.set(conversationId, next);
  if (memSeq.size > MAX_SEQ_CONVS) {
    const keys = Array.from(memSeq.keys());
    for (const name of keys.slice(0, keys.length - MAX_SEQ_CONVS)) {
      memSeq.delete(name);
    }
  }
  writeJson(SEQ_KEY, { counters: Object.fromEntries(memSeq) });
  return next;
}

export function getReplayDiagnostics(): {
  scopes: number;
  seenEntries: number;
  replaysDetected: number;
  gapsDetected: number;
} {
  const { highest, seen } = loadReplay();
  return {
    scopes: Object.keys(highest).length,
    seenEntries: seen.length,
    replaysDetected,
    gapsDetected,
  };
}

/**
 * Rotation/storage-wipe recovery: drop watermarks for one sender device so
 * its (reset) counter is accepted again. Called when the user explicitly
 * accepts that device's new key.
 */
export function clearReplayScopesForDevice(userId: string, deviceId: string): void {
  const { highest, seen } = loadReplay();
  const suffix = `:${userId}:${deviceId}`;
  for (const name of Object.keys(highest)) {
    if (name.endsWith(suffix)) delete highest[name];
  }
  const kept = seen.filter((s) => !s.includes(suffix));
  memSeen = kept;
  saveReplay(highest, kept);
}

/** Test/seam hook (not part of the product surface). */
export function __resetReplayStoreForTests(): void {
  memHighest = null;
  memSeen = null;
  memSeq = null;
  replaysDetected = 0;
  gapsDetected = 0;
  try {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(SEQ_KEY);
  } catch {
    // Best effort.
  }
}
