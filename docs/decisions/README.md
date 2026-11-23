# Architecture decision records

Lightweight decision log for choices that affect architecture, interfaces, dependencies, or platforms. Discovery and transport decisions remain open; the storage and cross-platform stack decisions are recorded.

## Records

- [0001 — Local storage uses Dart + drift over SQLite](0001-local-storage-drift-sqlite.md)
- [0002 — Cross-platform application stack is Flutter + Dart](0002-cross-platform-flutter-dart.md)

## When to write one

When choosing a framework, transport/discovery mechanism, storage technology, security approach, module contract, or anything expensive to reverse.

## How to write one

Add a numbered Markdown file here (for example `0001-transport-choice.md`) with:

- **Decision** — what was chosen, in one sentence.
- **Context** — the problem and constraints (offline, cross-platform, hackathon timeline, etc.).
- **Alternatives considered** — other viable options and why they were rejected.
- **Reasoning** — why this option fits the project goals.
- **Consequences** — what becomes easier, harder, or must be handled (including platform limits).

Keep records short and factual. Superseded decisions get a new record that links to the old one rather than rewriting history.
