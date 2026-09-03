INSTALL_DIR ?= $(HOME)/.local/bin
TARGET_DIR  := target/release
SRC_TAURI   := src-tauri
ICONS_DIR   := src-tauri/icons

.PHONY: dev build bundle install uninstall clean dev-local icons windows-assets flatpak snap help

## Start dev mode with hot-reload (UI + Tauri backend) — runs as "Orbit Dev" with separate data dir
dev:
	cd ui && npm install
	npx @tauri-apps/cli@2 dev --config src-tauri/tauri.dev.conf.json --features dev

## Build binary only (no deb/rpm/appimage)
build:
	cd ui && npm install
	npx @tauri-apps/cli@2 build --no-bundle

## Build distribution packages (deb, rpm, AppImage) — requires internet access for AppImage tools
bundle:
	cd ui && npm install
	npx @tauri-apps/cli@2 build

## Install binary + desktop entry + icons (app appears in launcher)
install: build
	@mkdir -p $(INSTALL_DIR)
	install -m 755 $(TARGET_DIR)/orbit-desktop $(INSTALL_DIR)/orbit-desktop
	@mkdir -p $(HOME)/.local/share/applications
	install -m 644 packaging/linux/com.tensiply.orbit-desktop.desktop $(HOME)/.local/share/applications/com.tensiply.orbit-desktop.desktop
	@mkdir -p $(HOME)/.local/share/icons/hicolor/128x128/apps
	@mkdir -p $(HOME)/.local/share/icons/hicolor/256x256/apps
	@mkdir -p $(HOME)/.local/share/icons/hicolor/512x512/apps
	install -m 644 $(ICONS_DIR)/128x128.png $(HOME)/.local/share/icons/hicolor/128x128/apps/com.tensiply.orbit-desktop.png
	install -m 644 $(ICONS_DIR)/256x256.png $(HOME)/.local/share/icons/hicolor/256x256/apps/com.tensiply.orbit-desktop.png
	install -m 644 $(ICONS_DIR)/512x512.png $(HOME)/.local/share/icons/hicolor/512x512/apps/com.tensiply.orbit-desktop.png
	@update-desktop-database $(HOME)/.local/share/applications 2>/dev/null || true
	@gtk-update-icon-cache -f -t $(HOME)/.local/share/icons/hicolor 2>/dev/null || true
	@echo "Installed — Orbit should now appear in your app launcher"

## Remove binary, desktop entry, and icons
uninstall:
	rm -f $(INSTALL_DIR)/orbit-desktop
	rm -f $(HOME)/.local/share/applications/com.tensiply.orbit-desktop.desktop
	rm -f $(HOME)/.local/share/icons/hicolor/128x128/apps/com.tensiply.orbit-desktop.png
	rm -f $(HOME)/.local/share/icons/hicolor/256x256/apps/com.tensiply.orbit-desktop.png
	rm -f $(HOME)/.local/share/icons/hicolor/512x512/apps/com.tensiply.orbit-desktop.png
	@update-desktop-database $(HOME)/.local/share/applications 2>/dev/null || true
	@echo "Uninstalled"

## Generate TypeScript bindings from Rust types (ts-rs) — output: ui/src/bindings/
gen-bindings:
	@mkdir -p ui/src/bindings
	TS_RS_EXPORT_DIR=$(CURDIR)/ui/src/bindings cargo test 'export_' --manifest-path src-tauri/Cargo.toml

## Remove build artifacts and UI cache
clean:
	cargo clean
	rm -rf ui/node_modules ui/dist

## Set up local dev override to use orbit/ via path deps instead of git deps
## Requires orbit/ and orbit-desktop/ to be siblings in the same parent directory
dev-local:
	cp .cargo/config.toml.dev .cargo/config.toml
	@echo "config.toml set — cargo will now use ../orbit/* path deps"
	@echo "To revert: rm .cargo/config.toml"

## Regenerate all icon sizes from assets/orbit-logo.svg (requires Python + Pillow)
icons:
	python3 scripts/gen-icons.py

## Regenerate Windows installer images (NSIS header/sidebar BMPs)
windows-assets:
	python3 scripts/gen-windows-assets.py

## Build Flatpak bundle (requires flatpak-builder)
flatpak:
	flatpak-builder --force-clean build-flatpak packaging/linux/com.tensiply.orbit-desktop.flatpak.yml
	flatpak build-bundle $(HOME)/.local/share/flatpak/repo orbit-desktop.flatpak com.tensiply.orbit-desktop

## Build Snap (requires snapcraft + LXD/multipass)
snap:
	snapcraft --use-lxd

## Show this help
help:
	@grep -E '^## ' Makefile | sed 's/^## //'
