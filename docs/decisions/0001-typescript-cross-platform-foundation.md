# 0001 — TypeScript foundation with platform adapters

- **Status:** Accepted for Level 0 (Core Foundation). UI shell packaging is deferred to M1.
- **Decision:** Write shared logic, contracts, mocks and module code in strict TypeScript using erasable syntax and web-standard APIs. Use Node 22+ only as the local test/typecheck runtime. Keep all platform-specific networking, storage, permissions and file access behind interfaces, with Tauri 2 (`WebView` shell for Linux/Windows/macOS/Android/iOS) as the recommended M1 shell rather than a dependency installed now.

## Context

The repository has no implementation or framework decision. Five developers must work in parallel on core, network, messaging, groups, file transfer and storage, and an application UI must eventually install on desktop and mobile without internet. Level 0 must be small, testable offline in this environment, and consumable by every module. The environment has Node, npm and Rust available but no Flutter or Dart SDK.

## Alternatives considered

- **Flutter/Dart:** one unified UI and good mobile support, but no SDK here, a separate language for all contracts, and a blocker for parallel TypeScript/web work. Rejected for Level 0.
- **React Native:** strong mobile story but desktop targets need separate shells; unifying all five targets costs more than the hackathon timeline allows. Rejected as the shared foundation.
- **Tauri 1 / Electron:** desktop-first. Electron cannot cover Android/iOS; Tauri 1 lacks mobile. Rejected as the only shell.
- **Plain JavaScript:** faster to start but loses the stable, typed contracts that five parallel developers need. Rejected.

## Reasoning

TypeScript contracts compile to nothing, run unchanged in Node tests and web views, and describe module boundaries precisely. Node 22+ strips types natively, so the foundation needs only two dev dependencies (`typescript` for checking and `@types/node` for tests) and no build step or bundler at Level 0. Tauri 2 can wrap the same TypeScript/React UI for all five target platforms with Rust-side adapters for sockets, mDNS and storage, so the shell recommendation does not lock the core to a desktop-only framework.

## Consequences

- Core and contracts must use only runtime-neutral APIs (`crypto.randomUUID`, `Date`, `console`, `AbortController`); no Node-only or DOM-only imports in `modules/core`, `shared/types` or `shared/contracts`.
- Networking, storage and platform capabilities stay behind `PeerNetwork`, `StorageService` and `FileSource`; the network and storage modules own their adapter technology.
- Tauri, React, SQLite and discovery/socket libraries are **not** installed by Level 0. They are M1/M2 decisions; adding them now would be speculative.
- Contributors need Node 22.18+ (`npm run validate`); no internet, LAN devices or app shell are required for Level 0 validation.
- Tradeoff: Tauri mobile builds require platform SDKs later and Tauri's mobile plugin set is narrower than Flutter's. If the team chooses Flutter at M1, the TypeScript contracts must be translated once; keeping them small limits that cost.
