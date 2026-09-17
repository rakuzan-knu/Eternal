/**
 * msg-codec v1 wire protocol.
 *
 * Byte layout (big-endian / network order), total header = 36 bytes:
 *
 *   [0..1]   magic      0x45 0x54 ('E','T')
 *   [2..3]   type       uint16 BE  (application message type)
 *   [4..7]   seq        uint32 BE  (per-call sequence number)
 *   [8..15]  timestamp  uint64 BE  (unix millis, must be < 2^53)
 *   [16..31] callId     16 raw bytes (UUID, hyphenless on the wire)
 *   [32..35] payloadLen uint32 BE  (bytes following the header)
 *   [36..]   payload    raw bytes
 *
 * The layout is FROZEN. Any change requires a new versioned header
 * (bump MSG_CODEC_VERSION + new magic) — never an in-place edit.
 * Byte-identical to the legacy OffHeapBufferPoolService encoding.
 */

export const MSG_CODEC_VERSION = 1 as const;

export const HEADER_SIZE_BYTES = 36 as const;

export const PACKET_MAGIC_0 = 0x45 as const; // 'E'
export const PACKET_MAGIC_1 = 0x54 as const; // 'T'

export const OFFSET_MAGIC = 0 as const;
export const OFFSET_TYPE = 2 as const;
export const OFFSET_SEQ = 4 as const;
export const OFFSET_TIMESTAMP = 8 as const;
export const OFFSET_CALL_ID = 16 as const;
export const OFFSET_PAYLOAD_LEN = 32 as const;

export const CALL_ID_BYTES = 16 as const;
export const CANONICAL_UUID_CHARS = 36 as const; // 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'

/** Upper bound for a single payload. Guards the decoder against OOM on corrupt length fields. */
export const MAX_PAYLOAD_BYTES: number = 4 * 1024 * 1024;

export const MAX_PACKET_TYPE = 0xffff as const;
export const MAX_SEQ = 0xffffffff as const;

/** Largest timestamp exactly representable as a JS number (< 2^53). */
export const MAX_TIMESTAMP_MS: number = Number.MAX_SAFE_INTEGER;
