/**
 * Node-side codec types. Wire/packet types are re-exported from the portable
 * core; backend selection, node info, and metrics snapshots live here.
 */

export type {
  CallIdInput,
  DecodedPacket,
  EncodeInput,
  PacketHeader,
} from '@social-network/msg-codec';

export type CodecBackendName = 'ts' | 'native';

export interface CodecInfo {
  readonly name: '@social-network/native';
  readonly protocolVersion: number;
  readonly backend: CodecBackendName;
  readonly nativeLoaded: boolean;
  readonly nativeSelfTest: boolean;
}

export interface CodecMetricsSnapshot {
  readonly encodeCalls: number;
  readonly decodeCalls: number;
  readonly headerOnlyCalls: number;
  readonly encodeBytes: number;
  readonly decodeBytes: number;
  readonly errors: Partial<Record<string, number>>;
}
