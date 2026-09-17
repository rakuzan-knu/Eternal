# 🖥️ Desktop Application (Coming Soon)

## 📌 Status: Under Evaluation

The desktop client application is currently in the architectural evaluation stage. The team is evaluating two modern desktop application runtimes:

---

## ⚖️ Technical Trade-off Evaluation: Electron vs. Tauri 2.0

| Evaluation Metric | Electron 34 + Vite | Tauri 2.0 (Rust + Webview2) | Recommendation & Notes |
| :--- | :--- | :--- | :--- |
| **Binary Bundle Size** | ~80 MB – 120 MB (Bundles Chromium + Node.js) | **~10 MB – 25 MB** (Uses OS Webview: Webview2 on Windows, WebKitGTK on Linux, WKWebView on macOS) | **Tauri 2.0** wins significantly on distribution footprint. |
| **Idle Memory Footprint** | ~120 MB – 200 MB RAM per instance | **~35 MB – 60 MB RAM** | **Tauri 2.0** provides 3–4x lower memory usage. |
| **Rust Native Synergy** | Requires NAPI-RS or C++ add-ons bridging Node.js | **Native Rust core** (Direct integration with `@social-network/native`, SIMD, and low-level WebRTC/audio) | **Tauri 2.0** aligns with existing native Rust packages in monorepo. |
| **WebRTC & Audio Capture** | First-class Chromium media engine & loopback audio capture | Dependent on platform webview capabilities and native Rust audio backends | **Electron** offers easier multi-track loopback audio / screen share. |
| **Ecosystem & Plugin Maturity** | 10+ years of mature enterprise deployment (Discord, Slack, VS Code) | Tauri 2.0 released late 2024 with cross-platform mobile/desktop plugins | **Electron** has mature enterprise desktop battle-testing. |
| **Build Time & Toolchain** | Pure JavaScript/Node build pipeline | Requires local Rust toolchain (`cargo`, `rustc`, OS webview dependencies) | **Electron** is faster to iterate without local C/Rust compilers. |

---

## 🚀 Shared Architecture Ready

Whichever runtime is selected, the desktop application will consume the unified shared packages:

- `@shared/contracts` — Zod schemas & API contracts
- `@shared/api-client` — TanStack Query & HTTP client
- `@shared/stores` — Global Zustand state (Auth, UI, Media, E2EE, Voice)
- `@shared/socket` — Real-time Socket.IO & WebRTC mesh signaling
- `@shared/crypto` — Pure WebCrypto E2EE with native credential storage
- `@shared/ui-primitives` — Headless UI components
