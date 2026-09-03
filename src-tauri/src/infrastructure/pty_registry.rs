use crate::domain::{errors::DomainError, ports::pty_repository::PtyRepository};
use portable_pty::{Child, MasterPty, PtySize};
use std::{
    collections::HashMap,
    io::Write,
    sync::{Arc, Mutex},
};

/// Internal handle for an open PTY — not a domain type, purely infrastructure.
pub struct PtyHandle {
    pub writer: Box<dyn Write + Send>,
    pub master: Box<dyn MasterPty + Send>,
    pub _child: Box<dyn Child + Send + Sync>,
}

/// Thread-safe registry of open PTY handles, keyed by tab_id.
/// Wraps Arc<Mutex<...>> so it is cheaply cloneable across async boundaries.
#[derive(Clone)]
pub struct PtyRegistry {
    map: Arc<Mutex<HashMap<String, PtyHandle>>>,
}

impl Default for PtyRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl PtyRegistry {
    pub fn new() -> Self {
        Self {
            map: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Store a newly created handle. Called by the pty_open command after spawning the child.
    pub fn insert(&self, tab_id: String, handle: PtyHandle) {
        self.map.lock().unwrap().insert(tab_id, handle);
    }
}

impl PtyRepository for PtyRegistry {
    fn write(&self, tab_id: &str, data: &[u8]) -> Result<(), DomainError> {
        let mut map = self.map.lock().unwrap();
        if let Some(handle) = map.get_mut(tab_id) {
            handle.writer.write_all(data).map_err(DomainError::from)?;
        }
        Ok(())
    }

    fn resize(&self, tab_id: &str, cols: u16, rows: u16) -> Result<(), DomainError> {
        let map = self.map.lock().unwrap();
        if let Some(handle) = map.get(tab_id) {
            handle
                .master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| DomainError::Other(e.to_string()))?;
        }
        Ok(())
    }

    fn close(&self, tab_id: &str) {
        self.map.lock().unwrap().remove(tab_id);
    }

    fn contains(&self, tab_id: &str) -> bool {
        self.map.lock().unwrap().contains_key(tab_id)
    }
}
