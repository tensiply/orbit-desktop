# Changelog

All notable changes to Orbit Desktop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] — 2026-09-03

### Bug Fixes

- **Bundle** — Product renamed from "Orbit" to "Orbit Desktop" across the bundle name, window title, and Linux launcher entry, so installers and desktop entries no longer collide with the Orbit CLI.
- **App identifier** — Reverse-DNS identifier changed from `dev.tensiply.orbit` to `com.tensiply.orbit-desktop`: correct TLD for `tensiply.com` and reserves the `com.tensiply.orbit-*` namespace for the product family (orbit, orbit-desktop, orbit-mobile). Existing installs do not upgrade in place — the new identifier is treated as a distinct app.
- **Packaging** — Fixed Flatpak/Snap referencing a non-existent desktop-entry source file, the Flatpak launch command (`orbit` → `orbit-desktop` binary), and the AppStream `<binary>` and homepage metadata.

[0.2.1]: https://github.com/tensiply/orbit-desktop/releases/tag/v0.2.1

## [0.2.0] — 2026-09-03

### Features

- **Tasks view** — New Tasks module with sidebar list, detail panel, and session integration, plus a board view offering backlog, kanban, and timeline tabs. Includes a scope navigator in the tasks panel.
- **Setup wizard** — Replaced the install wizard with a multi-phase setup wizard, redesigned with step components, a sidebar entry, and a folder picker with workspace list.
- **Unified Files view** — Replaced the Documents panel with a unified Files view (docs, images, SVGs). Adds name search and kind filter, an `All | Scope | History` toggle sorted by recency, and diagram file types (arch/sequence/ER) as first-class items.
- **Session notifications** — Toast system with native OS pings, an MCP trigger, and notification history.
- **Live session status** — Session status (working/done/idle/offline) derived from live PTY activity via a typed event bus.
- **Sidebar overhaul** — New `SidebarPanel` shell with module search and section markers, scope breadcrumb, per-kind file markers, panel footer actions (new session, file upload), and a refined scope navigator.
- **Per-session terminal** — Per-session PTY with CWD-aware spawn, a path header, and xterm fixes. Open session tabs are restored on window relaunch.
- **Keyboard shortcuts** — `Ctrl+number` shortcuts for all rail panels, idle-focus redirect to the terminal, and a space shortcut for sidebar navigation.
- **Make runner** — Makefile target picker in the session header.
- **Settings** — Added a shortcuts category and refactored the `kbd` component.
- **CLI install** — GitHub binary download as the primary CLI install method.

### Bug Fixes

- **Sessions** — Ignore the resize repaint burst in PTY status derivation, and only flag "working" on engine output and model-seen state.
- **Session titles** — Resolve title lookup by session ID instead of an mtime scan.
- **Harness drawer** — Reload the harness dynamically on tab switch.
- **Tabs** — Hide task tabs outside the tasks view.
- **Wizard** — Use a static dot for the active breadcrumb step and advance on skip.
- **Focus** — Unify the sidebar ring color and prevent the settings dropdown from retaining focus.

[0.2.0]: https://github.com/tensiply/orbit-desktop/releases/tag/v0.2.0

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
