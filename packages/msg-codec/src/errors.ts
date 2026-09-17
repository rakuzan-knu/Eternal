/**
 * Stable, machine-readable codec failure reasons. Never rename — they are
 * logged and metered.
 *
 * Portable: Error.captureStackTrace is V8-only (absent on Hermes/JSC), so it
 * is detected structurally instead of via @types/node.
 */
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

type CaptureStackTraceFn = (target: object, constructorOpt?: unknown) => void;

function getCaptureStackTrace(): CaptureStackTraceFn | undefined {
  const candidate = (Error as unknown as { captureStackTrace?: unknown }).captureStackTrace;
  return typeof candidate === 'function' ? (candidate as CaptureStackTraceFn) : undefined;
}

export class MsgCodecError extends Error {
  public readonly code: MsgCodecErrorCode;

  public constructor(code: MsgCodecErrorCode, detail?: string) {
    super(detail !== undefined ? `msg-codec: ${code}: ${detail}` : `msg-codec: ${code}`);
    this.name = 'MsgCodecError';
    this.code = code;
    getCaptureStackTrace()?.(this, MsgCodecError);
  }

  public static isMsgCodecError(value: unknown): value is MsgCodecError {
    return value instanceof MsgCodecError;
  }
}
