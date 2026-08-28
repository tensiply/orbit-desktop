use crate::domain::{errors::DomainError, session::HarnessReport};

pub trait HarnessInspector: Send + Sync {
    fn inspect(
        &self,
        workspace: Option<String>,
        tenant: Option<String>,
        project: Option<String>,
        repository: Option<String>,
        engine: String,
    ) -> Result<HarnessReport, DomainError>;
}
