use orbit_core::data_paths::slugify;
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::pipelines::resolve_ai_root;

// ── types ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct NoteInfo {
    /// Filename stem (slug) — stable identity of the note.
    pub id: String,
    pub title: String,
    /// First ~200 chars of the body, collapsed to a single line.
    pub preview: String,
    pub path: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct NoteContent {
    pub id: String,
    pub title: String,
    pub body: String,
    pub path: String,
    pub created_at: u64,
    pub updated_at: u64,
}

// ── helpers ──────────────────────────────────────────────────────────────────

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// `source-of-truth/notes/` directory for a scope under the workspace's `ai_root`.
/// Empty tenant/project/repository collapse to the next-outer level (workspace root).
fn sot_notes_dir(ai_root: &Path, tenant: &str, project: &str, repository: &str) -> PathBuf {
    let mut base = ai_root.to_path_buf();
    if !tenant.is_empty() {
        base = base.join("tenants").join(tenant);
        if !project.is_empty() {
            base = base.join("projects").join(project);
            if !repository.is_empty() {
                base = base.join("repositories").join(repository);
            }
        }
    }
    base.join("source-of-truth").join("notes")
}

/// Collapse a body to a single-line preview of at most ~200 chars.
fn make_preview(body: &str) -> String {
    let collapsed = body.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut preview: String = collapsed.chars().take(200).collect();
    if collapsed.chars().count() > 200 {
        preview.push('…');
    }
    preview
}

/// Serialize a note to its on-disk Markdown form (frontmatter + body).
fn render_note(title: &str, created: u64, updated: u64, body: &str) -> String {
    format!("---\ntitle: {title}\ncreated: {created}\nupdated: {updated}\n---\n\n{body}")
}

struct ParsedNote {
    title: String,
    created: u64,
    updated: u64,
    body: String,
}

/// Parse a note file. Missing frontmatter → whole file is the body with empty metadata.
fn parse_note(text: &str) -> ParsedNote {
    let mut title = String::new();
    let mut created = 0u64;
    let mut updated = 0u64;

    if let Some(rest) = text.strip_prefix("---\n") {
        if let Some(end) = rest.find("\n---\n") {
            let header = &rest[..end];
            let body = &rest[end + 5..];
            for line in header.lines() {
                if let Some((key, value)) = line.split_once(':') {
                    let value = value.trim();
                    match key.trim() {
                        "title" => title = value.to_string(),
                        "created" => created = value.parse().unwrap_or(0),
                        "updated" => updated = value.parse().unwrap_or(0),
                        _ => {}
                    }
                }
            }
            return ParsedNote {
                title,
                created,
                updated,
                body: body.strip_prefix('\n').unwrap_or(body).to_string(),
            };
        }
    }

    ParsedNote {
        title,
        created,
        updated,
        body: text.to_string(),
    }
}

/// Pick a unique `<slug>.md` filename in `dir`, suffixing `-2`, `-3`, … on collision.
fn unique_stem(dir: &Path, slug: &str) -> String {
    let slug = if slug.is_empty() { "untitled" } else { slug };
    if !dir.join(format!("{slug}.md")).exists() {
        return slug.to_string();
    }
    let mut n = 2;
    loop {
        let candidate = format!("{slug}-{n}");
        if !dir.join(format!("{candidate}.md")).exists() {
            return candidate;
        }
        n += 1;
    }
}

fn note_info_from(path: &Path, parsed: &ParsedNote) -> NoteInfo {
    NoteInfo {
        id: path
            .file_stem()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_default(),
        title: parsed.title.clone(),
        preview: make_preview(&parsed.body),
        path: path.to_string_lossy().into_owned(),
        created_at: parsed.created,
        updated_at: parsed.updated,
    }
}

// ── commands ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn notes_list(
    workspace: Option<String>,
    tenant: Option<String>,
    project: Option<String>,
    repository: Option<String>,
) -> Result<Vec<NoteInfo>, String> {
    let ai_root = resolve_ai_root(workspace.as_deref());
    let dir = sot_notes_dir(
        &ai_root,
        tenant.as_deref().unwrap_or_default(),
        project.as_deref().unwrap_or_default(),
        repository.as_deref().unwrap_or_default(),
    );

    let Ok(entries) = fs::read_dir(&dir) else {
        return Ok(vec![]);
    };

    let mut notes: Vec<NoteInfo> = entries
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|ext| ext == "md"))
        .filter_map(|p| {
            let text = fs::read_to_string(&p).ok()?;
            Some(note_info_from(&p, &parse_note(&text)))
        })
        .collect();

    notes.sort_by_key(|n| std::cmp::Reverse(n.updated_at));
    Ok(notes)
}

#[tauri::command]
pub fn note_read(path: String) -> Result<NoteContent, String> {
    let p = PathBuf::from(&path);
    let text = fs::read_to_string(&p).map_err(|e| e.to_string())?;
    let parsed = parse_note(&text);
    Ok(NoteContent {
        id: p
            .file_stem()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_default(),
        title: parsed.title,
        body: parsed.body,
        path,
        created_at: parsed.created,
        updated_at: parsed.updated,
    })
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn note_save(
    workspace: Option<String>,
    tenant: Option<String>,
    project: Option<String>,
    repository: Option<String>,
    id: Option<String>,
    title: String,
    body: String,
) -> Result<NoteInfo, String> {
    let ai_root = resolve_ai_root(workspace.as_deref());
    let dir = sot_notes_dir(
        &ai_root,
        tenant.as_deref().unwrap_or_default(),
        project.as_deref().unwrap_or_default(),
        repository.as_deref().unwrap_or_default(),
    );
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let now = now_secs();

    let (stem, created) = match id.filter(|s| !s.is_empty()) {
        // Existing note — keep its filename, preserve the original created timestamp.
        Some(existing) => {
            let path = dir.join(format!("{existing}.md"));
            let created = fs::read_to_string(&path)
                .ok()
                .map(|t| parse_note(&t).created)
                .filter(|c| *c != 0)
                .unwrap_or(now);
            (existing, created)
        }
        // New note — derive a unique slug from the title.
        None => (unique_stem(&dir, &slugify(&title)), now),
    };

    let path = dir.join(format!("{stem}.md"));
    fs::write(&path, render_note(&title, created, now, &body)).map_err(|e| e.to_string())?;

    Ok(NoteInfo {
        id: stem,
        title,
        preview: make_preview(&body),
        path: path.to_string_lossy().into_owned(),
        created_at: created,
        updated_at: now,
    })
}

#[tauri::command]
pub fn note_delete(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.exists() {
        fs::remove_file(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frontmatter_round_trip() {
        let rendered = render_note("My Title", 100, 200, "Line one\nLine two");
        let parsed = parse_note(&rendered);
        assert_eq!(parsed.title, "My Title");
        assert_eq!(parsed.created, 100);
        assert_eq!(parsed.updated, 200);
        assert_eq!(parsed.body, "Line one\nLine two");
    }

    #[test]
    fn parse_without_frontmatter_is_all_body() {
        let parsed = parse_note("just some text");
        assert_eq!(parsed.title, "");
        assert_eq!(parsed.created, 0);
        assert_eq!(parsed.body, "just some text");
    }

    #[test]
    fn preview_collapses_and_truncates() {
        assert_eq!(make_preview("a\n\n  b   c "), "a b c");
        let long = "x ".repeat(300);
        let preview = make_preview(&long);
        assert!(preview.ends_with('…'));
        assert_eq!(preview.chars().count(), 201); // 200 chars + ellipsis
    }

    #[test]
    fn sot_dir_collapses_empty_levels() {
        let root = Path::new("/ai");
        assert_eq!(
            sot_notes_dir(root, "", "", ""),
            PathBuf::from("/ai/source-of-truth/notes")
        );
        assert_eq!(
            sot_notes_dir(root, "T", "P", "R"),
            PathBuf::from("/ai/tenants/T/projects/P/repositories/R/source-of-truth/notes")
        );
        // A gap (project empty) stops the descent at the tenant level.
        assert_eq!(
            sot_notes_dir(root, "T", "", "R"),
            PathBuf::from("/ai/tenants/T/source-of-truth/notes")
        );
    }
}
