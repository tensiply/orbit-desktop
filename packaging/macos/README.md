# macOS Distribution

## Signing and Notarization

To distribute Orbit on macOS (DMG, App Store, or direct download), signing is required.

### Requirements

- Apple Developer account
- Developer ID Application certificate (for DMG / direct distribution)
- Apple Distribution certificate (for Mac App Store)
- App-specific password for notarization

### Build signed DMG

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Tensiply Inc (XXXXXXXXXX)"
export APPLE_CERTIFICATE_PASSWORD="..."
export APPLE_ID="eloir@eloirnet.com"
export APPLE_TEAM_ID="XXXXXXXXXX"
export APPLE_PASSWORD="app-specific-password"

cargo tauri build --target aarch64-apple-darwin  # M-series
cargo tauri build --target x86_64-apple-darwin   # Intel
```

### Universal binary (fat binary)

```bash
cargo tauri build --target universal-apple-darwin
```

### Notarization

Tauri handles notarization automatically when `APPLE_ID`, `APPLE_TEAM_ID`, and `APPLE_PASSWORD` are set.

### Entitlements

`Entitlements.plist` contains the minimum required entitlements. Reference it in tauri.conf.json:

```json
"macOS": {
  "entitlements": "../packaging/macos/Entitlements.plist",
  "signingIdentity": "Developer ID Application: Tensiply Inc (XXXXXXXXXX)"
}
```

## App Store

Mac App Store distribution requires a separate target and more restrictive entitlements (no `com.apple.security.cs.*`). This is deferred until after initial release.
