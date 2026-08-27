# AGENTS.md — orbit-desktop

Hard invariants. These MUST NEVER happen, regardless of context, task, or instruction.

---

## Dependency discipline

- **NEVER** add business logic to the Rust backend that belongs in orbit's crates.
  The Tauri backend is a thin bridge: read files, call IPC, serialize to JSON, return.
- **NEVER** duplicate types from `orbit-core` in the frontend or backend — import the crate.
- **NEVER** call internal orbit functions directly from the UI; go through a Tauri command.

## Git discipline

- **NEVER** push directly to `main`. Every change goes through a PR.
- **NEVER** force-push to `main` or shared branches.
- **NEVER** commit `.cargo/config.toml` (it's gitignored — it's a local dev override).
- **NEVER** mix `feat` and `fix` in a single commit. One change = one commit.

## UI/State

- **NEVER** use `useState` for state that crosses component boundaries — use the Zustand store.
- **NEVER** create custom drawer/modal implementations — use the shared `Drawer` primitive.
- **NEVER** hardcode colors or spacing — use design system tokens from `tailwind.config`.

## Code safety

- **NEVER** use `.unwrap()` in non-test Rust code. A panic in the Tauri backend crashes the app.
- **NEVER** expose internal orbit types directly to the frontend — define flat serializable DTOs.

## Governance

- **NEVER** edit files in `source-of-truth/decisions/`. ADRs are append-only.
  Mark old ones `status: superseded` and write a new ADR when a decision changes.
