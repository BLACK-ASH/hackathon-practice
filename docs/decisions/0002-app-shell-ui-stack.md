# 0002 — App shell UI stack

- **Status:** Accepted for the Level 0 web shell; provisional until team ratification.
- **Decision:** Build the Level 0 shell as a React 19 + TypeScript single-page application bundled with Vite 7, using `HashRouter` for navigation and local CSS design tokens for theming. The shell is packaging-agnostic: it runs in a local dev server and can later be embedded in a native webview (for example Tauri, Electron, or Capacitor) without changing routing or UI code.

> This record was originally drafted as `0001` before Core's accepted
> [ADR 0001](0001-typescript-cross-platform-foundation.md) landed. It was
> renumbered to `0002` during integration; no history was deleted.

## Context

The repository originally contained documentation and empty module placeholders only. No framework, package manager, routing approach, or build tooling had been finalized. The environment provides Node.js and npm; no Flutter, Dart, Rust, or JVM toolchain is installed.

The shell must work offline, share one codebase across desktop and mobile, adapt its navigation to screen size, remain testable, and avoid coupling to networking, storage, messaging, groups, or file-transfer internals.

Core Foundation now provides `MessengerApi`, typed events and mock implementations. The shell consumes those public contracts through a single adapter; see [integration handoff](../development/app-shell-integration-handoff.md).

## Alternatives considered

- **Flutter** — strong single-codebase cross-platform UI, but no SDK is available here and it would add a new language/toolchain to every developer's setup.
- **React Native** — good mobile support, but desktop targets are less direct for this project's hackathon timeline.
- **Plain HTML/CSS/JavaScript** — no dependency install, but weaker module boundaries, type safety, and testability.
- **Introducing a native wrapper now** — Tauri/Electron/Capacitor packaging is a later integration step; adding it before module work would slow Level 0 without improving the shell.

## Reasoning

React + TypeScript + Vite is installable with the available toolchain, supports component boundaries and focused tests, and keeps all assets local. CSS media queries provide distinct desktop, tablet, and mobile navigation patterns. `HashRouter` avoids server-side route rewrites and works from a local static host or packaged webview custom scheme, which matches the offline-first, installable target. This decision covers **presentation only**; it does not select a transport, discovery mechanism, database, or security protocol.

## Consequences

- The shell can be developed and validated entirely offline after dependencies are installed.
- A native packaging adapter must be chosen before release builds for Linux, Windows, macOS, Android, and iOS.
- Feature routes are real Core-backed mock pages in `app/src/pages/`; the shell never imports module internals.
- Shared contracts remain owned by Core in `shared/`; this decision deliberately defines no such contracts.
- Vite and TypeScript aliases (`#core`, `#contracts`, `#types`, `#mocks`) keep imports explicit and swappable.
- If the team ratifies a different UI framework, the navigation destinations, route behavior, and responsive behavior in this shell are the reference behavior to port.
