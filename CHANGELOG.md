# Changelog

All notable changes to Orbit Desktop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-08-28

### Features

- **Terminal emulator** — Embedded xterm.js terminal with PTY bridge to orbit CLI. Supports full ANSI color, resize, and scroll.
- **Session management** — Session list sidebar with live session titles, scope badges, and status indicators. Sessions persist between app restarts via orbitd IPC.
- **Plugin sidebar** — Displays plugins loaded in the current session. Opens plugin documentation on click.
- **Settings panel** — Engine selector, workspace configuration, and distribution controls.
- **CLI install wizard** — Auto-detects if orbit CLI is installed on startup. If not, opens a 3-step modal with installation options (`cargo install`, `brew`). Shows live installation output.
- **Update checker** — Checks GitHub releases for new CLI and desktop app versions on startup. Displays a badge on the Settings icon when updates are available.
- **Folder opener** — "Open in Orbit" button launches a native folder picker and opens the selected directory as a new session.
- **Clean Architecture + DDD** — Tauri State wired through port traits (`Arc<dyn Trait>`). TypeScript bindings auto-generated from Rust via ts-rs (`make gen-bindings`).
- **App icon and packaging** — Custom icon set for macOS (.icns) and Linux (.png). Release packaging scripts (`make package`).

[0.1.0]: https://github.com/tensiply/orbit-desktop/releases/tag/v0.1.0
