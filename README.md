# orbit-desktop

Desktop app for [Tensiply Orbit](https://github.com/tensiply/orbit) — terminal emulator + session management UI.

Built with Tauri 2 + React + TypeScript.

## Prerequisites

- [Rust](https://rustup.rs/) 1.70+
- [Node.js](https://nodejs.org/) 20+
- System libs for Tauri: `webkit2gtk` (Linux), `Xcode` (macOS)
- `orbit` daemon running (`orbit daemon start` or via `orbit launch`)

## Quick start

```bash
# Dev mode (hot-reload)
make dev

# Production build
make build

# Install binary to ~/.local/bin
make install
```

## Local development with orbit source

If you're working on both `orbit` and `orbit-desktop` simultaneously:

```bash
# One-time setup: override git deps with local path deps
make dev-local

# orbit/ and orbit-desktop/ must be siblings:
# ~/path/
# ├── orbit/
# └── orbit-desktop/
```

This copies `.cargo/config.toml.dev` to `.cargo/config.toml` (which is gitignored).
Revert with `rm .cargo/config.toml`.

## Makefile targets

| Target | Description |
|---|---|
| `make dev` | Dev mode with hot-reload |
| `make build` | Production bundle |
| `make install` | Install to `~/.local/bin` |
| `make uninstall` | Remove installed binary |
| `make clean` | Remove build artifacts |
| `make dev-local` | Enable path deps for local orbit dev |

## Architecture

```
orbit-desktop/
├── src-tauri/          # Rust backend (Tauri 2)
│   └── src/
│       ├── scopes.rs   # scope tree
│       ├── sessions.rs # session titles
│       ├── documents.rs
│       └── pty.rs      # PTY terminal
└── ui/                 # React + TypeScript frontend
    └── src/
        ├── components/
        ├── store/      # Zustand state
        └── views/
```

The desktop embeds the orbit CLI in a PTY terminal and connects to `orbitd` (the orbit daemon) via IPC for live session data.
