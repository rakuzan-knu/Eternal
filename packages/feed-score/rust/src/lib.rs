//! Native accelerator for feed-score v1.
//!
//! Math-identical to `packages/feed-score/src/score.ts`. The shared contract
//! is `packages/feed-score/vectors/v1.json`, enforced here by
//! `golden_vectors`.
//!
//! Float note: log10/exp/pow may differ in the last ULP between libm builds.
//! Scores round to 1e-6 on both sides and tests compare with 1e-9 tolerance;
//! reasons and ORDER are exact. Sorting is an explicit score-desc +
//! input-order tiebreak (Rust `sort_by` is stable, but we never rely on it).

use napi_derive::napi;
use serde_json::{json, Value};

pub const CRATE_VERSION: u32 = 1;
const LN2: f64 = 0.6931471805599453;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Mutual {
    pub id: String,
    pub username: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone)]
pub struct Candidate {
    pub id: String,
    pub dist_km: Option<f64>,
    pub allow_nearby: bool,
    pub city: Option<String>,
    pub mutuals: Vec<Mutual>,
    pub mutual_count: usize,
    pub followers_count: f64,
    pub last_active_ms: Option<f64>,
    pub interests: Option<Vec<f64>>,
}

#[derive(Debug, Clone, Copy)]
pub struct Weights {
    pub proximity: f64,
    pub mutual: f64,
    pub popularity: f64,
    pub recency: f64,
    pub affinity: f64,
}

#[derive(Debug, Clone)]
pub struct ScoreOptions {
    pub weights: Weights,
    pub radius_km: f64,
    pub mutual_divisor: f64,
    pub popularity_scale: f64,
    pub recency_half_life_hours: f64,
    pub viewer_interests: Option<Vec<f64>>,
    pub now_ms: f64,
}

impl Default for ScoreOptions {
    fn default() -> Self {
        Self {
            weights: Weights { proximity: 0.4, mutual: 0.4, popularity: 0.2, recency: 0.0, affinity: 0.0 },
            radius_km: 100.0,
            mutual_divisor: 5.0,
            popularity_scale: 4.0,
            recency_half_life_hours: 720.0,
            viewer_interests: None,
            now_ms: 0.0,
        }
    }
}

fn round6(x: f64) -> f64 {
    (x * 1_000_000.0).round() / 1_000_000.0
}

fn part_proximity(dist_km: Option<f64>, allow_nearby: bool, radius_km: f64) -> f64 {
    match dist_km {
        Some(d) if allow_nearby && d >= 0.0 && d <= radius_km && radius_km > 0.0 => (1.0 - d / radius_km).max(0.0),
        _ => 0.0,
    }
}

fn part_mutual(count: usize, divisor: f64) -> f64 {
    if count == 0 || divisor <= 0.0 {
        0.0
    } else {
        ((count as f64) / divisor).min(1.0)
    }
}

fn part_popularity(followers: f64, scale: f64) -> f64 {
    if followers < 0.0 || scale <= 0.0 {
        0.0
    } else {
        ((followers + 1.0).log10() / scale).min(1.0)
    }
}

fn part_recency(last_active_ms: Option<f64>, now_ms: f64, half_life_hours: f64) -> f64 {
    match last_active_ms {
        Some(t) if half_life_hours > 0.0 => {
            let age_hours = ((now_ms - t) / 3_600_000.0).max(0.0);
            (-LN2 * age_hours / half_life_hours).exp()
        }
        _ => 0.0,
    }
}

fn part_affinity(viewer: Option<&[f64]>, candidate: Option<&[f64]>) -> f64 {
    let (Some(v), Some(c)) = (viewer, candidate) else {
        return 0.0;
    };
    if v.is_empty() || v.len() != c.len() {
        return 0.0;
    }
    let mut dot = 0.0;
    let mut na = 0.0;
    let mut nb = 0.0;
    for (a, b) in v.iter().zip(c.iter()) {
        if !a.is_finite() || !b.is_finite() {
            return 0.0;
        }
        dot += a * b;
        na += a * a;
        nb += b * b;
    }
    if na <= 0.0 || nb <= 0.0 {
        return 0.0;
    }
    (dot / (na * nb).sqrt()).clamp(0.0, 1.0)
}

#[derive(Debug, Clone, PartialEq)]
pub struct Reason {
    pub reason_type: String,
    pub text: String,
    pub mutual_friends: Vec<Mutual>,
    pub total_mutual_count: Option<usize>,
}

fn build_reason(c: &Candidate, radius_km: f64) -> Reason {
    if c.mutual_count >= 2 && c.mutuals.len() >= 2 {
        let first = &c.mutuals[0];
        let plural = if c.mutual_count > 2 { "s" } else { "" };
        return Reason {
            reason_type: "MUTUAL_FRIENDS".to_string(),
            text: format!("Followed by {} and {} other{}", first.username, c.mutual_count - 1, plural),
            mutual_friends: vec![c.mutuals[0].clone(), c.mutuals[1].clone()],
            total_mutual_count: Some(c.mutual_count),
        };
    }
    if c.mutual_count == 1 && !c.mutuals.is_empty() {
        let first = &c.mutuals[0];
        return Reason {
            reason_type: "MUTUAL_FRIENDS".to_string(),
            text: format!("Followed by {}", first.username),
            mutual_friends: vec![first.clone()],
            total_mutual_count: Some(1),
        };
    }
    let mut prox_text: Option<String> = None;
    if let Some(d) = c.dist_km {
        if c.allow_nearby && d >= 0.0 && d <= radius_km {
            prox_text = Some(if d <= 10.0 {
                "Near you".to_string()
            } else if let Some(city) = &c.city {
                format!("From your city ({city})")
            } else {
                "Near you".to_string()
            });
        }
    }
    if let Some(t) = prox_text {
        let rt = if t.starts_with("From your city") { "SAME_CITY" } else { "NEARBY" };
        return Reason { reason_type: rt.to_string(), text: t, mutual_friends: vec![], total_mutual_count: None };
    }
    Reason { reason_type: "POPULAR".to_string(), text: "Suggested for you".to_string(), mutual_friends: vec![], total_mutual_count: None }
}

#[derive(Debug, Clone)]
pub struct Scored {
    pub id: String,
    pub score: f64,
    pub parts: [f64; 5],
    pub reason: Reason,
}

pub fn rank_candidates(candidates: &[Candidate], opts: &ScoreOptions) -> Vec<Scored> {
    let mut scored: Vec<(usize, Scored)> = candidates
        .iter()
        .enumerate()
        .map(|(index, c)| {
            let proximity = part_proximity(c.dist_km, c.allow_nearby, opts.radius_km);
            let mutual = part_mutual(c.mutual_count, opts.mutual_divisor);
            let popularity = part_popularity(c.followers_count, opts.popularity_scale);
            let recency = part_recency(c.last_active_ms, opts.now_ms, opts.recency_half_life_hours);
            let affinity = part_affinity(opts.viewer_interests.as_deref(), c.interests.as_deref());
            let w = opts.weights;
            let score = round6(
                proximity * w.proximity + mutual * w.mutual + popularity * w.popularity + recency * w.recency + affinity * w.affinity,
            );
            let reason = build_reason(c, opts.radius_km);
            let s = Scored { id: c.id.clone(), score, parts: [proximity, mutual, popularity, recency, affinity], reason };
            (index, s)
        })
        .collect();
    scored.sort_by(|(ia, a), (ib, b)| {
        b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal).then_with(|| ia.cmp(ib))
    });
    scored.into_iter().map(|(_, s)| s).collect()
}

// JSON boundary (napi takes/returns JSON strings — one FFI call per batch)

fn parse_candidate(v: &Value) -> Candidate {
    let mutuals = v
        .get("mutuals")
        .and_then(|x| x.as_array())
        .map(|arr| {
            arr.iter()
                .map(|m| Mutual {
                    id: m.get("id").and_then(|x| x.as_str()).unwrap_or("").to_string(),
                    username: m.get("username").and_then(|x| x.as_str()).unwrap_or("").to_string(),
                    avatar: m.get("avatar").and_then(|x| x.as_str()).map(|s| s.to_string()),
                })
                .collect()
        })
        .unwrap_or_default();
    Candidate {
        id: v.get("id").and_then(|x| x.as_str()).unwrap_or("").to_string(),
        dist_km: v.get("distKm").and_then(|x| x.as_f64()),
        allow_nearby: v.get("allowNearby").and_then(|x| x.as_bool()).unwrap_or(true),
        city: v.get("city").and_then(|x| x.as_str()).map(|s| s.to_string()),
        mutuals,
        mutual_count: v.get("mutualCount").and_then(|x| x.as_u64()).unwrap_or(0) as usize,
        followers_count: v.get("followersCount").and_then(|x| x.as_f64()).unwrap_or(0.0),
        last_active_ms: v.get("lastActiveAtMs").and_then(|x| x.as_f64()),
        interests: v
            .get("interests")
            .and_then(|x| x.as_array())
            .map(|arr| arr.iter().filter_map(|x| x.as_f64()).collect()),
    }
}

fn parse_options(v: &Value) -> ScoreOptions {
    let w = v.get("weights");
    let num = |o: Option<&Value>, k: &str, d: f64| o.and_then(|x| x.get(k)).and_then(|x| x.as_f64()).unwrap_or(d);
    ScoreOptions {
        weights: Weights {
            proximity: num(w, "proximity", 0.4),
            mutual: num(w, "mutual", 0.4),
            popularity: num(w, "popularity", 0.2),
            recency: num(w, "recency", 0.0),
            affinity: num(w, "affinity", 0.0),
        },
        radius_km: num(Some(v), "radiusKm", 100.0),
        mutual_divisor: num(Some(v), "mutualDivisor", 5.0),
        popularity_scale: num(Some(v), "popularityScale", 4.0),
        recency_half_life_hours: num(Some(v), "recencyHalfLifeHours", 720.0),
        viewer_interests: v
            .get("viewerInterests")
            .and_then(|x| x.as_array())
            .map(|arr| arr.iter().filter_map(|x| x.as_f64()).collect()),
        now_ms: v.get("nowMs").and_then(|x| x.as_f64()).unwrap_or(0.0),
    }
}

fn scored_json(s: &Scored) -> Value {
    // Mirror TS key presence exactly: mutualFriends/totalMutualCount exist
    // ONLY on MUTUAL_FRIENDS reasons (TS drops undefined keys in JSON).
    let mut reason = serde_json::Map::with_capacity(4);
    reason.insert("type".to_string(), json!(s.reason.reason_type));
    reason.insert("text".to_string(), json!(s.reason.text));
    if !s.reason.mutual_friends.is_empty() {
        reason.insert(
            "mutualFriends".to_string(),
            json!(s.reason.mutual_friends.iter().map(|m| json!({"id": m.id.as_str(), "username": m.username.as_str(), "avatar": m.avatar.as_deref()})).collect::<Vec<_>>()),
        );
    }
    if let Some(n) = s.reason.total_mutual_count {
        reason.insert("totalMutualCount".to_string(), json!(n));
    }
    json!({
        "id": s.id,
        "score": s.score,
        "parts": {
            "proximity": s.parts[0], "mutual": s.parts[1], "popularity": s.parts[2],
            "recency": s.parts[3], "affinity": s.parts[4],
        },
        "reason": Value::Object(reason),
    })
}

// napi surface (names are the JS contract — do not rename)

#[napi]
pub fn crate_version() -> u32 {
    CRATE_VERSION
}

#[napi]
pub fn self_test() -> bool {
    let cands = vec![Candidate {
        id: "u".to_string(),
        dist_km: Some(10.0),
        allow_nearby: true,
        city: None,
        mutuals: vec![
            Mutual { id: "m1".to_string(), username: "anna".to_string(), avatar: None },
            Mutual { id: "m2".to_string(), username: "bob".to_string(), avatar: None },
        ],
        mutual_count: 3,
        followers_count: 99.0,
        last_active_ms: None,
        interests: None,
    }];
    let out = rank_candidates(&cands, &ScoreOptions::default());
    out.len() == 1 && (out[0].score - 0.7).abs() < 1e-9 && out[0].reason.reason_type == "MUTUAL_FRIENDS"
}

/// Scores a batch. candidates_json: array of CandidateFeatures;
/// options_json: ScoringOptions. Returns ranked JSON array.
#[napi]
pub fn score_candidates(candidates_json: String, options_json: String) -> napi::Result<String> {
    let doc: Value = serde_json::from_str(&candidates_json)
        .map_err(|e| napi::Error::new(napi::Status::InvalidArg, format!("bad candidates_json: {e}")))?;
    let opts_v: Value = serde_json::from_str(&options_json)
        .map_err(|e| napi::Error::new(napi::Status::InvalidArg, format!("bad options_json: {e}")))?;
    let arr = doc.as_array().ok_or_else(|| napi::Error::new(napi::Status::InvalidArg, "candidates must be an array"))?;
    let cands: Vec<Candidate> = arr.iter().map(parse_candidate).collect();
    let mut opts = parse_options(&opts_v);
    if opts.now_ms <= 0.0 {
        // Mirror TS default (Date.now()) — wall clock at call time.
        opts.now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as f64)
            .unwrap_or(0.0);
    }
    let ranked = rank_candidates(&cands, &opts);
    let out: Vec<Value> = ranked.iter().map(scored_json).collect();
    serde_json::to_string(&out).map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("json: {e}")))
}

// ---------------------------------------------------------------------------
// Interest-vector producer (mirrors producer.ts; hashtag scan duplicated
// from text-pipeline by design — crates stay standalone cdylibs)
// ---------------------------------------------------------------------------

pub fn normalize_tag(tag: &str) -> String {
    let lower = tag.to_lowercase();
    lower.strip_prefix('#').unwrap_or(&lower).to_string()
}

fn is_tag_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_' || ('\u{0400}'..='\u{04FF}').contains(&c)
}

fn scan_hashtags(content: &str) -> Vec<String> {
    let chars: Vec<char> = content.chars().collect();
    let mut out = Vec::new();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '#' {
            let mut j = i + 1;
            let mut count = 0;
            while j < chars.len() && is_tag_char(chars[j]) {
                if count >= 100 {
                    break;
                }
                count += 1;
                j += 1;
            }
            if j > i + 1 {
                out.push(chars[i..j].iter().collect());
                i = j;
                continue;
            }
        }
        i += 1;
    }
    out
}

pub fn top_vocabulary(counts: &[(String, f64)], dim: usize) -> Vec<String> {
    if dim == 0 {
        return Vec::new();
    }
    let mut totals: Vec<(String, f64)> = Vec::new();
    for (tag, count) in counts {
        if !count.is_finite() || *count <= 0.0 {
            continue;
        }
        let key = normalize_tag(tag);
        if key.is_empty() {
            continue;
        }
        match totals.iter_mut().find(|(t, _)| *t == key) {
            Some(entry) => entry.1 += count,
            None => totals.push((key, *count)),
        }
    }
    totals.sort_by(|a, b| {
        b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal).then_with(|| a.0.cmp(&b.0))
    });
    totals.into_iter().take(dim).map(|(t, _)| t).collect()
}

pub fn build_interest_vector(contents: &[String], vocabulary: &[String]) -> Vec<f64> {
    let mut vec = vec![0.0f64; vocabulary.len()];
    if vocabulary.is_empty() {
        return vec;
    }
    for content in contents {
        for raw in scan_hashtags(content) {
            let key = normalize_tag(&raw);
            if let Some(pos) = vocabulary.iter().position(|t| *t == key) {
                vec[pos] += 1.0;
            }
        }
    }
    let norm: f64 = vec.iter().map(|v| v * v).sum::<f64>().sqrt();
    if norm > 0.0 {
        for v in vec.iter_mut() {
            *v /= norm;
        }
    }
    vec
}

/// contents_json: string array; vocabulary_json: string array. Returns JSON array.
#[napi]
pub fn build_interest_vector_napi(contents_json: String, vocabulary_json: String) -> napi::Result<String> {
    let contents_v: Value = serde_json::from_str(&contents_json)
        .map_err(|e| napi::Error::new(napi::Status::InvalidArg, format!("bad contents_json: {e}")))?;
    let vocab_v: Value = serde_json::from_str(&vocabulary_json)
        .map_err(|e| napi::Error::new(napi::Status::InvalidArg, format!("bad vocabulary_json: {e}")))?;
    let contents: Vec<String> = contents_v
        .as_array()
        .ok_or_else(|| napi::Error::new(napi::Status::InvalidArg, "contents must be an array"))?
        .iter()
        .filter_map(|x| x.as_str())
        .map(|s| s.to_string())
        .collect();
    let vocab: Vec<String> = vocab_v
        .as_array()
        .ok_or_else(|| napi::Error::new(napi::Status::InvalidArg, "vocabulary must be an array"))?
        .iter()
        .filter_map(|x| x.as_str())
        .map(|s| s.to_string())
        .collect();
    let out = build_interest_vector(&contents, &vocab);
    serde_json::to_string(&out).map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("json: {e}")))
}

// Unit tests (cargo test — CI native.yml)

#[cfg(test)]
mod tests {
    use super::*;

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-9
    }

    #[test]
    fn legacy_composite_textbook() {
        // prox 0.9, mut 0.6, pop 0.5 -> 0.70
        assert!(close(part_proximity(Some(10.0), true, 100.0), 0.9));
        assert!(close(part_mutual(3, 5.0), 0.6));
        assert!(close(part_popularity(99.0, 4.0), 0.5));
        let c = Candidate {
            id: "u".to_string(),
            dist_km: Some(10.0),
            allow_nearby: true,
            city: None,
            mutuals: vec![],
            mutual_count: 3,
            followers_count: 99.0,
            last_active_ms: None,
            interests: None,
        };
        let out = rank_candidates(&[c], &ScoreOptions::default());
        assert!(close(out[0].score, 0.7));
    }

    #[test]
    fn self_test_passes() {
        assert!(self_test());
    }

    #[test]
    fn golden_vectors() {
        let data = include_str!("../../vectors/v1.json");
        let doc: Value = serde_json::from_str(data).expect("vectors parse");
        assert_eq!(doc["version"].as_u64(), Some(1));
        for v in doc["vectors"].as_array().expect("vectors") {
            let name = v["name"].as_str().unwrap_or("?");
            let cands: Vec<Candidate> = v["candidates"].as_array().expect("candidates").iter().map(parse_candidate).collect();
            let opts = parse_options(&v["options"]);
            let opts = ScoreOptions {
                now_ms: v["options"].get("nowMs").and_then(|x| x.as_f64()).unwrap_or(opts.now_ms),
                ..opts
            };
            let got = rank_candidates(&cands, &opts);
            let exp = v["expected"].as_array().expect("expected");
            assert_eq!(got.len(), exp.len(), "{name} length");
            for (i, s) in got.iter().enumerate() {
                let e = &exp[i];
                assert_eq!(&s.id, e["id"].as_str().unwrap(), "{name}[{i}].id");
                assert!(close(s.score, e["score"].as_f64().unwrap()), "{name}[{i}].score");
                let keys = ["proximity", "mutual", "popularity", "recency", "affinity"];
                for (k, key) in keys.iter().enumerate() {
                    assert!(close(s.parts[k], e["parts"][*key].as_f64().unwrap()), "{name}[{i}].parts.{key}");
                }
                assert_eq!(&s.reason.reason_type, e["reason"]["type"].as_str().unwrap(), "{name}[{i}].reason");
                assert_eq!(&s.reason.text, e["reason"]["text"].as_str().unwrap(), "{name}[{i}].text");
            }
        }
    }

    #[test]
    fn golden_producer() {
        let data = include_str!("../../vectors/producer.v1.json");
        let doc: Value = serde_json::from_str(data).expect("producer vectors parse");
        assert_eq!(doc["version"].as_u64(), Some(1));
        for v in doc["vocabulary"].as_array().expect("vocabulary") {
            let counts: Vec<(String, f64)> = v["counts"]
                .as_object()
                .expect("counts")
                .iter()
                .map(|(k, x)| (k.clone(), x.as_f64().unwrap_or(0.0)))
                .collect();
            let got = top_vocabulary(&counts, v["dim"].as_u64().unwrap_or(0) as usize);
            let exp: Vec<&str> = v["expected"].as_array().unwrap().iter().filter_map(|x| x.as_str()).collect();
            assert_eq!(got, exp, "vocab {}", v["name"].as_str().unwrap_or("?"));
        }
        for v in doc["vectors"].as_array().expect("vectors") {
            let contents: Vec<String> = v["contents"].as_array().unwrap().iter().filter_map(|x| x.as_str()).map(|s| s.to_string()).collect();
            let vocab: Vec<String> = v["vocabulary"].as_array().unwrap().iter().filter_map(|x| x.as_str()).map(|s| s.to_string()).collect();
            let got = build_interest_vector(&contents, &vocab);
            let exp = v["expected"].as_array().unwrap();
            assert_eq!(got.len(), exp.len(), "len {}", v["name"].as_str().unwrap_or("?"));
            for (i, g) in got.iter().enumerate() {
                assert!((g - exp[i].as_f64().unwrap()).abs() < 1e-6, "vec[{}]", i);
            }
        }
    }
}
