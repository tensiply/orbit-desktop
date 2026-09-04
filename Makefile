INSTALL_DIR ?= $(HOME)/.local/bin
TARGET_DIR  := target/release
DEV_TARGET  := target-dev
DEV_LINK    := dev-orbit-desktop
CANARY_TARGET := target-canary
CANARY_LINK   := canary-orbit-desktop
SRC_TAURI   := src-tauri
ICONS_DIR   := src-tauri/icons

.PHONY: dev check-dev-orbit build bundle fetch-orbit sync-orbit-cli install uninstall dev-build dev-install dev-uninstall canary-build canary-install canary-uninstall clean dev-local icons windows-assets flatpak snap help

## Fail early if dev-orbit is missing — the dev app spawns it to start the daemon
check-dev-orbit:
	@command -v dev-orbit >/dev/null 2>&1 || { \
	  echo "error: dev-orbit not found on PATH."; \
	  echo "  The dev app starts its daemon via 'dev-orbit'. Install it first:"; \
	  echo "    cd ../orbit && make dev-install"; \
	  exit 1; \
	}

## Start dev mode with hot-reload (UI + Tauri backend) — "Orbit Desktop Dev", isolated ~/.orbit-dev daemon
dev: check-dev-orbit
	cd ui && npm install
	npx @tauri-apps/cli@2 dev --config src-tauri/tauri.dev.conf.json --features dev

## Build binary only (no deb/rpm/appimage)
build:
	cd ui && npm install
	npx @tauri-apps/cli@2 build --no-bundle

## Build a standalone dev binary ("Orbit Desktop Dev") into a separate target dir
## so it never overwrites the stable build at target/release/orbit-desktop.
dev-build:
	cd ui && npm install
	CARGO_TARGET_DIR=$(CURDIR)/$(DEV_TARGET) npx @tauri-apps/cli@2 build --no-bundle --features dev -c src-tauri/tauri.dev.conf.json

## Symlink dev-orbit-desktop -> local dev build. Uses the dev-orbit CLI against
## the isolated ~/.orbit-dev daemon. Rebuild with `make dev-build` to update.
dev-install: check-dev-orbit dev-build
	@mkdir -p $(INSTALL_DIR)
	ln -sf $(CURDIR)/$(DEV_TARGET)/release/orbit-desktop $(INSTALL_DIR)/$(DEV_LINK)
	@echo "Linked $(INSTALL_DIR)/$(DEV_LINK) -> $(CURDIR)/$(DEV_TARGET)/release/orbit-desktop"

## Remove the dev symlink
dev-uninstall:
	rm -f $(INSTALL_DIR)/$(DEV_LINK)
	@echo "Removed $(INSTALL_DIR)/$(DEV_LINK)"

## Check the orbit-canary CLI is present — the canary app spawns it for its daemon
check-canary-orbit:
	@command -v orbit-canary >/dev/null 2>&1 || { \
	  echo "error: orbit-canary not found on PATH."; \
	  echo "  The canary app starts its daemon via 'orbit-canary'. Install it first:"; \
	  echo "    cd ../orbit && make canary-install"; \
	  exit 1; \
	}

## Build a standalone canary binary ("Orbit Desktop CANARY") into a separate
## target dir so it never overwrites the stable or dev builds.
canary-build:
	cd ui && npm install
	CARGO_TARGET_DIR=$(CURDIR)/$(CANARY_TARGET) npx @tauri-apps/cli@2 build --no-bundle --features canary -c src-tauri/tauri.canary.conf.json

## Symlink canary-orbit-desktop -> local canary build. Uses the orbit-canary CLI
## against the isolated ~/.orbit-canary daemon. Rebuild with `make canary-build`.
canary-install: check-canary-orbit canary-build
	@mkdir -p $(INSTALL_DIR)
	ln -sf $(CURDIR)/$(CANARY_TARGET)/release/orbit-desktop $(INSTALL_DIR)/$(CANARY_LINK)
	@echo "Linked $(INSTALL_DIR)/$(CANARY_LINK) -> $(CURDIR)/$(CANARY_TARGET)/release/orbit-desktop"

## Remove the canary symlink
canary-uninstall:
	rm -f $(INSTALL_DIR)/$(CANARY_LINK)
	@echo "Removed $(INSTALL_DIR)/$(CANARY_LINK)"

## Pin ORBIT_CLI_VERSION to the latest orbit CLI release (default) or ORBIT_VER=vX.Y.Z
sync-orbit-cli:
	@VER="$(ORBIT_VER)"; \
	if [ -z "$$VER" ]; then VER=$$(gh api repos/tensiply/orbit/releases/latest -q .tag_name); fi; \
	if [ -z "$$VER" ]; then echo "could not resolve orbit CLI version"; exit 1; fi; \
	echo "$$VER" > ORBIT_CLI_VERSION; \
	echo "Pinned bundled orbit CLI to $$VER"

## Fetch the pinned orbit CLI (ORBIT_CLI_VERSION) as the bundle sidecar for the host
fetch-orbit:
	@mkdir -p src-tauri/binaries
	@ORBIT_VER=$$(cat ORBIT_CLI_VERSION); \
	TRIPLE=$$(rustc -vV | sed -n 's/host: //p'); \
	case "$$TRIPLE" in \
	  x86_64-*-linux-*)      ASSET=orbit-linux-x86_64 ;; \
	  aarch64-*-linux-*)     ASSET=orbit-linux-aarch64 ;; \
	  x86_64-apple-darwin)   ASSET=orbit-macos-x86_64 ;; \
	  aarch64-apple-darwin)  ASSET=orbit-macos-aarch64 ;; \
	  *) echo "unsupported host triple: $$TRIPLE"; exit 1 ;; \
	esac; \
	echo "Fetching orbit $$ORBIT_VER ($$ASSET) -> src-tauri/binaries/orbit-$$TRIPLE"; \
	gh release download "$$ORBIT_VER" --repo tensiply/orbit --pattern "$$ASSET" \
	  --output "src-tauri/binaries/orbit-$$TRIPLE" --clobber; \
	chmod +x "src-tauri/binaries/orbit-$$TRIPLE"

## Build distribution packages (deb, AppImage) with the bundled orbit sidecar
bundle: fetch-orbit
	cd ui && npm install
	npx @tauri-apps/cli@2 build -c src-tauri/tauri.bundle.conf.json

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
