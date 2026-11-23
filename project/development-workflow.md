# Development workflow

## Branching

- `main` — production-ready; no direct implementation commits, ever.
- `dev` — integration and testing; only validated work is merged here.
- Feature branches — one per feature/module, branched from `dev`, merged back via integration after validation.

Do not overwrite others' work, discard changes, delete/reset branches, or force-push. Preserve existing history.

## Parallel development

Five independent workstreams are anticipated: Core & Foundation, Network Core, Messaging Engine, Group System, and File Transfer. Storage is shared infrastructure with one set of boundaries defined in [module-boundaries.md](module-boundaries.md); its foundation is implemented in `modules/storage` and validated separately. Agree contracts in `shared/` before implementing against them; do not reach into another module's internals.

## Mock dependencies

Mocks are first-class: discovery/connections, transport (delay, failure, duplicates, offline), peers (invites, membership, disconnects), and transfers (progress, interruption, invalid files, cancellation). Modules must accept mocks through the same stable interfaces as real implementations, and mocks must be labeled as such.

## Testing before integration

Run unit, module, and mock tests locally first. Integration tests follow when modules connect. Validate no existing feature breaks and that failures stay isolated before merging into `dev`. See [tests/README.md](../tests/README.md).

## Incremental integration

Land small, verifiable slices; keep each milestone runnable and demonstrable. `main` receives only validated, production-ready integrations.

## Git safety

Never implement on `main`; never force-push, reset, delete branches, or discard uncommitted changes without permission. Keep commits focused. Work in a linked worktree must be validated and its feature branch merged back into `dev` through the integration workflow.
