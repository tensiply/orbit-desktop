# Windows Distribution

## Build targets

Tauri generates two Windows installers:
- **NSIS** (`.exe`) — recommended for direct download; lightweight, no admin required with `currentUser` mode
- **WiX** (`.msi`) — for enterprise deployment / Group Policy / Microsoft Store

```bash
# From project root (requires Windows or cross-compilation setup)
cargo tauri build

# Outputs:
#   src-tauri/target/release/bundle/nsis/Orbit_0.1.0_x64-setup.exe
#   src-tauri/target/release/bundle/msi/Orbit_0.1.0_x64_en-US.msi
```

## Cross-compilation from Linux/macOS

Tauri Windows bundles require Windows to build NSIS/WiX. Use a CI runner or a Windows VM.

Recommended: GitHub Actions with `windows-latest` runner.

```yaml
# .github/workflows/release.yml (excerpt)
- name: Build Windows
  runs-on: windows-latest
  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
    - uses: actions/setup-node@v4
    - run: make bundle
```

## Code signing (required for SmartScreen bypass)

Without a code signing certificate, Windows SmartScreen shows a warning on first run.

Options:
1. **OV/EV certificate** from DigiCert, Sectigo, or similar (~$200–$500/year)
2. **Azure Trusted Signing** — Microsoft's managed signing service, cheaper for open source
3. **Self-signed** (development only)

Set environment variables before building:

```bash
# DigiCert / Sectigo approach
export TAURI_SIGNING_PRIVATE_KEY="path/to/private.key"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="..."

# Or via Azure Trusted Signing (recommended for CI)
export AZURE_CLIENT_ID="..."
export AZURE_CLIENT_SECRET="..."
export AZURE_TENANT_ID="..."
```

Update `tauri.conf.json`:
```json
"windows": {
  "certificateThumbprint": "YOUR_CERT_THUMBPRINT",
  "digestAlgorithm": "sha256",
  "timestampUrl": "http://timestamp.digicert.com"
}
```

## Microsoft Store (MSIX)

Microsoft Store distribution requires:
1. Microsoft Partner Center account (free)
2. App submission with MSIX package
3. Publisher identity must match the Partner Center account

Tauri generates MSIX with: `cargo tauri build --bundles msix`

The `identifier` in `tauri.conf.json` (`dev.tensiply.orbit`) must match the Partner Center app identity.

## NSIS installer customization

| File | Size | Purpose |
|------|------|---------|
| `nsis-header.bmp` | 150×57 | Header image on installer pages |
| `nsis-sidebar.bmp` | 164×314 | Left sidebar on Welcome/Finish pages |

Regenerate from source when the logo changes:
```bash
python3 scripts/gen-icons.py          # regenerates icons
python3 scripts/gen-windows-assets.py # regenerates NSIS BMPs
```
