//! Host-tool checks for orbit's file-generation pipelines.
//!
//! Document/image generation shells out to external tools that are NOT bundled with the
//! app: WeasyPrint (PDF), Pandoc (DOCX), and Chrome/Chromium (template images). The setup
//! wizard surfaces these so a user knows, before generating, which formats will work and
//! how to install what's missing. This is read-only: we probe, we never install.

use serde::Serialize;
use tokio::process::Command;

// ── Types ────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct DepStatus {
    /// Stable identifier for the frontend (e.g. `"weasyprint"`).
    pub key: String,
    /// Human label shown in the UI.
    pub label: String,
    /// Whether the tool was found on the host.
    pub found: bool,
    /// First line of the tool's `--version` output when found.
    pub version: Option<String>,
    /// Install guidance, shown when the tool is missing.
    pub hint: String,
    /// Generation features this tool unlocks.
    pub features: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct DepsReport {
    pub deps: Vec<DepStatus>,
}

// ── Probing ──────────────────────────────────────────────────────────────────────

/// Chrome/Chromium binaries to try, in order. Mirrors the candidate list in
/// `orbit-core::image::find_chrome`; kept local so the desktop check has no extra coupling
/// to orbit-core internals.
const CHROME_CANDIDATES: &[&str] = &[
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
];

/// Run `<program> <arg>` and return the first non-empty output line on success.
async fn probe(program: &str, arg: &str) -> Option<String> {
    let out = Command::new(program).arg(arg).output().await.ok()?;
    if !out.status.success() {
        return None;
    }
    String::from_utf8_lossy(&out.stdout)
        .lines()
        .map(|l| l.trim().to_string())
        .find(|l| !l.is_empty())
}

// ── Command ──────────────────────────────────────────────────────────────────────

/// Check the host tools that orbit's document/image generation depends on.
#[tauri::command]
pub async fn deps_check() -> Result<DepsReport, String> {
    let weasyprint = probe("weasyprint", "--version").await;
    let pandoc = probe("pandoc", "--version").await;

    let mut chrome = None;
    for candidate in CHROME_CANDIDATES {
        if let Some(version) = probe(candidate, "--version").await {
            chrome = Some(version);
            break;
        }
    }

    let deps = vec![
        DepStatus {
            key: "weasyprint".into(),
            label: "WeasyPrint".into(),
            found: weasyprint.is_some(),
            version: weasyprint,
            hint: "Needed for PDF documents. Install with `pip install weasyprint` (see weasyprint.org for system libs).".into(),
            features: vec!["PDF documents".into()],
        },
        DepStatus {
            key: "pandoc".into(),
            label: "Pandoc".into(),
            found: pandoc.is_some(),
            version: pandoc,
            hint: "Needed for DOCX documents. Install from pandoc.org/installing.".into(),
            features: vec!["DOCX documents".into()],
        },
        DepStatus {
            key: "chrome".into(),
            label: "Chrome / Chromium".into(),
            found: chrome.is_some(),
            version: chrome,
            hint: "Needed for template-based images (HTML → PNG/JPEG/WEBP). Install Google Chrome or Chromium.".into(),
            features: vec!["Template images".into()],
        },
    ];

    Ok(DepsReport { deps })
}
