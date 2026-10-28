import AsyncStorage from '@react-native-async-storage/async-storage';

const PINS_KEY = 'e2ee_message_pins_v1';
const REPLAY_KEY = 'e2ee_replay_v1';
const SEQ_KEY = 'e2ee_msg_seq_v1';
const MAX_SEEN = 1000;
const MAX_SCOPES = 500;
const MAX_SEQ_CONVS = 500;
const MAX_SEQ = 2 ** 31 - 1;

export type FreshnessVerdict = 'fresh' | 'replay' | 'gap';

interface State {
  pins: Record<string, string>;
  highest: Record<string, number>;
  seq: Record<string, number>;
  seen: string[];
}

let state: State | null = null;
let hydrating: Promise<State> | null = null;

const asRecord = <T>(
  raw: string | null,
  pick: (value: Record<string, unknown>) => T,
  fallback: T,
) => {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? pick(parsed as Record<string, unknown>)
      : fallback;
  } catch {
    return fallback;
  }
};

const numbers = (value: unknown): Record<string, number> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value).filter((entry): entry is [string, number] =>
          Number.isFinite(entry[1]),
        ),
      )
    : {};

/** Loads persisted pins and counters once; storage failures degrade to memory only. */
export function loadE2eeState(): Promise<State> {
  if (state) return Promise.resolve(state);
  hydrating ??= AsyncStorage.multiGet([PINS_KEY, REPLAY_KEY, SEQ_KEY])
    .catch(() => [] as [string, string | null][])
    .then((entries) => {
      const get = (key: string) => entries.find(([name]) => name === key)?.[1] ?? null;
      state = {
        pins: asRecord(
          get(PINS_KEY),
          (value) =>
            Object.fromEntries(
              Object.entries(value).filter(
                (entry): entry is [string, string] => typeof entry[1] === 'string',
              ),
            ),
          {},
        ),
        highest: asRecord(get(REPLAY_KEY), (value) => numbers(value.highest), {}),
        seq: asRecord(get(SEQ_KEY), (value) => numbers(value.counters), {}),
        seen: [],
      };
      return state;
    })
    .finally(() => {
      hydrating = null;
    });
  return hydrating;
}

const persist = (key: string, value: unknown) => {
  void AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => undefined);
};

const trim = (record: Record<string, number>, limit: number) => {
  const names = Object.keys(record);
  for (const name of names.slice(0, Math.max(0, names.length - limit))) delete record[name];
};

export async function readPin(scope: string) {
  return (await loadE2eeState()).pins[scope];
}

export async function writePin(scope: string, fingerprint: string) {
  const current = await loadE2eeState();
  current.pins[scope] = fingerprint;
  await AsyncStorage.setItem(PINS_KEY, JSON.stringify(current.pins));
}

export async function isKnownDuplicate(scope: string, ctHash: string) {
  return (await loadE2eeState()).seen.includes(`${scope}:${ctHash}`);
}

/** Replay = exact bytes seen this session (rejected); gap = counter anomaly (accepted, flagged). */
export async function checkInboundFreshness(opts: {
  scope: string;
  seq?: number;
  ctHash: string;
}): Promise<FreshnessVerdict> {
  const current = await loadE2eeState();
  const seenKey = `${opts.scope}:${opts.ctHash}`;
  if (current.seen.includes(seenKey)) return 'replay';
  current.seen.push(seenKey);
  if (current.seen.length > MAX_SEEN) current.seen.splice(0, current.seen.length - MAX_SEEN);
  if (opts.seq == null) return 'fresh';
  const prev = current.highest[opts.scope];
  let verdict: FreshnessVerdict = 'fresh';
  if (prev == null) current.highest[opts.scope] = opts.seq;
  else if (opts.seq <= prev) verdict = 'gap';
  else {
    current.highest[opts.scope] = opts.seq;
    if (opts.seq > prev + 1) verdict = 'gap';
  }
  trim(current.highest, MAX_SCOPES);
  persist(REPLAY_KEY, { highest: current.highest });
  return verdict;
}

/** Next outbound seq for a conversation (per-device persisted counter). */
export async function nextMessageSeq(conversationId: string): Promise<number> {
  const current = await loadE2eeState();
  const next = (current.seq[conversationId] ?? 0) + 1;
  if (next > MAX_SEQ) throw new Error('E2EE message sequence exhausted for this conversation');
  delete current.seq[conversationId];
  current.seq[conversationId] = next;
  trim(current.seq, MAX_SEQ_CONVS);
  await AsyncStorage.setItem(SEQ_KEY, JSON.stringify({ counters: current.seq })).catch(
    () => undefined,
  );
  return next;
}

/** A sender device that reset its counter (accepted new key) starts fresh. */
export async function clearReplayScopesForDevice(userId: string, deviceId: string) {
  const current = await loadE2eeState();
  const suffix = `:${userId}:${deviceId}`;
  for (const name of Object.keys(current.highest))
    if (name.endsWith(suffix)) delete current.highest[name];
  current.seen = current.seen.filter((entry) => !entry.includes(suffix));
  persist(REPLAY_KEY, { highest: current.highest });
}

export function __resetE2eeStateForTests() {
  state = null;
  hydrating = null;
}
