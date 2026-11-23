# Architecture decision records

Lightweight decision log for choices that affect architecture, interfaces, dependencies, or platforms.

## Decisions

- [0001 — TypeScript foundation with platform adapters](0001-typescript-cross-platform-foundation.md) (accepted for Level 0).
- [0002 — App shell UI stack](0002-app-shell-ui-stack.md) (accepted for the Level 0 web shell; provisional until team ratification).

The shell decision was originally drafted as `0001` before Core's accepted
`0001` landed. It was renumbered to `0002` during integration; no content was
deleted.

## When to write one

When choosing a framework, transport/discovery mechanism, storage technology, security approach, module contract, or anything expensive to reverse.

## How to write one

Add a numbered Markdown file here (for example `0003-transport-choice.md`) with:

- **Decision** — what was chosen, in one sentence.
- **Context** — the problem and constraints (offline, cross-platform, hackathon timeline, etc.).
- **Alternatives considered** — other viable options and why they were rejected.
- **Reasoning** — why this option fits the project goals.
- **Consequences** — what becomes easier, harder, or must be handled (including platform limits).

Keep records short and factual. Superseded decisions get a new record that links to the old one rather than rewriting history.
