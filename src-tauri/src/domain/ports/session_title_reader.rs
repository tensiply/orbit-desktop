/// Port: contract for reading the AI-generated title of a Claude Code session.
/// The concrete implementation scans `~/.claude/projects/<hash>/*.jsonl` for `ai-title` entries.
pub trait SessionTitleReader: Send + Sync {
    fn read_title(&self, work_dir: &str) -> Option<String>;
}
