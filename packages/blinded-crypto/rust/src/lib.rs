//! Native accelerator for blinded-crypto v1.
//!
//! Byte-identical to `packages/blinded-crypto/src/*.ts` (modpow math has no
//! language-specific behavior — same inputs, same outputs, guaranteed).
//! The shared contract is `packages/blinded-crypto/vectors/v1.json`,
//! enforced here by `golden_vectors`.
//!
//! Performance: `num_bigint::BigUint::modpow` uses Montgomery reduction —
//! the 50-100x step over variable-time BigInt loops the TS core documents.
//! Side-channel note: Montgomery modpow here is still not constant-time;
//! for HSM-grade blinding keep keys server-side and rate-limit joins.

use napi_derive::napi;
use num_bigint::BigUint;

pub const CRATE_VERSION: u32 = 1;

fn err(code: &str, detail: &str) -> napi::Error {
    napi::Error::new(napi::Status::InvalidArg, format!("blinded-crypto: {code}: {detail}"))
}

fn parse_hex(hex: &str, field: &str) -> Result<BigUint, napi::Error> {
    if hex.is_empty() {
        return Err(err("EMPTY_INPUT", field));
    }
    let clean = hex.strip_prefix("0x").or_else(|| hex.strip_prefix("0X")).unwrap_or(hex);
    if clean.is_empty() || !clean.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err(err("INVALID_MESSAGE", &format!("{field} is not hex")));
    }
    BigUint::parse_bytes(clean.as_bytes(), 16)
        .ok_or_else(|| err("INVALID_MESSAGE", &format!("{field} is not hex")))
}

fn to_canonical_hex(value: &BigUint) -> String {
    let raw = value.to_str_radix(16);
    if raw.len() % 2 == 1 {
        format!("0{raw}")
    } else {
        raw
    }
}

fn parse_modulus(n_hex: &str) -> Result<BigUint, napi::Error> {
    let n = parse_hex(n_hex, "n")?;
    if n <= BigUint::from(1u32) {
        return Err(err("INVALID_MODULUS", "modulus must be > 1"));
    }
    Ok(n)
}

/// s' = (m')^d mod n. Returns canonical hex.
pub fn sign_blinded_core(n_hex: &str, d_hex: &str, blinded_hex: &str) -> Result<String, String> {
    let n = parse_modulus(n_hex).map_err(|e| e.reason.clone())?;
    let d = parse_hex(d_hex, "d").map_err(|e| e.reason.clone())?;
    if d == BigUint::from(0u32) {
        return Err("blinded-crypto: INVALID_EXPONENT: d must be > 0".to_string());
    }
    let m = parse_hex(blinded_hex, "blinded").map_err(|e| e.reason.clone())?;
    if m >= n {
        return Err("blinded-crypto: INVALID_MESSAGE: blinded out of range [0, n)".to_string());
    }
    Ok(to_canonical_hex(&m.modpow(&d, &n)))
}

/// Accepts iff s^e mod n === m. Never throws on bad input — returns false.
pub fn verify_ticket_core(n_hex: &str, e_hex: &str, ticket_hex: &str, sig_hex: &str) -> bool {
    let (Ok(n), Ok(e), Ok(m), Ok(s)) = (
        parse_modulus(n_hex),
        parse_hex(e_hex, "e"),
        parse_hex(ticket_hex, "ticket"),
        parse_hex(sig_hex, "signature"),
    ) else {
        return false;
    };
    if e == BigUint::from(0u32) || m >= n || s >= n {
        return false;
    }
    s.modpow(&e, &n) == m
}



#[napi]
pub fn crate_version() -> u32 {
    CRATE_VERSION
}

#[napi]
pub fn self_test() -> bool {
    // Textbook RSA: p=61,q=53,n=3233,e=17,d=2753. 65^d mod n = 0x024c
    // (0x0ae6 is 65^e — the encryption direction; do not confuse).
    match sign_blinded_core("0ca1", "0ac1", "41") {
        Ok(sig) => sig == "024c" && verify_ticket_core("0ca1", "11", "41", &sig),
        Err(_) => false,
    }
}

#[napi]
pub fn sign_blinded(n_hex: String, d_hex: String, blinded_hex: String) -> napi::Result<String> {
    sign_blinded_core(&n_hex, &d_hex, &blinded_hex)
        .map_err(|reason| napi::Error::new(napi::Status::InvalidArg, reason))
}

#[napi]
pub fn verify_ticket(n_hex: String, e_hex: String, ticket_hex: String, signature_hex: String) -> bool {
    verify_ticket_core(&n_hex, &e_hex, &ticket_hex, &signature_hex)
}

// Unit tests (cargo test — CI native.yml)

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn textbook_roundtrip() {
        // 65^d mod n = 0x024c (0x0ae6 is 65^e — encryption direction).
        let sig = sign_blinded_core("0ca1", "0ac1", "41").unwrap();
        assert_eq!(sig, "024c");
        assert!(verify_ticket_core("0ca1", "11", "41", &sig));
        assert!(!verify_ticket_core("0ca1", "11", "41", "024d"));
    }

    #[test]
    fn rejects_garbage() {
        assert!(sign_blinded_core("01", "01", "00").is_err()); // n <= 1
        assert!(sign_blinded_core("0ca1", "0ac1", "0ca1").is_err()); // m >= n
        assert!(sign_blinded_core("0ca1", "0ac1", "zz").is_err());
        assert!(!verify_ticket_core("0ca1", "11", "41", "zz"));
    }

    #[test]
    fn golden_vectors() {
        let data = include_str!("../../vectors/v1.json");
        let doc: serde_json::Value = serde_json::from_str(data).expect("vectors parse");
        assert_eq!(doc["version"].as_u64(), Some(1));
        for v in doc["vectors"].as_array().expect("vectors") {
            let name = v["name"].as_str().unwrap_or("?");
            let n = v["n"].as_str().unwrap();
            let e = v["e"].as_str().unwrap_or("");
            let message = v["message"].as_str().unwrap();
            if let Some(code) = v.get("expectError").and_then(|x| x.as_str()) {
                let d = v["d"].as_str().unwrap_or("01");
                let res = sign_blinded_core(n, d, message);
                assert!(res.is_err(), "{name} must fail");
                assert!(res.unwrap_err().contains(code), "{name} wrong code");
                continue;
            }
            if v.get("verifyOnly").and_then(|x| x.as_bool()).unwrap_or(false) {
                let sig = v["expectedSig"].as_str().unwrap();
                assert_eq!(verify_ticket_core(n, e, message, sig), v["valid"].as_bool().unwrap(), "{name}");
                continue;
            }
            let d = v["d"].as_str().unwrap();
            let sig = sign_blinded_core(n, d, message).unwrap_or_else(|_| panic!("{name} sign"));
            assert_eq!(sig, v["expectedSig"].as_str().unwrap(), "{name} byte-exact");
            assert_eq!(verify_ticket_core(n, e, message, &sig), v["valid"].as_bool().unwrap(), "{name} verify");
        }
    }
}
