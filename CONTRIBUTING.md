# Contributing to Orbit Desktop

Thank you for your interest in contributing to Orbit Desktop. This document
covers everything you need to get started.

## Before You Contribute

### Contributor License Agreement (CLA)

All contributions require a signed CLA. Read [CLA.md](CLA.md) and sign it
by leaving the required comment on your pull request. Unsigned PRs will not
be merged.

### Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
By participating, you agree to abide by its terms.

---

## Getting Started

### Prerequisites

- Rust (latest stable — see [rustup.rs](https://rustup.rs))
- Node.js 20+ and `pnpm`
- Tauri CLI: `cargo install tauri-cli`
- Platform-specific dependencies listed in the
  [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)

### Setup

```bash
git clone https://github.com/tensiply/orbit-desktop.git
cd orbit-desktop
pnpm install
cargo tauri dev
```

### Running tests

```bash
# Rust tests
cargo test --all

# UI tests (from ui/ directory)
pnpm test
```

### Formatting and linting

```bash
# Rust
cargo fmt --all
cargo clippy --all -- -D warnings

# TypeScript
pnpm lint
pnpm typecheck
```

All CI gates must pass before a PR can be merged.

---

## How to Contribute

### Reporting bugs

Search [existing issues](../../issues) first. If none match, open a new one
using the **Bug Report** template. Include your OS, architecture, and the
version of Orbit Desktop you are running.

### Suggesting features

Open a [Feature Request](../../issues/new?template=feature_request.yml) with
context, motivation, and a rough description of the desired behavior.

### Submitting a pull request

1. Fork the repository and create a branch from `main`.
2. Make your changes. Keep PRs focused — one change per PR.
3. Ensure all CI gates pass locally before opening the PR.
4. Open the PR and sign the CLA in a comment (see [CLA.md](CLA.md)).
5. Describe your changes clearly in the PR description.

---

## Commit Style

This project uses [Conventional Commits](https://www.conventionalcommits.org):

```
feat(ui): add scope selector sidebar
fix(tauri): resolve IPC timeout on slow systems
chore(deps): bump tauri to 2.x
```

---

## Questions

Open a [Discussion](../../discussions) or reach out at
[orbit@tensiply.com](mailto:orbit@tensiply.com).
