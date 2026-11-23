# Testing approach

## Current tooling

Level 0 uses strict TypeScript and Node 22.18+'s built-in test runner and type
stripping. There are no runtime dependencies and no build step.

```bash
npm install
npm test             # node --test
npm run typecheck    # tsc --noEmit
npm run validate     # both
```

All current suites are deterministic, offline and device-free. They live next
to this file:

| Suite | Covers |
|---|---|
| `core.test.ts` | AppError/Result, IDs, logger, clocks, timeouts |
| `config.test.ts` | Defaults, environment parsing, invalid-value reporting |
| `events.test.ts` | Subscribe/unsubscribe, `once`, safe dispatch, failure isolation |
| `lifecycle.test.ts` | Start order, failure isolation, timeouts, degraded health, shutdown/cleanup |
| `identity.test.ts` | ID generation, persistence, profile updates, validation, events |
| `mock-network.test.ts` | Simulated discovery, connect/disconnect/offline, send failures, duplicate delivery, handler isolation |
| `mock-storage.test.ts` | All repositories, ordering, cloning, failure injection |
| `mock-messenger.test.ts` | Seeded UI facade, send/read/retry, groups, transfers, health |
| `boundaries.test.ts` | Import-direction rules and runtime contract helpers |

## Planned levels

- **Unit tests** — pure logic in isolation: IDs, validation, message ordering, deduplication, metadata checks.
- **Module tests** — one module at a time through its public interface, with its dependencies mocked; verifies module health and failure isolation.
- **Integration tests** — modules working together through stable contracts (messaging + network + storage, groups + network, transfers + storage).
- **Mock tests** — explicit scenarios: discovery/connect/disconnect/reconnect; delayed, failed, duplicated and offline-peer messages; group invites and partial failures; interrupted, invalid, cancelled and progressing transfers.
- **Cross-device LAN tests** — real supported devices on ordinary Wi-Fi/hotspots, including restrictive networks; verifies discovery, direct messaging, groups and file sharing without internet.
- **Failure and recovery tests** — network loss, peer disappearance, storage corruption/errors, missing platform permissions or capabilities, and recovery paths; confirms other modules keep working.

Tests must describe actual behavior, and a feature is not "done" until it is
tested. Mobile/desktop layout and touch interaction are validated in M6.
