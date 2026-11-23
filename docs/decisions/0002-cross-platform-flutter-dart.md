# 0002 — Cross-platform application stack is Flutter + Dart

- **Status:** Accepted
- **Date:** 2026-11-23

## Decision

Build the application with Flutter for the cross-platform UI and shared Dart for application logic, alongside the Dart/SQLite storage foundation recorded in ADR 0001.

## Context

The messenger must run on Windows, Linux, macOS, Android, iOS, tablets, and other supported mobile devices from one codebase while retaining direct local-network communication and offline operation. The project needs a hackathon-feasible UI framework with shared logic and isolated platform adapters. No application shell or UI exists yet.

## Alternatives considered

- **React Native** — broad mobile reach and familiar web tooling, but would split the storage foundation from the UI language and add a JavaScript/TypeScript toolchain.
- **Electron/Tauri desktop-first** — strong desktop support, but weak or indirect mobile support for a project that explicitly requires phones and tablets.
- **Kotlin Multiplatform or .NET MAUI** — capable native stacks, but narrower team familiarity and less direct reuse of the implemented Dart storage package.
- **Separate native apps per platform** — rejected: too much duplicated UI and application logic for the available timeline.

## Reasoning

Flutter provides one UI codebase across desktop and mobile with responsive layouts and touch support, while Dart keeps UI-adjacent logic in the same language as the storage foundation. Platform-specific discovery, sockets, permissions, file paths, and notifications can stay behind adapters. The storage package is deliberately UI-independent, so Flutter integration can be added without rewriting persistence.

## Consequences

- A Flutter SDK must be installed for application work; the storage package still builds and tests with Dart alone.
- Native SQLite packaging and application-data paths must be configured per Flutter platform during shell integration.
- Network discovery/transport will need platform-specific implementations or plugins with graceful fallbacks.
- Desktop, tablet, and mobile layouts must be designed separately rather than shrinking one view.
- The UI and application shell remain unimplemented; this record fixes the intended stack, not a delivered feature.
