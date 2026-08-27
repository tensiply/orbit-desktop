INSTALL_DIR ?= $(HOME)/.local/bin
TARGET_DIR  := target/release

.PHONY: dev build install uninstall clean dev-local help

## Start dev mode with hot-reload (UI + Tauri backend)
dev:
	cd ui && npm install
	npx @tauri-apps/cli@2 dev

## Build production bundle
build:
	cd ui && npm install
	npx @tauri-apps/cli@2 build

## Install built binary to INSTALL_DIR (default: ~/.local/bin)
install: build
	@mkdir -p $(INSTALL_DIR)
	install -m 755 $(TARGET_DIR)/orbit-desktop $(INSTALL_DIR)/orbit-desktop
	@echo "Installed to $(INSTALL_DIR)/orbit-desktop"

## Remove installed binary
uninstall:
	rm -f $(INSTALL_DIR)/orbit-desktop
	@echo "Removed $(INSTALL_DIR)/orbit-desktop"

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

## Show this help
help:
	@grep -E '^## ' Makefile | sed 's/^## //'
