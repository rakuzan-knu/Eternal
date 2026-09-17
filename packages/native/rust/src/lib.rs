//! Native accelerator for msg-codec v1.
//!
//! Byte-identical to `packages/native/src/codec.ts`. The wire layout is frozen:
//! ```text
//! [0..1]   magic      0x45 0x54
//! [2..3]   type       u16 BE
//! [4..7]   seq        u32 BE
//! [8..15]  timestamp  u64 BE millis (< 2^53 so f64 is exact)
//! [16..31] callId     16 raw bytes
//! [32..35] payloadLen u32 BE
//! [36..]   payload
//! ```
//! All validation failures are returned as JS `Error`s whose message starts
//! with `msg-codec: <CODE>` so the TS facade can meter them by code.

use napi::bindgen_prelude::Buffer;
use napi_derive::napi;

pub const CODEC_VERSION: u32 = 1;
pub const HEADER_SIZE: usize = 36;
pub const MAGIC_0: u8 = 0x45;
pub const MAGIC_1: u8 = 0x54;
pub const MAX_PAYLOAD: usize = 4 * 1024 * 1024;
pub const MAX_SAFE_INTEGER: f64 = 9007199254740991.0;

// Tables

/// Char -> nibble, -1 sentinel. Built at compile time.
const fn nibble_table() -> [i8; 256] {
    let mut t = [-1i8; 256];
    let mut i = 0u8;
    while i < 10 {
        t[(b'0' + i) as usize] = i as i8;
        i += 1;
    }
    let mut j = 0u8;
    while j < 6 {
        t[(b'a' + j) as usize] = (10 + j) as i8;
        t[(b'A' + j) as usize] = (10 + j) as i8;
        j += 1;
    }
    t
}

static NIBBLE: [i8; 256] = nibble_table();

const HEX: &[u8; 16] = b"0123456789abcdef";

// Core (pure, unit-testable without napi)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CodecError {
    InvalidMagic,
    Truncated,
    PayloadMismatch,
    PayloadTooLarge,
    InvalidUuid,
    InvalidType,
    InvalidSeq,
    InvalidTimestamp,
    BufferTooSmall,
}

impl CodecError {
    pub const fn code(self) -> &'static str {
        match self {
            CodecError::InvalidMagic => "INVALID_MAGIC",
            CodecError::Truncated => "TRUNCATED",
            CodecError::PayloadMismatch => "PAYLOAD_MISMATCH",
            CodecError::PayloadTooLarge => "PAYLOAD_TOO_LARGE",
            CodecError::InvalidUuid => "INVALID_UUID",
            CodecError::InvalidType => "INVALID_TYPE",
            CodecError::InvalidSeq => "INVALID_SEQ",
            CodecError::InvalidTimestamp => "INVALID_TIMESTAMP",
            CodecError::BufferTooSmall => "BUFFER_TOO_SMALL",
        }
    }
}

impl std::fmt::Display for CodecError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "msg-codec: {}", self.code())
    }
}

fn check_type(t: u32) -> Result<u16, CodecError> {
    if t > 0xffff {
        return Err(CodecError::InvalidType);
    }
    Ok(t as u16)
}

fn check_timestamp(ts: f64) -> Result<u64, CodecError> {
    if !ts.is_finite() || ts < 0.0 || ts > MAX_SAFE_INTEGER || ts.fract() != 0.0 {
        return Err(CodecError::InvalidTimestamp);
    }
    Ok(ts as u64)
}

/// Canonical 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' -> 16 bytes. Single pass.
pub fn parse_uuid(s: &str, out: &mut [u8; 16]) -> Result<(), CodecError> {
    let b = s.as_bytes();
    if b.len() != 36 {
        return Err(CodecError::InvalidUuid);
    }
    if b[8] != b'-' || b[13] != b'-' || b[18] != b'-' || b[23] != b'-' {
        return Err(CodecError::InvalidUuid);
    }
    let mut bi = 0usize;
    let mut hi: i8 = -1;
    for (i, &c) in b.iter().enumerate() {
        if i == 8 || i == 13 || i == 18 || i == 23 {
            continue;
        }
        let n = NIBBLE[c as usize];
        if n < 0 {
            return Err(CodecError::InvalidUuid);
        }
        if hi < 0 {
            hi = n;
        } else {
            out[bi] = ((hi as u8) << 4) | (n as u8);
            bi += 1;
            hi = -1;
        }
    }
    Ok(())
}

pub fn format_uuid(raw: &[u8; 16]) -> String {
    let mut s = String::with_capacity(36);
    for (i, &byte) in raw.iter().enumerate() {
        if i == 4 || i == 6 || i == 8 || i == 10 {
            s.push('-');
        }
        s.push(HEX[(byte >> 4) as usize] as char);
        s.push(HEX[(byte & 0x0f) as usize] as char);
    }
    s
}

fn write_header(
    dst: &mut [u8],
    packet_type: u16,
    seq: u32,
    timestamp_ms: u64,
    call_id: &[u8; 16],
    payload_len: u32,
) {
    dst[0] = MAGIC_0;
    dst[1] = MAGIC_1;
    dst[2..4].copy_from_slice(&packet_type.to_be_bytes());
    dst[4..8].copy_from_slice(&seq.to_be_bytes());
    dst[8..16].copy_from_slice(&timestamp_ms.to_be_bytes());
    dst[16..32].copy_from_slice(call_id);
    dst[32..36].copy_from_slice(&payload_len.to_be_bytes());
}

fn check_payload_range(
    payload_len_bytes: usize,
    offset: usize,
    length: usize,
) -> Result<(), CodecError> {
    if offset > payload_len_bytes || length > MAX_PAYLOAD || offset + length > payload_len_bytes {
        if length > MAX_PAYLOAD {
            return Err(CodecError::PayloadTooLarge);
        }
        return Err(CodecError::PayloadMismatch);
    }
    Ok(())
}

// napi surface (field names are the JS contract — do not rename)

#[napi(object)]
pub struct NativeDecodedHeader {
    pub packet_type: u32,
    pub seq: u32,
    pub timestamp_ms: f64,
    pub call_id: String,
    pub payload_length: u32,
}

#[napi(object)]
pub struct NativeDecodedPacket {
    pub packet_type: u32,
    pub seq: u32,
    pub timestamp_ms: f64,
    pub call_id: String,
    pub payload_length: u32,
    pub payload: Buffer,
}

fn napi_err(e: CodecError) -> napi::Error {
    napi::Error::new(napi::Status::InvalidArg, e.to_string())
}

#[napi]
pub fn codec_version() -> u32 {
    CODEC_VERSION
}

/// In-binary golden roundtrip. The TS loader ALSO cross-checks the binary
/// against its own implementation — defense in depth, never trust one side.
#[napi]
pub fn self_test() -> bool {
    let payload = vec![0xde, 0xad, 0xbe, 0xef];
    let mut call_id = [0u8; 16];
    if parse_uuid("123e4567-e89b-12d3-a456-426614174000", &mut call_id).is_err() {
        return false;
    }
    let mut buf = vec![0u8; HEADER_SIZE + payload.len()];
    write_header(&mut buf, 7, 424242, 1700000000000, &call_id, payload.len() as u32);
    buf[HEADER_SIZE..].copy_from_slice(&payload);
    if buf[0] != MAGIC_0 || buf[1] != MAGIC_1 {
        return false;
    }
    let ts = u64::from_be_bytes(buf[8..16].try_into().unwrap()) as f64;
    if ts != 1700000000000.0 {
        return false;
    }
    format_uuid(&call_id) == "123e4567-e89b-12d3-a456-426614174000"
}

#[napi]
pub fn encode_alloc(
    packet_type: u32,
    seq: u32,
    timestamp_ms: f64,
    call_id: String,
    payload: Buffer,
) -> napi::Result<Buffer> {
    let t = check_type(packet_type).map_err(napi_err)?;
    let ts = check_timestamp(timestamp_ms).map_err(napi_err)?;
    if payload.len() > MAX_PAYLOAD {
        return Err(napi_err(CodecError::PayloadTooLarge));
    }
    let mut raw_id = [0u8; 16];
    parse_uuid(&call_id, &mut raw_id).map_err(napi_err)?;
    let mut out = vec![0u8; HEADER_SIZE + payload.len()];
    write_header(&mut out, t, seq, ts, &raw_id, payload.len() as u32);
    out[HEADER_SIZE..].copy_from_slice(&payload);
    Ok(out.into())
}

#[napi]
pub fn encode_into(
    mut dst: Buffer,
    dst_offset: u32,
    packet_type: u32,
    seq: u32,
    timestamp_ms: f64,
    call_id: String,
    payload: Buffer,
    payload_offset: u32,
    payload_length: u32,
) -> napi::Result<u32> {
    let t = check_type(packet_type).map_err(napi_err)?;
    let ts = check_timestamp(timestamp_ms).map_err(napi_err)?;
    let (po, pl) = (payload_offset as usize, payload_length as usize);
    check_payload_range(payload.len(), po, pl).map_err(napi_err)?;
    let total = HEADER_SIZE + pl;
    let off = dst_offset as usize;
    if off > dst.len() || dst.len() - off < total {
        return Err(napi_err(CodecError::BufferTooSmall));
    }
    let mut raw_id = [0u8; 16];
    parse_uuid(&call_id, &mut raw_id).map_err(napi_err)?;
    write_header(&mut dst[off..off + HEADER_SIZE], t, seq, ts, &raw_id, pl as u32);
    dst[off + HEADER_SIZE..off + total].copy_from_slice(&payload[po..po + pl]);
    Ok((off + total) as u32)
}

fn decode_header_inner(src: &[u8]) -> Result<(u16, u32, u64, [u8; 16], u32), CodecError> {
    if src.len() < HEADER_SIZE {
        return Err(CodecError::Truncated);
    }
    if src[0] != MAGIC_0 || src[1] != MAGIC_1 {
        return Err(CodecError::InvalidMagic);
    }
    let payload_len = u32::from_be_bytes(src[32..36].try_into().unwrap());
    if (payload_len as usize) > MAX_PAYLOAD {
        return Err(CodecError::PayloadTooLarge);
    }
    let mut raw_id = [0u8; 16];
    raw_id.copy_from_slice(&src[16..32]);
    Ok((
        u16::from_be_bytes(src[2..4].try_into().unwrap()),
        u32::from_be_bytes(src[4..8].try_into().unwrap()),
        u64::from_be_bytes(src[8..16].try_into().unwrap()),
        raw_id,
        payload_len,
    ))
}

#[napi]
pub fn decode_header(src: Buffer, offset: u32) -> napi::Result<NativeDecodedHeader> {
    let off = offset as usize;
    if off > src.len() {
        return Err(napi_err(CodecError::Truncated));
    }
    let (t, seq, ts, raw_id, plen) = decode_header_inner(&src[off..]).map_err(napi_err)?;
    Ok(NativeDecodedHeader {
        packet_type: t as u32,
        seq,
        timestamp_ms: ts as f64,
        call_id: format_uuid(&raw_id),
        payload_length: plen,
    })
}

#[napi]
pub fn decode_packet(src: Buffer, offset: u32) -> napi::Result<NativeDecodedPacket> {
    let off = offset as usize;
    if off > src.len() {
        return Err(napi_err(CodecError::Truncated));
    }
    let (t, seq, ts, raw_id, plen) = decode_header_inner(&src[off..]).map_err(napi_err)?;
    let total = HEADER_SIZE + plen as usize;
    if src.len() - off < total {
        return Err(napi_err(CodecError::Truncated));
    }
    Ok(NativeDecodedPacket {
        packet_type: t as u32,
        seq,
        timestamp_ms: ts as f64,
        call_id: format_uuid(&raw_id),
        payload_length: plen,
        payload: src[off + HEADER_SIZE..off + total].to_vec().into(),
    })
}

// Unit tests (cargo test — runs in CI prebuild workflow)

#[cfg(test)]
mod tests {
    use super::*;

    const UUID: &str = "123e4567-e89b-12d3-a456-426614174000";

    #[test]
    fn uuid_roundtrip() {
        let mut raw = [0u8; 16];
        parse_uuid(UUID, &mut raw).unwrap();
        assert_eq!(format_uuid(&raw), UUID);
    }

    #[test]
    fn uuid_rejects_garbage() {
        let mut raw = [0u8; 16];
        assert!(parse_uuid("not-a-uuid", &mut raw).is_err());
        assert!(parse_uuid("123e4567-e89b-12d3-a456-42661417400Z", &mut raw).is_err());
        assert!(parse_uuid("123e4567_e89b-12d3-a456-426614174000", &mut raw).is_err());
    }

    #[test]
    fn header_layout_is_frozen() {
        let mut raw = [0u8; 16];
        parse_uuid(UUID, &mut raw).unwrap();
        let mut buf = [0u8; HEADER_SIZE];
        write_header(&mut buf, 0x0102, 0x03040506, 0x0708090a0b0c0d, &raw, 0x0e0f1011);
        assert_eq!(&buf[0..2], &[0x45, 0x54]);
        assert_eq!(&buf[2..4], &[0x01, 0x02]);
        assert_eq!(&buf[4..8], &[0x03, 0x04, 0x05, 0x06]);
        assert_eq!(&buf[8..16], &[0x00, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d]);
        assert_eq!(&buf[32..36], &[0x0e, 0x0f, 0x10, 0x11]);
    }

    #[test]
    fn rejects_bad_magic_and_truncation() {
        assert_eq!(
            decode_header_inner(&[0u8; 36]).unwrap_err(),
            CodecError::InvalidMagic
        );
        assert_eq!(decode_header_inner(&[0x45u8; 10]).unwrap_err(), CodecError::Truncated);
    }

    #[test]
    fn timestamp_bounds() {
        assert!(check_timestamp(-1.0).is_err());
        assert!(check_timestamp(MAX_SAFE_INTEGER + 1.0).is_err());
        assert!(check_timestamp(f64::NAN).is_err());
        assert_eq!(check_timestamp(1700000000000.0).unwrap(), 1700000000000u64);
    }

    /// Shared cross-language contract: packages/msg-codec/vectors/v1.json.
    /// The SAME file is enforced on node:test, cargo test, and any future
    /// Swift/Kotlin port — implementations may differ, the bytes may not.
    fn hex_decode(hex: &str) -> Vec<u8> {
        assert!(hex.len() % 2 == 0, "odd hex length");
        (0..hex.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).expect("bad hex"))
            .collect()
    }

    #[test]
    fn golden_vectors_v1() {
        // Path is relative to rust/src/ (this file): packages/msg-codec/vectors.
        let data = include_str!("../../../msg-codec/vectors/v1.json");
        let doc: serde_json::Value = serde_json::from_str(data).expect("vectors parse");
        assert_eq!(doc["version"].as_u64(), Some(1));
        let vectors = doc["vectors"].as_array().expect("vectors array");
        assert!(!vectors.is_empty());

        for v in vectors {
            let name = v["name"].as_str().unwrap_or("?");
            let packet_type = v["type"].as_u64().unwrap() as u32;
            let seq = v["seq"].as_u64().unwrap() as u32;
            let ts = v["timestampMs"].as_u64().unwrap();
            let call_id = v["callId"].as_str().unwrap();
            let payload = hex_decode(v["payloadHex"].as_str().unwrap());
            let expected = hex_decode(v["expectedHex"].as_str().unwrap());

            let mut raw = [0u8; 16];
            parse_uuid(call_id, &mut raw).unwrap_or_else(|_| panic!("uuid {}", name));
            let mut out = vec![0u8; HEADER_SIZE + payload.len()];
            write_header(
                &mut out,
                check_type(packet_type).expect("type"),
                seq,
                ts,
                &raw,
                payload.len() as u32,
            );
            out[HEADER_SIZE..].copy_from_slice(&payload);
            assert_eq!(out, expected, "encode {}", name);

            let (dt, dseq, dts, draw, dlen) =
                decode_header_inner(&out).expect("decode header");
            assert_eq!(dt as u32, check_type(packet_type).unwrap() as u32, "type {}", name);
            assert_eq!(dseq, seq, "seq {}", name);
            assert_eq!(dts, ts, "timestamp {}", name);
            assert_eq!(format_uuid(&draw), call_id.to_lowercase(), "callId {}", name);
            assert_eq!(dlen as usize, payload.len(), "len {}", name);
            assert_eq!(&out[HEADER_SIZE..], payload.as_slice(), "payload {}", name);
        }
    }
}
