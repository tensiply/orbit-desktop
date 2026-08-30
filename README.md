# orbit-desktop

Desktop app for [Orbit](https://github.com/tensiply/orbit) — runs the orbit CLI in an embedded terminal with a native session management UI.

Built with Tauri 2 + React + TypeScript. Runs on Linux, macOS, and Windows.

**Latest:** [v0.1.0](https://github.com/tensiply/orbit-desktop/releases/tag/v0.1.0) · [Changelog](CHANGELOG.md)

---

## What it does

orbit-desktop wraps the orbit CLI in a native window and adds a graphical layer on top: a full terminal emulator (xterm.js + PTY), session tabs with live scope badges, a plugin sidebar, and update notifications — all wired to `orbitd` via IPC for live session data.

You get the full orbit CLI experience without leaving a terminal open. Sessions persist between app restarts; the embedded terminal behaves exactly like a real terminal.

---

## Install

Download the package for your platform from [GitHub Releases](https://github.com/tensiply/orbit-desktop/releases/latest):

| Platform | Package |
|---|---|
| Linux | `.deb`, `.rpm`, `.AppImage`, Flatpak, Snap |
| macOS | `.dmg` (Apple Silicon / Intel) |
| Windows | `.msi` (NSIS installer) |

Or build from source (see below).

Requires `orbit` to be installed and accessible in `$PATH`. If it isn't, the app opens an install wizard on first launch.

---

## Build from source

```bash
git clone https://github.com/tensiply/orbit-desktop.git
cd orbit-desktop
make build       # binary only
make install     # build + install to ~/.local/bin + desktop entry (Linux)
make bundle      # build distribution packages (deb, rpm, AppImage)
```

Requires:
- Rust 1.70+
- Node.js 20+
- System libs: `webkit2gtk` (Linux) or Xcode command-line tools (macOS)

### All Makefile targets

| Target | Description |
|---|---|
| `make dev` | Dev mode with hot-reload |
| `make build` | Build binary only |
| `make bundle` | Build distribution packages |
| `make install` | Build + install to `~/.local/bin` with desktop entry |
| `make uninstall` | Remove installed binary and desktop entry |
| `make clean` | Remove build artifacts |
| `make gen-bindings` | Regenerate TypeScript bindings from Rust types (ts-rs) |
| `make icons` | Regenerate icon sizes from `assets/orbit-logo.svg` |
| `make flatpak` | Build Flatpak bundle |
| `make snap` | Build Snap |

---

## Local development with orbit source

If you're working on both `orbit` and `orbit-desktop` at the same time:

```bash
# orbit/ and orbit-desktop/ must be siblings:
# ~/path/
# ├── orbit/
# └── orbit-desktop/

make dev-local   # override git deps with local path deps
make dev         # hot-reload dev mode
```

Revert with `rm .cargo/config.toml`.

---

## Architecture

```
orbit-desktop/
├── src-tauri/          # Rust backend (Tauri 2)
│   └── src/
│       ├── pty.rs          # PTY terminal bridge
│       ├── sessions.rs     # session titles via orbitd IPC
│       ├── scopes.rs       # scope tree
│       ├── workspaces.rs   # workspace resolution
│       ├── documents.rs    # document pipeline
│       ├── plugins.rs      # plugin list
│       └── updates.rs      # GitHub release checker
└── ui/                 # React + TypeScript frontend
    └── src/
        ├── components/     # Terminal, Sidebar, TabBar, SettingsMenu, ...
        ├── domain/         # Domain types
        ├── store/          # Zustand state
        └── infrastructure/ # Tauri IPC adapters
```

The Rust backend exposes port traits (`Arc<dyn Trait>`) wired through Tauri State. TypeScript bindings are auto-generated from Rust types via ts-rs — run `make gen-bindings` after changing Rust types.
