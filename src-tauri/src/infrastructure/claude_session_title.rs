use std::io::{BufRead, BufReader};

use crate::domain::ports::session_title_reader::SessionTitleReader;

/// Reads the AI-generated session title from Claude Code's JSONL session files.
/// Maps work_dir → `~/.claude/projects/<hash>/` and opens `<session_id>.jsonl` directly.
pub struct ClaudeSessionTitleReader;

impl SessionTitleReader for ClaudeSessionTitleReader {
    fn read_title(&self, work_dir: &str, session_id: &str) -> Option<String> {
        let home = std::env::var("HOME").ok()?;
        let hash = work_dir.replace('/', "-");
        let file_path = std::path::PathBuf::from(&home)
            .join(".claude/projects")
            .join(&hash)
            .join(format!("{session_id}.jsonl"));

        let f = std::fs::File::open(&file_path).ok()?;
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
        last_title
    }
}
