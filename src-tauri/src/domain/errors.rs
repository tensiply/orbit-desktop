/// Domain-level error type. Infrastructure errors map into this before crossing
/// the application boundary — no anyhow or third-party error types leak upward.
#[derive(Debug)]
pub enum DomainError {
    NotFound(String),
    InvalidInput(String),
    Io(std::io::Error),
    Other(String),
}

impl std::fmt::Display for DomainError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotFound(s) => write!(f, "not found: {s}"),
            Self::InvalidInput(s) => write!(f, "invalid input: {s}"),
            Self::Io(e) => write!(f, "io: {e}"),
            Self::Other(s) => write!(f, "{s}"),
        }
    }
}

impl std::error::Error for DomainError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        if let Self::Io(e) = self { Some(e) } else { None }
    }
}

impl From<std::io::Error> for DomainError {
    fn from(e: std::io::Error) -> Self { Self::Io(e) }
}

impl From<anyhow::Error> for DomainError {
    fn from(e: anyhow::Error) -> Self { Self::Other(e.to_string()) }
}
