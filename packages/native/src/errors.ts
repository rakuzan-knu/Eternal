/** Stable, machine-readable codec failure reasons. Never rename — they are logged and metered. */
export type MsgCodecErrorCode =
  | 'INVALID_MAGIC'
  | 'TRUNCATED'
  | 'PAYLOAD_MISMATCH'
  | 'PAYLOAD_TOO_LARGE'
  | 'INVALID_UUID'
  | 'INVALID_TYPE'
  | 'INVALID_SEQ'
  | 'INVALID_TIMESTAMP'
  | 'BUFFER_TOO_SMALL'
  | 'NATIVE_SELFTEST_FAILED';

export class MsgCodecError extends Error {
  public readonly code: MsgCodecErrorCode;

  public constructor(code: MsgCodecErrorCode, detail?: string) {
    super(detail !== undefined ? `msg-codec: ${code}: ${detail}` : `msg-codec: ${code}`);
    this.name = 'MsgCodecError';
    this.code = code;
    // Keep a clean stack across Node versions without capturing this frame.
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, MsgCodecError);
    }
  }

  public static isMsgCodecError(value: unknown): value is MsgCodecError {
    return value instanceof MsgCodecError;
  }
}
