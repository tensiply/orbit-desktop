# Windows Distribution

## Build targets

Tauri generates two Windows installers (selected by `src-tauri/tauri.windows.conf.json`,
which overlays `bundle.targets: ["nsis", "msi"]`):
- **NSIS** (`.exe`) — recommended for direct download; lightweight, no admin required with `currentUser` mode
- **WiX** (`.msi`) — for enterprise deployment / Group Policy / Microsoft Store

WebView2 is provided via Tauri's default `downloadBootstrapper` install mode, embedded
in both installers.

```bash
# On Windows, from the project root:
make bundle          # fetches the orbit.exe sidecar, then builds NSIS + MSI

# Raw Tauri outputs (before CI homologation):
#   src-tauri/target/release/bundle/nsis/Orbit Desktop_<ver>_x64-setup.exe
#   src-tauri/target/release/bundle/msi/Orbit Desktop_<ver>_x64_en-US.msi
```

## CI flow

`release.yml` (stable) and `canary.yml` (every push to main) both carry a
`windows-latest` matrix entry that:
1. fetches the bundled `orbit.exe` sidecar (`orbit-<channel>-<ver>-windows-x86_64.exe`)
   from the `tensiply/orbit` release into `src-tauri/binaries/orbit-x86_64-pc-windows-msvc.exe`,
2. builds the app with the `tauri.windows.conf.json` overlay (NSIS + MSI), and
3. homologates the artifacts to `orbit-desktop-<channel>-<ver>-x86_64.{exe,msi}`
   (see `.github/scripts/homologate_asset.py`; Tauri's `x64` arch token maps to `x86_64`).

The Windows job is currently `experimental: true` (non-blocking) because it depends on
`ORBIT_CLI_VERSION` pointing at an orbit release that publishes a `windows-x86_64` sidecar.
Drop `experimental` once that sidecar exists, mirroring how orbit promoted its own Windows
build to a required gate.

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

The `identifier` in `tauri.conf.json` (`com.tensiply.orbit-desktop`) must match the Partner Center app identity.

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
