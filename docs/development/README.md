# Development

Orientation for contributors and AI agents. Detail lives in [module boundaries](../../project/module-boundaries.md), [development workflow](../../project/development-workflow.md), [milestones](../../project/milestones.md), and the [testing approach](../../tests/README.md). The authoritative agent context is [AGENTS.md](../../AGENTS.md).

## Repository workflow

- `main` — production-ready only; never develop directly on it.
- `dev` — integration and testing; only validated work is merged here.
- Feature branches — one isolated branch per feature/module.

## Implemented toolchain

- **Storage module:** Dart package at `modules/storage` using drift/SQLite; see its [README](../../modules/storage/README.md).
- **Required tooling:** a Dart SDK with `dart pub`/`dart test`; Flutter is not required to build or test the storage package.
- **Verified environment:** Dart 3.14.1 on Windows. Flutter SDK and mobile packaging are not yet installed or validated.

Run storage checks from `modules/storage`:

```powershell
dart pub get
dart analyze
dart test
dart run example/storage_demo.dart
```

After editing the drift schema, regenerate code:

```powershell
dart run build_runner build --delete-conflicting-outputs
```

Do not commit `.dart_tool/`. The generated `lib/src/database.g.dart` is committed because the package is consumed as a path dependency.

## Independent module development

Modules are implemented against shared interfaces, not each other's internals. Agree contracts in `shared/` first. Each module can be built and tested on its own; failures are reported through module health/status without cascading.

## Mock-based development

Every module needs mock dependencies so work doesn't wait on others: mock discovery/connections, mock transport (delay, failure, duplicates, offline), mock peers, and mock transfers. Mocks must be clearly labeled and swappable for real implementations via the same interfaces.

## Testing expectations

Unit, module, mock, and integration tests; later cross-device LAN and failure/recovery tests. Do not claim untested functionality works — see [tests/README.md](../../tests/README.md).

## Incremental integration

Integrate small validated slices into `dev`, keep every milestone runnable and demonstrable, and preserve existing work. No force-push, resets, or deletion of branches/changes.

## Documentation maintenance

Update documentation whenever architecture, interfaces, setup, or behavior changes; describe actual implemented behavior. Architectural choices go into a decision record in [decisions](../decisions/README.md).
