# Cumulative milestones

Each milestone leaves the project runnable and demonstrable. Priorities: P0 (M1–M3) minimum viable app, P1 (M4–M5) core hackathon features, P2 enhancements only after P0/P1 are stable. See [AGENTS.md](../AGENTS.md) for full priorities.

## M1 — Foundation

**Goal:** application launches with identity, navigation, independent module initialization, and mock data.
**Done when:** UI shell works; identity is created and persists; navigation works; modules initialize independently and report status; mock data is visible; module failures do not prevent startup.

## M2 — Peer Connectivity

**Goal:** devices on the same LAN find each other and connect directly.
**Done when:** peers appear automatically in the UI without manual addresses; direct connections are established; join/leave and availability status update; duplicates are avoided; disconnects are handled understandably.

## M3 — Private Messaging

**Goal:** two devices exchange messages with durable local history.
**Done when:** messages send/receive in real time with timestamps and ordering; duplicates are detected; history persists offline across restarts; conversations restore; failed messages can be retried; disconnects are handled without data loss.

## M4 — Group Messaging

**Goal:** multiple peers communicate in groups.
**Done when:** groups can be created, named, and populated with nearby peers; members can leave/removal rules are respected; group messages are distributed, validated, deduplicated, and persisted; one unavailable peer does not block delivery to others.

## M5 — File Sharing

**Goal:** peers send and receive files directly.
**Done when:** metadata is validated; transfers show progress and can be cancelled where possible; received files are saved safely and accessible; failures and interruptions are reported; messaging continues during and after transfers.

## M6 — Cross-Platform Stabilization

**Goal:** consistent behavior across supported devices and networks.
**Done when:** desktop/tablet/mobile layouts and touch interaction are tested; network loss, client isolation, permission gaps, and module failures are exercised; integration issues fixed; UI polished; all earlier milestones still pass.
