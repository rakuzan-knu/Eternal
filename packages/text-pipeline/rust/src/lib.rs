//! Native accelerator for text-pipeline v1.
//!
//! Behavior-identical to `packages/text-pipeline/src/*.ts`. The shared
//! contract is `packages/text-pipeline/vectors/v1.json` — enforced here by
//! `golden_vectors` (only cases tagged `"rust"`; rich-HTML rendering stays
//! TS-only in v1).
//!
//! Portability notes (mirrored from TS):
//!  - Span offsets are UTF-16 code units (TS string indexing). Multi-unit
//!    chars are counted via `char::len_utf16()`.
//!  - Spam reasons are pushed in a FIXED order; scores round to 2 decimals.
//!  - Truncation past `max_length` cuts at char boundaries; splitting a
//!    surrogate pair exactly at the cut is a documented cross-language
//!    divergence (vectors never exercise it; DTO limits sit far below).

use napi_derive::napi;
use serde_json::{json, Value};

pub const CODEC_VERSION: u32 = 1;
const DEFAULT_MAX_LENGTH: usize = 10_000;
const DEFAULT_MAX_USERNAME_LEN: usize = 32;
const DEFAULT_MAX_HASHTAG_LEN: usize = 100;

// Char classes (must match TS extract.ts exactly)

fn is_hashtag_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_' || ('\u{0400}'..='\u{04FF}').contains(&c)
}

fn is_username_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '.' || c == '_'
}

fn is_mention_boundary(c: char) -> bool {
    matches!(c, '\u{9}' | '\u{A}' | '\u{D}' | ' ' | '!' | '?' | ',' | ';' | ':' | '(' | '{' | '[' | '<')
}

// Cursor over chars with parallel byte + UTF-16 offsets

struct Cursor<'a> {
    chars: Vec<(usize, char)>,
    input: &'a str,
}

impl<'a> Cursor<'a> {
    fn new(input: &'a str) -> Self {
        Self { chars: input.char_indices().collect(), input }
    }
    fn len(&self) -> usize {
        self.chars.len()
    }
    fn u16_offset_of(&self, idx: usize) -> usize {
        self.chars[..idx.min(self.chars.len())].iter().map(|(_, c)| c.len_utf16()).sum()
    }
    fn slice(&self, from: usize, to: usize) -> &'a str {
        let start = self.chars.get(from).map(|(b, _)| *b).unwrap_or(self.input.len());
        let end = self.chars.get(to).map(|(b, _)| *b).unwrap_or(self.input.len());
        &self.input[start..end]
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Span {
    pub value: String,
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Link {
    pub value: String,
    pub start: usize,
    pub end: usize,
    pub url: String,
}

fn truncate_utf16(input: &str, max: usize) -> (String, bool) {
    let mut used = 0usize;
    let mut end = 0usize;
    for (b, c) in input.char_indices() {
        let w = c.len_utf16();
        if used + w > max {
            break;
        }
        used += w;
        end = b + c.len_utf8();
    }
    if end >= input.len() {
        (input.to_string(), false)
    } else {
        (input[..end].to_string(), true)
    }
}

// Extract

pub fn extract_mention_spans(input: &str, max_name: usize) -> Vec<Span> {
    let cur = Cursor::new(input);
    let mut out = Vec::new();
    let mut i = 0;
    while i < cur.len() {
        let (_, c) = cur.chars[i];
        let boundary = i == 0 || is_mention_boundary(cur.chars[i - 1].1);
        if c == '@' && boundary {
            let mut j = i + 1;
            while j < cur.len() && is_username_char(cur.chars[j].1) {
                if j - (i + 1) >= max_name {
                    break;
                }
                j += 1;
            }
            if j > i + 1 {
                out.push(Span {
                    value: cur.slice(i + 1, j).to_string(),
                    start: cur.u16_offset_of(i + 1),
                    end: cur.u16_offset_of(j),
                });
                i = j;
                continue;
            }
        }
        i += 1;
    }
    out
}

pub fn extract_hashtag_spans(input: &str, max_tag: usize) -> Vec<Span> {
    let cur = Cursor::new(input);
    let mut out = Vec::new();
    let mut i = 0;
    while i < cur.len() {
        if cur.chars[i].1 == '#' {
            let mut j = i + 1;
            while j < cur.len() && is_hashtag_char(cur.chars[j].1) {
                if j - (i + 1) >= max_tag {
                    break;
                }
                j += 1;
            }
            if j > i + 1 {
                out.push(Span {
                    value: cur.slice(i, j).to_string(),
                    start: cur.u16_offset_of(i),
                    end: cur.u16_offset_of(j),
                });
                i = j;
                continue;
            }
        }
        i += 1;
    }
    out
}

// Linkify (mirrors linkify.ts)

const TRAILING_TRIM: [char; 10] = ['.', ',', ';', ':', '!', '?', '"', '\'', ']', '}'];

fn is_ws_or_open(c: char) -> bool {
    matches!(c, ' ' | '\u{9}' | '\u{A}' | '\u{D}' | '(' | '[' | '{' | '<')
}

fn is_url_body_char(c: char) -> bool {
    if c <= ' ' || c == '\u{7f}' {
        return false;
    }
    !matches!(c, '<' | '>' | '"' | '\'')
}

fn scheme_end(input: &str, byte: usize) -> Option<usize> {
    let rest = &input[byte..];
    if rest.len() >= 7 && rest.as_bytes()[4] == b':' && rest.as_bytes()[5] == b'/' && rest.as_bytes()[6] == b'/' {
        if rest[..4].eq_ignore_ascii_case("http") {
            return Some(byte + 7);
        }
    }
    if rest.len() >= 8 && rest.as_bytes()[5] == b':' && rest.as_bytes()[6] == b'/' && rest.as_bytes()[7] == b'/' {
        if rest[..5].eq_ignore_ascii_case("https") {
            return Some(byte + 8);
        }
    }
    None
}

fn www_at(input: &str, byte: usize) -> bool {
    input[byte..].get(..4).map(|s| s.eq_ignore_ascii_case("www.")).unwrap_or(false)
}

fn has_host(candidate: &str) -> bool {
    let mut host_end = candidate.len();
    for (i, c) in candidate.char_indices() {
        if c == '/' || c == '?' || c == '#' {
            host_end = i;
            break;
        }
    }
    if host_end == 0 {
        return false;
    }
    let host = &candidate[..host_end];
    let mut bare = host;
    if let Some(colon) = host.find(':') {
        let port = &host[colon + 1..];
        if host[colon + 1..].contains(':') || port.is_empty() || port.len() > 5 || !port.bytes().all(|b| b.is_ascii_digit()) {
            return false;
        }
        bare = &host[..colon];
    }
    bare.contains('.') || bare.eq_ignore_ascii_case("localhost")
}

pub fn find_links(input: &str) -> Vec<Link> {
    let cur = Cursor::new(input);
    let mut out = Vec::new();
    let mut i = 0;
    while i < cur.len() {
        let (byte, _) = cur.chars[i];
        let boundary = i == 0 || is_ws_or_open(cur.chars[i - 1].1);
        if !boundary {
            i += 1;
            continue;
        }
        let mut body_from: Option<usize> = None;
        let mut is_www = false;
        if let Some(end) = scheme_end(input, byte) {
            // char index of body start
            body_from = Some(cur.chars.iter().position(|(b, _)| *b >= end).unwrap_or(cur.len()));
        } else if www_at(input, byte) {
            body_from = Some(i);
            is_www = true;
        }
        let Some(bf) = body_from else {
            i += 1;
            continue;
        };
        let mut j = bf;
        while j < cur.len() && is_url_body_char(cur.chars[j].1) {
            j += 1;
        }
        // Trim trailing punctuation.
        while j > bf && TRAILING_TRIM.contains(&cur.chars[j - 1].1) {
            j -= 1;
        }
        // Unbalanced trailing ')'.
        let (mut opens, mut closes) = (0usize, 0usize);
        for k in bf..j {
            if cur.chars[k].1 == '(' {
                opens += 1;
            } else if cur.chars[k].1 == ')' {
                closes += 1;
            }
        }
        while j > bf && cur.chars[j - 1].1 == ')' && closes > opens {
            j -= 1;
            closes -= 1;
        }
        if j <= bf {
            i += 1;
            continue;
        }
        let raw = cur.slice(i, j).to_string();
        let host_part = if is_www {
            raw.clone()
        } else {
            raw[raw.find("://").map(|p| p + 3).unwrap_or(raw.len())..].to_string()
        };
        if !has_host(&host_part) {
            i += 1;
            continue;
        }
        let url = if is_www { format!("https://{raw}") } else { raw.clone() };
        out.push(Link {
            value: raw,
            start: cur.u16_offset_of(i),
            end: cur.u16_offset_of(j),
            url,
        });
        i = j;
    }
    out
}

// sanitize_text (mirrors sanitize.ts text mode)

fn ascii_lower(s: &str) -> String {
    s.chars().map(|c| c.to_ascii_lowercase()).collect()
}

fn decode_entities_once(text: &str) -> String {
    if !text.contains('&') {
        return text.to_string();
    }
    let mut out = String::with_capacity(text.len());
    let bytes = text.as_bytes();
    let mut i = 0;
    while i < text.len() {
        if bytes[i] != b'&' {
            // copy one char
            let c = text[i..].chars().next().unwrap();
            out.push(c);
            i += c.len_utf8();
            continue;
        }
        let rest = &text[i + 1..];
        let Some(semi) = rest.find(';') else {
            out.push('&');
            i += 1;
            continue;
        };
        if semi > 9 {
            out.push('&');
            i += 1;
            continue;
        }
        let entity = &rest[..semi];
        let decoded: Option<String> = match entity {
            "amp" | "AMP" => Some("&".to_string()),
            "lt" | "LT" => Some("<".to_string()),
            "gt" | "GT" => Some(">".to_string()),
            "quot" | "QUOT" => Some("\"".to_string()),
            "#x27" | "#X27" | "#39" => Some("'".to_string()),
            "nbsp" => Some("\u{a0}".to_string()),
            _ if entity.starts_with('#') => {
                let (hex, digits) = if entity.len() > 2 && (entity.as_bytes()[1] == b'x' || entity.as_bytes()[1] == b'X') {
                    (true, &entity[2..])
                } else {
                    (false, &entity[1..])
                };
                let ok = !digits.is_empty()
                    && digits.len() <= 7
                    && digits.bytes().all(|b| {
                        if hex { b.is_ascii_hexdigit() } else { b.is_ascii_digit() }
                    });
                if !ok {
                    None
                } else {
                    let code = if hex { u32::from_str_radix(digits, 16).ok() } else { digits.parse::<u32>().ok() };
                    code.filter(|&c| c > 0 && c <= 0x10FFFF).and_then(char::from_u32).map(|c| c.to_string())
                }
            }
            _ => None,
        };
        match decoded {
            Some(d) => {
                out.push_str(&d);
                i += 1 + semi + 1;
            }
            None => {
                out.push_str(&text[i..i + 1 + semi + 1]);
                i += 1 + semi + 1;
            }
        }
    }
    out
}

fn find_tag_close(lower: &str, tag: &str, from: usize) -> Option<usize> {
    let needle = format!("</{tag}");
    let mut pos = lower[from..].find(&needle).map(|p| p + from)?;
    loop {
        let mut k = pos + needle.len();
        let b = lower.as_bytes();
        while k < b.len() && (b[k] == b' ' || b[k] == b'\t') {
            k += 1;
        }
        if b.get(k) == Some(&b'>') {
            return Some(k + 1);
        }
        pos = lower[k..].find(&needle).map(|p| p + k)?;
    }
}

fn escape_html(text: &str) -> String {
    if !text.contains(['&', '<', '>', '"', '\'']) {
        return text.to_string();
    }
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#x27;"),
            _ => out.push(c),
        }
    }
    out
}

pub fn sanitize_text(input: &str) -> String {
    if input.is_empty() {
        return String::new();
    }
    if !input.contains('<') {
        return escape_html(decode_entities_once(input).trim());
    }
    let lower = ascii_lower(input);
    let mut out = String::new();
    let mut i = 0;
    while i < input.len() {
        let rest = &input[i..];
        let Some(rel) = rest.find('<') else {
            out.push_str(rest);
            break;
        };
        let lt = i + rel;
        out.push_str(&input[i..lt]);
        if input[lt..].starts_with("<!--") {
            match input[lt + 4..].find("-->") {
                Some(p) => i = lt + 4 + p + 3,
                None => break,
            }
            continue;
        }
        // Parse tag name (same grammar as TS parseTag, simplified to what
        // text mode needs: name + drop script/style content).
        let mut k = lt + 1;
        let b = input.as_bytes();
        let mut closing = false;
        if b.get(k) == Some(&b'/') {
            closing = true;
            k += 1;
        }
        let name_start = k;
        while k < b.len() && b[k].is_ascii_alphanumeric() {
            k += 1;
        }
        if k == name_start {
            out.push('<');
            i = lt + 1;
            continue;
        }
        let name = ascii_lower(&input[name_start..k]);
        // Find tag end.
        let mut tend = k;
        let mut in_q: Option<u8> = None;
        let mut closed = false;
        while tend < b.len() {
            let c = b[tend];
            if let Some(q) = in_q {
                if c == q {
                    in_q = None;
                }
            } else if c == b'"' || c == b'\'' {
                in_q = Some(c);
            } else if c == b'>' {
                closed = true;
                tend += 1;
                break;
            }
            tend += 1;
        }
        if !closed {
            out.push('<');
            i = lt + 1;
            continue;
        }
        if !closing && (name == "script" || name == "style") {
            match find_tag_close(&lower, &name, tend) {
                Some(e) => i = e,
                None => break,
            }
            continue;
        }
        i = tend;
    }
    escape_html(decode_entities_once(&out).trim())
}

// Spam (mirrors spam.ts exactly: order, weights, phrases, rounding)

const SUSPICIOUS_PHRASES: [&str; 10] = [
    "free money", "click here", "buy now", "double your", "earn fast", "crypto giveaway", "send eth",
    "send btc", "бесплатные деньги", "заработай быстро",
];

fn is_spam_letter(c: char) -> bool {
    c.is_ascii_alphabetic() || ('\u{0400}'..='\u{04FF}').contains(&c)
}

fn is_spam_cap(c: char) -> bool {
    c.is_ascii_uppercase() || ('\u{0400}'..='\u{042F}').contains(&c)
}

pub fn spam_score(text: &str, mentions: usize, hashtags: usize, links: usize, max_m: usize, max_h: usize, max_l: usize) -> (f64, Vec<String>) {
    let mut reasons: Vec<String> = Vec::new();
    let mut score: f64 = 0.0;
    if mentions > max_m {
        reasons.push("TOO_MANY_MENTIONS".to_string());
        score += 0.45;
    }
    if hashtags > 8 || hashtags > max_h {
        reasons.push("TOO_MANY_HASHTAGS".to_string());
        score += 0.30;
    }
    if links > max_l {
        reasons.push("TOO_MANY_LINKS".to_string());
        score += 0.35;
    }
    let mut letters = 0usize;
    let mut caps = 0usize;
    let mut run_char: Option<char> = None;
    let mut run_len = 0usize;
    let mut has_repeat = false;
    for c in text.chars() {
        if is_spam_letter(c) {
            letters += 1;
            if is_spam_cap(c) {
                caps += 1;
            }
        }
        // Runs count code points (1 per char), exactly like the TS core's
        // for..of loop — astral repeats need 5 identical code points.
        if Some(c) == run_char {
            run_len += 1;
            if run_len >= 5 && c != ' ' {
                has_repeat = true;
            }
        } else {
            run_char = Some(c);
            run_len = 1;
        }
    }
    let shouting = letters >= 12 && (caps as f64) / (letters.max(1) as f64) > 0.6;
    if shouting {
        reasons.push("EXCESSIVE_CAPS".to_string());
        score += 0.25;
    }
    if has_repeat {
        reasons.push("REPEATED_CHARS".to_string());
        score += 0.20;
    }
    let lower = text.to_lowercase();
    if SUSPICIOUS_PHRASES.iter().any(|p| lower.contains(p)) {
        reasons.push("SUSPICIOUS_PHRASE".to_string());
        score += 0.40;
    }
    if shouting && links > 0 {
        reasons.push("SHOUTING_WITH_LINKS".to_string());
        score += 0.15;
    }
    if score > 1.0 {
        score = 1.0;
    }
    (((score * 100.0).round()) / 100.0, reasons)
}

// Pipeline (text mode + spans; rich rendering stays TS-only in v1)

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PipelineMode {
    Text,
}

pub struct PipelineOptions {
    pub max_length: usize,
    pub max_mentions: usize,
    pub max_hashtags: usize,
    pub max_links: usize,
    /// Mirror of TS default: options.linkify ?? mode == "rich".
    pub linkify: bool,
}

impl Default for PipelineOptions {
    fn default() -> Self {
        Self { max_length: DEFAULT_MAX_LENGTH, max_mentions: 10, max_hashtags: 8, max_links: 2, linkify: false }
    }
}

/// TS-identical defaulting: explicit linkify wins, else rich mode implies it.
pub fn resolve_linkify(mode: Option<&str>, linkify: Option<bool>) -> bool {
    linkify.unwrap_or_else(|| mode.unwrap_or("text") == "rich")
}

pub struct PipelineResult {
    pub text: String,
    pub mentions: Vec<Span>,
    pub hashtags: Vec<Span>,
    pub links: Vec<Link>,
    pub score: f64,
    pub reasons: Vec<String>,
    pub capped: bool,
    pub truncated: bool,
}

pub fn process_text_core(input: &str, opts: &PipelineOptions) -> PipelineResult {
    let (src, truncated) = truncate_utf16(input, opts.max_length);
    let text = sanitize_text(&src);
    let mentions = extract_mention_spans(&src, DEFAULT_MAX_USERNAME_LEN);
    let hashtags = extract_hashtag_spans(&src, DEFAULT_MAX_HASHTAG_LEN);
    let links = if opts.linkify { find_links(&src) } else { Vec::new() };
    let (score, reasons) = spam_score(&text, mentions.len(), hashtags.len(), links.len(), opts.max_mentions, opts.max_hashtags, opts.max_links);
    let capped = mentions.len() > opts.max_mentions || hashtags.len() > opts.max_hashtags || links.len() > opts.max_links;
    PipelineResult { text, mentions, hashtags, links, score, reasons, capped, truncated }
}

// napi surface

#[napi]
pub fn codec_version() -> u32 {
    CODEC_VERSION
}

#[napi]
pub fn self_test() -> bool {
    let mut opts = PipelineOptions::default();
    opts.linkify = true;
    let r = process_text_core("Hello @alex #hi https://example.com", &opts);
    r.mentions.iter().any(|s| s.value == "alex")
        && r.hashtags.iter().any(|s| s.value == "#hi")
        && r.links.iter().any(|l| l.url == "https://example.com")
        && r.text == "Hello @alex #hi https://example.com"
}

#[napi]
pub fn sanitize_text_napi(input: String) -> String {
    sanitize_text(&truncate_utf16(&input, DEFAULT_MAX_LENGTH).0)
}

#[napi]
pub fn extract_mentions(input: String) -> Vec<String> {
    let (src, _) = truncate_utf16(&input, DEFAULT_MAX_LENGTH);
    extract_mention_spans(&src, DEFAULT_MAX_USERNAME_LEN).into_iter().map(|s| s.value).collect()
}

#[napi]
pub fn extract_hashtags(input: String) -> Vec<String> {
    let (src, _) = truncate_utf16(&input, DEFAULT_MAX_LENGTH);
    extract_hashtag_spans(&src, DEFAULT_MAX_HASHTAG_LEN).into_iter().map(|s| s.value).collect()
}

/// Full pipeline as JSON (same field names as the TS PipelineResult).
/// options_json: {"maxLength":N,"maxMentions":N,"maxHashtags":N,"maxLinks":N}
/// linkify is always on here; rich HTML rendering stays TS-only in v1.
#[napi]
pub fn process_text(input: String, options_json: String) -> napi::Result<String> {
    let opts_v: Value = serde_json::from_str(&options_json)
        .map_err(|e| napi::Error::new(napi::Status::InvalidArg, format!("bad options_json: {e}")))?;
    let opts = PipelineOptions {
        max_length: opts_v.get("maxLength").and_then(|v| v.as_u64()).unwrap_or(DEFAULT_MAX_LENGTH as u64) as usize,
        max_mentions: opts_v.get("maxMentions").and_then(|v| v.as_u64()).unwrap_or(10) as usize,
        max_hashtags: opts_v.get("maxHashtags").and_then(|v| v.as_u64()).unwrap_or(8) as usize,
        max_links: opts_v.get("maxLinks").and_then(|v| v.as_u64()).unwrap_or(2) as usize,
        linkify: resolve_linkify(
            opts_v.get("mode").and_then(|v| v.as_str()),
            opts_v.get("linkify").and_then(|v| v.as_bool()),
        ),
    };
    let r = process_text_core(&input, &opts);
    let spans = |ss: &[Span]| -> Vec<Value> {
        ss.iter().map(|s| json!({"value": s.value.as_str(), "start": s.start, "end": s.end})).collect()
    };
    let out = json!({
        "text": r.text,
        "mentions": r.mentions.iter().map(|s| &s.value).collect::<Vec<_>>(),
        "mentionSpans": spans(&r.mentions),
        "hashtags": r.hashtags.iter().map(|s| &s.value).collect::<Vec<_>>(),
        "hashtagSpans": spans(&r.hashtags),
        "links": r.links.iter().map(|l| json!({"value": l.value.as_str(), "start": l.start, "end": l.end, "url": l.url.as_str()})).collect::<Vec<_>>(),
        "spam": {"score": r.score, "reasons": r.reasons},
        "capped": r.capped,
        "truncated": r.truncated,
    });
    serde_json::to_string(&out).map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("json: {e}")))
}

// ---------------------------------------------------------------------------
// Similarity: bounded Levenshtein + trigram Dice (mirrors similarity.ts)
// ---------------------------------------------------------------------------

/// Bounded Levenshtein. Exact when <= max_dist, else max_dist + 1.
/// Banded DP, O(min(n,m) * max_dist) time. Truncation counts chars (TS counts
/// UTF-16 units — identical for BMP; search terms are ASCII/short by product
/// limits, documented parity scope).
pub fn levenshtein(a: &str, b: &str, max_dist: usize, max_len: usize) -> usize {
    let a: String = a.chars().take(max_len).collect();
    let b: String = b.chars().take(max_len).collect();
    let ac: Vec<char> = a.chars().collect();
    let bc: Vec<char> = b.chars().collect();
    let (n, m) = (ac.len(), bc.len());
    if n.abs_diff(m) > max_dist {
        return max_dist + 1;
    }
    if n == 0 {
        return m.min(max_dist + 1);
    }
    if m == 0 {
        return n.min(max_dist + 1);
    }
    // Shorter string drives the row width.
    let (s1, s2) = if n <= m { (ac, bc) } else { (bc, ac) };
    let (len1, len2) = (s1.len(), s2.len());
    let inf = max_dist + 1;
    let mut prev: Vec<usize> = (0..=len1).collect();
    let mut curr = vec![0usize; len1 + 1];
    for i in 1..=len2 {
        curr[0] = i;
        let mut row_min = curr[0];
        let from = (i.saturating_sub(max_dist)).max(1);
        let to = (i + max_dist).min(len1);
        for j in 1..from {
            curr[j] = inf;
        }
        for j in from..=to {
            let cost = if s1[j - 1] == s2[i - 1] { 0 } else { 1 };
            let v = (curr[j - 1] + 1).min(prev[j] + 1).min(prev[j - 1] + cost);
            curr[j] = v;
            if v < row_min {
                row_min = v;
            }
        }
        for j in (to + 1)..=len1 {
            curr[j] = inf;
        }
        if row_min > max_dist {
            return inf;
        }
        std::mem::swap(&mut prev, &mut curr);
    }
    prev[len1].min(inf)
}

/// Trigram multiset profile with edge padding, as (trigram, count) pairs.
pub fn trigram_profile(text: &str) -> Vec<(String, usize)> {
    if text.is_empty() {
        return Vec::new();
    }
    let padded = format!("  {} ", text.to_lowercase());
    let chars: Vec<char> = padded.chars().collect();
    let mut counts: Vec<(String, usize)> = Vec::new();
    for i in 0..chars.len().saturating_sub(2) {
        let tri: String = chars[i..i + 3].iter().collect();
        match counts.iter_mut().find(|(t, _)| *t == tri) {
            Some(entry) => entry.1 += 1,
            None => counts.push((tri, 1)),
        }
    }
    counts
}

/// Dice coefficient over two profiles (0..1).
pub fn trigram_dice(a: &[(String, usize)], b: &[(String, usize)]) -> f64 {
    if a.is_empty() || b.is_empty() {
        return 0.0;
    }
    let mut bmap: Vec<(String, usize)> = b.to_vec();
    let b_total: usize = b.iter().map(|(_, c)| c).sum();
    let mut a_total = 0usize;
    let mut inter = 0usize;
    for (tri, count) in a {
        a_total += count;
        if let Some(entry) = bmap.iter_mut().find(|(t, _)| t == tri) {
            let take = (*count).min(entry.1);
            inter += take;
            entry.1 -= take;
        }
    }
    let denom = a_total + b_total;
    if denom == 0 {
        0.0
    } else {
        (2 * inter) as f64 / denom as f64
    }
}

#[derive(Debug, Clone)]
pub struct FuzzyMatch {
    pub value: String,
    pub dist: usize,
    pub trigram: f64,
}

/// Rank by trigram Dice, verify with bounded Levenshtein, keep dist <= max.
/// Sound: the trigram order never drops a true match.
pub fn rank_fuzzy(term: &str, candidates: &[String], max_dist: usize, limit: usize, max_len: usize) -> Vec<FuzzyMatch> {
    if term.is_empty() || candidates.is_empty() {
        return Vec::new();
    }
    let term_profile = trigram_profile(term);
    let mut scored: Vec<(usize, FuzzyMatch)> = Vec::new();
    for (i, value) in candidates.iter().enumerate() {
        let tri = trigram_dice(&term_profile, &trigram_profile(value));
        let dist = levenshtein(term, value, max_dist, max_len);
        if dist <= max_dist {
            scored.push((i, FuzzyMatch { value: value.clone(), dist, trigram: tri }));
        }
    }
    scored.sort_by(|(ia, a), (ib, b)| {
        b.trigram.partial_cmp(&a.trigram).unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.dist.cmp(&b.dist))
            .then_with(|| ia.cmp(ib))
    });
    scored.into_iter().take(limit).map(|(_, m)| m).collect()
}

#[napi]
pub fn levenshtein_distance(a: String, b: String, max_dist: u32) -> u32 {
    levenshtein(&a, &b, max_dist as usize, 64) as u32
}

/// rankFuzzy over a JSON string array. Returns JSON [{value,dist,trigram}].
#[napi]
pub fn rank_fuzzy_search(term: String, candidates_json: String, max_dist: u32, limit: u32) -> napi::Result<String> {
    let doc: Value = serde_json::from_str(&candidates_json)
        .map_err(|e| napi::Error::new(napi::Status::InvalidArg, format!("bad candidates_json: {e}")))?;
    let arr = doc.as_array().ok_or_else(|| napi::Error::new(napi::Status::InvalidArg, "candidates must be an array"))?;
    let cands: Vec<String> = arr.iter().filter_map(|x| x.as_str()).map(|s| s.to_string()).collect();
    let out: Vec<Value> = rank_fuzzy(&term, &cands, max_dist as usize, limit as usize, 64)
        .iter()
        .map(|m| json!({"value": m.value.as_str(), "dist": m.dist as u32, "trigram": m.trigram}))
        .collect();
    serde_json::to_string(&out).map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("json: {e}")))
}

// Unit tests (cargo test — CI native.yml)

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_mirrors_ts_boundaries() {
        let ms: Vec<String> = extract_mention_spans("email@example.com @ok", 32).into_iter().map(|s| s.value).collect();
        assert_eq!(ms, vec!["ok".to_string()]);
        let hs: Vec<String> = extract_hashtag_spans("a#b #c", 100).into_iter().map(|s| s.value).collect();
        assert_eq!(hs, vec!["#b".to_string(), "#c".to_string()]);
    }

    #[test]
    fn emoji_utf16_offsets() {
        // "hi @bob 🎉 #party": '#' starts at UTF-16 unit 11, ends at 17.
        let hs = extract_hashtag_spans("hi @bob 🎉 #party", 100);
        assert_eq!(hs.len(), 1);
        assert_eq!((hs[0].start, hs[0].end), (11, 17));
    }

    #[test]
    fn xss_text_neutralized() {
        let out = sanitize_text("<script>alert(1)</script>hi <b>bob</b>");
        assert_eq!(out, "hi bob");
        assert!(!sanitize_text("<img src=x onerror=alert(1)>").contains("onerror"));
    }

    #[test]
    fn golden_vectors() {
        let data = include_str!("../../vectors/v1.json");
        let doc: Value = serde_json::from_str(data).expect("vectors parse");
        assert_eq!(doc["version"].as_u64(), Some(1));
        let mut rust_cases = 0;
        for v in doc["vectors"].as_array().expect("vectors") {
            let impls: Vec<&str> = v["implementations"].as_array().expect("impls").iter().filter_map(|x| x.as_str()).collect();
            if !impls.contains(&"rust") {
                continue; // rich rendering is TS-only in v1
            }
            rust_cases += 1;
            let name = v["name"].as_str().unwrap_or("?");
            let opts_v = &v["options"];
            let opts = PipelineOptions {
                max_length: opts_v.get("maxLength").and_then(|x| x.as_u64()).unwrap_or(DEFAULT_MAX_LENGTH as u64) as usize,
                max_mentions: opts_v.get("maxMentions").and_then(|x| x.as_u64()).unwrap_or(10) as usize,
                max_hashtags: opts_v.get("maxHashtags").and_then(|x| x.as_u64()).unwrap_or(8) as usize,
                max_links: opts_v.get("maxLinks").and_then(|x| x.as_u64()).unwrap_or(2) as usize,
                linkify: resolve_linkify(
                    opts_v.get("mode").and_then(|x| x.as_str()),
                    opts_v.get("linkify").and_then(|x| x.as_bool()),
                ),
            };
            let r = process_text_core(v["input"].as_str().unwrap_or(""), &opts);
            let exp = &v["expected"];
            assert_eq!(r.text, exp["text"].as_str().unwrap(), "text {name}");
            let mv: Vec<&str> = r.mentions.iter().map(|s| s.value.as_str()).collect();
            let ev: Vec<&str> = exp["mentions"].as_array().unwrap().iter().filter_map(|x| x.as_str()).collect();
            assert_eq!(mv, ev, "mentions {name}");
            let hv: Vec<&str> = r.hashtags.iter().map(|s| s.value.as_str()).collect();
            let he: Vec<&str> = exp["hashtags"].as_array().unwrap().iter().filter_map(|x| x.as_str()).collect();
            assert_eq!(hv, he, "hashtags {name}");
            for (i, s) in r.mentions.iter().enumerate() {
                let e = &exp["mentionSpans"][i];
                assert_eq!(s.value, e["value"].as_str().unwrap(), "mention value {name}#{i}");
                assert_eq!(s.start as u64, e["start"].as_u64().unwrap(), "mention start {name}#{i}");
                assert_eq!(s.end as u64, e["end"].as_u64().unwrap(), "mention end {name}#{i}");
            }
            assert_eq!(r.mentions.len(), exp["mentionSpans"].as_array().unwrap().len(), "mention count {name}");
            for (i, s) in r.hashtags.iter().enumerate() {
                let e = &exp["hashtagSpans"][i];
                assert_eq!(s.value, e["value"].as_str().unwrap(), "hashtag value {name}#{i}");
                assert_eq!(s.start as u64, e["start"].as_u64().unwrap(), "hashtag start {name}#{i}");
                assert_eq!(s.end as u64, e["end"].as_u64().unwrap(), "hashtag end {name}#{i}");
            }
            assert_eq!(r.hashtags.len(), exp["hashtagSpans"].as_array().unwrap().len(), "hashtag count {name}");
            let exp_links = exp["links"].as_array().unwrap();
            assert_eq!(r.links.len(), exp_links.len(), "link count {name}");
            for (i, l) in r.links.iter().enumerate() {
                let e = &exp_links[i];
                assert_eq!(l.value, e["value"].as_str().unwrap(), "link value {name}#{i}");
                assert_eq!(l.start as u64, e["start"].as_u64().unwrap(), "link start {name}#{i}");
                assert_eq!(l.end as u64, e["end"].as_u64().unwrap(), "link end {name}#{i}");
                assert_eq!(l.url, e["url"].as_str().unwrap(), "link url {name}#{i}");
            }
            assert!((r.score - exp["spam"]["score"].as_f64().unwrap()).abs() < 1e-9, "score {name}");
            let rr: Vec<&str> = r.reasons.iter().map(|s| s.as_str()).collect();
            let er: Vec<&str> = exp["spam"]["reasons"].as_array().unwrap().iter().filter_map(|x| x.as_str()).collect();
            assert_eq!(rr, er, "reasons {name}");
            assert_eq!(r.capped, exp["capped"].as_bool().unwrap(), "capped {name}");
            assert_eq!(r.truncated, exp["truncated"].as_bool().unwrap(), "truncated {name}");
        }
        assert!(rust_cases >= 8, "expected most vectors runnable in Rust, got {rust_cases}");
    }

    #[test]
    fn golden_similarity() {
        let data = include_str!("../../vectors/similarity.v1.json");
        let doc: Value = serde_json::from_str(data).expect("similarity vectors parse");
        assert_eq!(doc["version"].as_u64(), Some(1));
        for c in doc["levenshtein"].as_array().expect("levenshtein") {
            let a = c["a"].as_str().unwrap_or("");
            let b = c["b"].as_str().unwrap_or("");
            let max = c["maxDist"].as_u64().unwrap() as usize;
            assert_eq!(levenshtein(a, b, max, 64), c["expected"].as_u64().unwrap() as usize, "{a} vs {b}");
        }
        for c in doc["dice"].as_array().expect("dice") {
            let got = trigram_dice(&trigram_profile(c["a"].as_str().unwrap_or("")), &trigram_profile(c["b"].as_str().unwrap_or("")));
            let exp = c["expected"].as_f64().unwrap();
            assert!((got - exp).abs() < 1e-6, "dice {} vs {}", c["a"], c["b"]);
        }
        for c in doc["rankFuzzy"].as_array().expect("rankFuzzy") {
            let cands: Vec<String> = c["candidates"].as_array().unwrap().iter().filter_map(|x| x.as_str()).map(|s| s.to_string()).collect();
            let got = rank_fuzzy(
                c["term"].as_str().unwrap_or(""),
                &cands,
                c["options"]["maxDist"].as_u64().unwrap_or(2) as usize,
                c["options"]["limit"].as_u64().unwrap_or(10) as usize,
                64,
            );
            let exp = c["expected"].as_array().unwrap();
            assert_eq!(got.len(), exp.len(), "rankFuzzy length");
            for (i, m) in got.iter().enumerate() {
                assert_eq!(&m.value, exp[i]["value"].as_str().unwrap(), "rankFuzzy[{i}]");
                assert_eq!(m.dist as u64, exp[i]["dist"].as_u64().unwrap(), "rankFuzzy dist[{i}]");
            }
        }
    }
}
