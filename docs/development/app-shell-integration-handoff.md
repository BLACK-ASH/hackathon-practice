# Level 0 application shell — Core integration handoff

- **Owner:** Arshad Shaikh (Application UI)
- **Audience:** Ashif Shaikh (Core), Sachin (Network), Harsh (Profile/Peer UI), Farhan (Storage)
- **Integration branch:** `feature/l0-core-ui-integration`
- **Starting `origin/dev` commit:** `c25fe15f154f42b57d92d3030e92cb889fb3b26b`
- **Status:** Integration implemented and validated locally. No commit, merge or push was performed.

This document replaces the earlier proposal that said Core contracts were missing. Core Foundation exists on `origin/dev`; this branch wires the UI shell to its actual public facade and mocks.

## 1. What was integrated

The previously separate React UI shell now lives alongside Core Foundation in an isolated worktree and consumes the existing `MessengerApi` mock facade.

- `MessengerProvider` is the single UI-to-Core adapter.
- All five destinations render real typed data from Core mocks instead of generic placeholders.
- Profile display-name updates call `MessengerApi.updateDisplayName()` through the adapter.
- User-safe errors come from `AppError`/`toErrorInfo()`.
- Loading, error and empty states are shared UI components.
- The shell still owns navigation; no feature module internals are imported.

No real networking, messaging, groups, file transfer or durable storage was added. All visible data is explicitly labeled as mock data.

## 2. Git safety and preservation

- `origin/dev` was fetched with `git fetch --prune origin`.
- The integration branch was created from the fetched commit above.
- Work was done in `/tmp/opencode/l0-core-ui-integration`, a separate worktree.
- The original working tree at `/home/arshad/Documents/hackathon-practice` remains on `feature/l0-app-shell-navigation` with the same modified and untracked files.
- No branch was deleted, reset, cleaned, force-pushed, committed, merged or pushed.

## 3. Actual Core contracts and services used

| Area | Used from Core | Used by UI for |
|---|---|---|
| Facade | `MessengerApi` (`shared/contracts/app.ts`) | Identity, peers, conversations, groups, transfers, health, profile update |
| Types | `PeerInfo`, `PeerIdentity`, `Conversation`, `GroupInfo`, `FileTransferRecord`, `ModuleHealthReport`, `ErrorInfo` | Typed page snapshots and status display |
| Errors | `AppError`, `toErrorInfo()` (`modules/core/src/index.ts`), `toUiErrorInfo()` (UI) | Safe error messages without socket/protocol details |
| Events | `AppEvents` keys: `core.module.health`, `identity.changed`, `network.peer.*`, `network.connection.changed`, `messaging.*`, `groups.*`, `files.*`, `storage.error` | Refreshing the snapshot after facade changes |
| Mock | `createMockMessengerApi()` (`shared/mocks/index.ts`) | Seeded peers, chats, group and transfer records |

The UI does **not** import `StorageService`, `PeerNetwork`, feature modules, or raw platform APIs.

### Final review fixes

- `app/src/integration/errors.ts` wraps unknown failures with a generic safe message before rendering; `AppError` messages from Core are preserved.
- Mock-only copy is now conditional on `isMock`, so the pages remain accurate if a real `MessengerApi` is injected.
- Added tests for raw-error sanitization and `AppEvents` refresh/unsubscribe behavior.

## 4. Files changed

### Added or replaced in `app/`

- `src/integration/MessengerProvider.tsx`
- `src/integration/errors.ts`
- `src/integration/MessengerProvider.test.tsx`
- `src/integration/boundaries.test.ts`
- `src/components/PageState.tsx`
- `src/components/PageState.module.css`
- `src/pages/ChatsPage.tsx`
- `src/pages/NearbyPage.tsx`
- `src/pages/GroupsPage.tsx`
- `src/pages/TransfersPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/DataPages.module.css`
- `src/pages/format.ts`

### Updated in `app/`

- `src/main.tsx` — mounts `<MessengerProvider>`.
- `src/App.tsx` — routes point to Core-backed pages.
- `src/test/renderApp.tsx` — injectable `MessengerApi` and mock flag.
- `src/App.test.tsx` — assertions updated for the new route content.
- `vite.config.ts` — aliases and `server.fs.allow`.
- `tsconfig.json` — matching TypeScript path aliases.
- `src/components/PageState.tsx` — `ErrorState` now uses `role="alert"`.

### Minimal Core/root integration fixes

- `modules/core/src/lifecycle.ts` — removed the unused `ModuleStatus` import. The app has `noUnusedLocals: true` and now typechecks Core through aliases.
- `package.json` — root `test`/`test:watch` now explicitly target `tests/*.test.ts` and `shared/mocks/test-context.ts`. This prevents Node's runner from executing the app's Vitest files while preserving the 69-test baseline.

### Documentation

- `README.md`
- `docs/architecture/README.md`
- `docs/development/README.md`
- `docs/development/app-shell.md`
- `docs/development/app-shell-integration-handoff.md` (this file)
- `docs/decisions/README.md`
- `docs/decisions/0002-app-shell-ui-stack.md` (renamed from `0001`; Core owns `0001`)
- `tests/README.md`

No Core implementation behavior was changed beyond the one unused import noted above.

## 5. Mock data behavior

| Route | Visible source | User-facing limitation |
|---|---|---|
| `/chats` | `listConversations()` | “No messages are being sent.” |
| `/nearby` | `listPeers()` | “No live discovery is running.” |
| `/groups` | `listGroups()` | “Group messaging is not connected.” |
| `/transfers` | `listTransfers()` | “No files are being sent.” |
| `/settings` | identity + module health | “Display name is not persisted across restarts.” |

## 6. Validation results

Commands run in the integration worktree:

```bash
# root
npm ci
npm run validate

# app
cd app
npm ci
npm run typecheck
npm test
npm run lint
npm run build
```

Actual results:

- Root `npm ci`: succeeded, 0 vulnerabilities.
- Root `npm run typecheck`: passed.
- Root `npm test`: **69 passed, 0 failed**.
- Root `npm run validate`: passed.
- App `npm ci`: succeeded.
- App `npm run typecheck`: passed.
- App `npm test`: **14 passed, 0 failed** across 3 files.
- App `npm run lint`: passed.
- App `npm run build`: passed (88 modules transformed).

Not verified: real LAN discovery, real peer connections, real file transfers, native permissions, background execution, installable builds, or real-device desktop/mobile behavior.

## 7. Remaining decisions / blockers from other owners

No hard blocker prevents this integration from being reviewed. The following remain team-owned:

1. **Native runtime/platform matrix** (Ashif/team) — Tauri, Electron, Capacitor or another wrapper has not been selected or installed.
2. **Real `MessengerApi` adapter** (Ashif/Core) — required before the UI replaces mocks with live modules; the UI is ready to receive it through `MessengerProvider`.
3. **Feature modules** (Sachin, messaging, groups, file transfer, Farhan) — real discovery, messaging, groups, transfers and storage are still unimplemented.
4. **ADR 0002 ratification** (Ashif/team) — the provisional UI stack should be accepted or explicitly replaced.
5. **Profile/peer screen placement** (Harsh) — profile now exists under Settings via mock identity; a separate destination needs a team decision.
6. **Theme/config persistence** (Ashif + Farhan) — CSS tokens exist, but no persisted theme setting is implemented.

## 8. Confirmations

- Arshad's original dirty branch and untracked files were preserved.
- Ashif's Core implementation was left intact except for one unused-import removal required by app typechecking.
- No commit, merge, push, reset, clean, stash or history rewrite was performed.
- No native runtime was installed or selected.
- No mock is presented as a real connection, message, group or transfer.
