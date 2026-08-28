use std::cmp::Reverse;
use std::io::{BufRead, BufReader};

use crate::domain::ports::session_title_reader::SessionTitleReader;

/// Reads the AI-generated session title from Claude Code's JSONL session files.
/// Maps work_dir → `~/.claude/projects/<hash>/` and scans files by most-recently-modified.
pub struct ClaudeSessionTitleReader;

impl SessionTitleReader for ClaudeSessionTitleReader {
    fn read_title(&self, work_dir: &str) -> Option<String> {
        let home = std::env::var("HOME").ok()?;
        let hash = work_dir.replace('/', "-");
        let projects_dir = std::path::PathBuf::from(&home)
            .join(".claude/projects")
            .join(&hash);
        if !projects_dir.exists() {
            return None;
        }

        let mut candidates: Vec<(u64, std::path::PathBuf)> = std::fs::read_dir(&projects_dir)
            .ok()?
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().is_some_and(|x| x == "jsonl"))
            .filter_map(|e| {
                use std::time::UNIX_EPOCH;
                let mtime = e
                    .metadata()
                    .ok()?
                    .modified()
                    .ok()?
                    .duration_since(UNIX_EPOCH)
                    .ok()?
                    .as_secs();
                Some((mtime, e.path()))
            })
            .collect();

        candidates.sort_by_key(|c| Reverse(c.0));

        // Scan each file and keep the last ai-title entry (Claude Code updates it over time).
        for (_, path) in candidates {
            if let Ok(f) = std::fs::File::open(&path) {
                let mut last_title: Option<String> = None;
                for line in BufReader::new(f).lines().map_while(Result::ok) {
                    if let Ok(obj) = serde_json::from_str::<serde_json::Value>(&line) {
                        if obj.get("type").and_then(|t| t.as_str()) == Some("ai-title") {
                            if let Some(title) = obj.get("aiTitle").and_then(|t| t.as_str()) {
                                last_title = Some(title.to_string());
                            }
                        }
                    }
                }
                if last_title.is_some() {
                    return last_title;
                }
            }
        }
        None
    }
}
