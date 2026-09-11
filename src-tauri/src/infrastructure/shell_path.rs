//! Login-shell PATH resolution for GUI launches.
//!
//! When the app is started from a desktop shortcut, it inherits the graphical
//! session's PATH — which lacks whatever the user adds in their shell rc files
//! (linuxbrew, nvm, gvm, bun, …). The daemon we spawn then can't find engine
//! binaries like `claude`. We resolve the login shell's real PATH once at
//! startup and merge it in, the same trick editors like VSCode use.

/// Prepend the login shell's PATH to the current one (deduped). Best-effort:
/// on any failure the PATH is left untouched. No-op outside Unix.
pub fn hydrate_path() {
    #[cfg(unix)]
    {
        let Some(shell_path) = login_shell_path() else {
            return;
        };
        let current = std::env::var("PATH").unwrap_or_default();
        let merged = merge_paths(&shell_path, &current);
        if merged != current {
            std::env::set_var("PATH", merged);
        }
    }
}

/// Run the user's login+interactive shell and capture its `$PATH`. The value is
/// delimited by a marker so unrelated rc output (prompts, banners) is ignored.
#[cfg(unix)]
fn login_shell_path() -> Option<String> {
    const MARK: &str = "__ORBIT_PATH__";
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into());
    let script = format!("printf '%s%s%s' '{MARK}' \"$PATH\" '{MARK}'");

    let output = std::process::Command::new(&shell)
        // login + interactive so both `.zprofile`/`.profile` and `.zshrc`/`.bashrc`
        // load — that is where linuxbrew, nvm, etc. extend PATH.
        .args(["-l", "-i", "-c", &script])
        .stdin(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .output()
        .ok()?;

    let text = String::from_utf8_lossy(&output.stdout);
    let start = text.find(MARK)? + MARK.len();
    let rest = &text[start..];
    let end = rest.find(MARK)?;
    let path = rest[..end].trim();
    (!path.is_empty()).then(|| path.to_string())
}

/// Join `front` then `back`, dropping empty and duplicate entries while keeping
/// first-seen order (so the login shell's entries win).
#[cfg(unix)]
fn merge_paths(front: &str, back: &str) -> String {
    let mut seen = std::collections::HashSet::new();
    front
        .split(':')
        .chain(back.split(':'))
        .filter(|e| !e.is_empty() && seen.insert(e.to_string()))
        .collect::<Vec<_>>()
        .join(":")
}

#[cfg(all(test, unix))]
mod tests {
    use super::merge_paths;

    #[test]
    fn merge_dedups_and_prefers_front() {
        assert_eq!(
            merge_paths("/brew/bin:/usr/bin", "/usr/bin:/snap/bin"),
            "/brew/bin:/usr/bin:/snap/bin"
        );
    }

    #[test]
    fn merge_drops_empty_entries() {
        assert_eq!(merge_paths("/a::/b", ":/a:"), "/a:/b");
    }
}
