/// Port: contract for reading the AI-generated title of a session.
/// The concrete implementation looks up `~/.claude/projects/<hash>/<session_id>.jsonl`.
pub trait SessionTitleReader: Send + Sync {
    fn read_title(&self, work_dir: &str, session_id: &str) -> Option<String>;
}
