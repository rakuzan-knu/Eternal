/**
 * Public surface of @social-network/msg-codec.
 *
 * Portable entry point: importable from web bundles, React Native / Hermes,
 * Electron renderer/preload, and Node.js. No Node.js APIs, no env access,
 * no native bindings — see @social-network/native for the Node accelerator.
 */

export { MsgCodecError } from './errors';
export type { MsgCodecErrorCode } from './errors';
export type { CallIdInput, DecodedPacket, EncodeInput, PacketHeader } from './types';
export {
  CALL_ID_BYTES,
  CANONICAL_UUID_CHARS,
  HEADER_SIZE_BYTES,
  MAX_PACKET_TYPE,
  MAX_PAYLOAD_BYTES,
  MAX_SEQ,
  MAX_TIMESTAMP_MS,
  MSG_CODEC_VERSION,
  OFFSET_CALL_ID,
  OFFSET_MAGIC,
  OFFSET_PAYLOAD_LEN,
  OFFSET_SEQ,
  OFFSET_TIMESTAMP,
  OFFSET_TYPE,
  PACKET_MAGIC_0,
  PACKET_MAGIC_1,
} from './protocol';
export {
  decodeHeader,
  decodePacket,
  encodeAlloc,
  encodeInto,
  formatUuid,
  packetTotalLength,
  parseUuidInto,
  writeCallIdInto,
} from './codec';
