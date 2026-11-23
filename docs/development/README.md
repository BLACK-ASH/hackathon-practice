# Development

Orientation for contributors and AI agents. Detail lives in [module boundaries](../../project/module-boundaries.md), [development workflow](../../project/development-workflow.md), [milestones](../../project/milestones.md), and the [testing approach](../../tests/README.md). The authoritative agent context is [AGENTS.md](../../AGENTS.md).

## Repository workflow

- `main` — production-ready only; never develop directly on it.
- `dev` — integration and testing; only validated work is merged here.
- Feature branches — one isolated branch per feature/module.

## Independent module development

Modules are implemented against shared interfaces, not each other's internals. Agree contracts in the local `p2p_lan_messenger_shared` package first. Each module can be built and tested on its own; failures are reported through module health/status without cascading.

## Mock-based development

Every module needs mock dependencies so work doesn't wait on others: mock discovery/connections, mock transport (delay, failure, duplicates, offline), mock peers, and mock transfers. Mocks must be clearly labeled and swappable for real implementations via the same interfaces.

Level 0 mocks live in `shared/lib/mocks/mocks.dart` and are used by `lib/src/foundation/foundation_components.dart` for the runnable app shell. They are development doubles, not production implementations.

## Testing expectations

Unit, module, mock, and integration tests; later cross-device LAN and failure/recovery tests. Verify changes with `flutter analyze` and `flutter test` from the repository root. Do not claim untested functionality works — see [tests/README.md](../../tests/README.md).

## Shared package layout

Shared Dart code is a local path package rooted at `shared/` and imported as `package:p2p_lan_messenger_shared/...`. Application code imports `package:p2p_lan_messenger/...`. This keeps the shared layer independently testable while allowing app code to consume it without fragile cross-package relative paths.

## Incremental integration

Integrate small validated slices into `dev`, keep every milestone runnable and demonstrable, and preserve existing work. No force-push, resets, or deletion of branches/changes.

## Documentation maintenance

Update documentation whenever architecture, interfaces, setup, or behavior changes; describe actual implemented behavior. Architectural choices go into a decision record in [decisions](../decisions/README.md).
