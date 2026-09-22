use crate::domain::{errors::DomainError, ports::pty_repository::PtyRepository};
use portable_pty::{Child, MasterPty, PtySize};
use std::{
    collections::HashMap,
    io::Write,
    sync::{Arc, Mutex},
};

/// Command sent to a daemon-attached tab's async pump task. The registry's
/// write/resize/close are synchronous (called from `spawn_blocking`), while the
/// IPC `AttachChannel` is async — an unbounded channel bridges the two, since
/// `UnboundedSender::send` is non-blocking.
pub enum IpcCmd {
    Input(Vec<u8>),
    Resize(u16, u16),
    Detach,
}

/// Internal handle for an open tab — not a domain type, purely infrastructure.
/// A tab is either a locally-spawned PTY (shell or tmux attach) or a
/// daemon-owned PTY reached over IPC (`session_attach`), driven by a pump task.
pub enum PtyHandle {
    Local {
        writer: Box<dyn Write + Send>,
        master: Box<dyn MasterPty + Send>,
        _child: Box<dyn Child + Send + Sync>,
    },
    Ipc {
        tx: tokio::sync::mpsc::UnboundedSender<IpcCmd>,
    },
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
        match map.get_mut(tab_id) {
            Some(PtyHandle::Local { writer, .. }) => {
                writer.write_all(data).map_err(DomainError::from)?;
            }
            Some(PtyHandle::Ipc { tx }) => {
                let _ = tx.send(IpcCmd::Input(data.to_vec()));
            }
            None => {}
        }
        Ok(())
    }

    fn resize(&self, tab_id: &str, cols: u16, rows: u16) -> Result<(), DomainError> {
        let map = self.map.lock().unwrap();
        match map.get(tab_id) {
            Some(PtyHandle::Local { master, .. }) => {
                master
                    .resize(PtySize {
                        rows,
                        cols,
                        pixel_width: 0,
                        pixel_height: 0,
                    })
                    .map_err(|e| DomainError::Other(e.to_string()))?;
            }
            Some(PtyHandle::Ipc { tx }) => {
                let _ = tx.send(IpcCmd::Resize(cols, rows));
            }
            None => {}
        }
        Ok(())
    }

    fn close(&self, tab_id: &str) {
        // Dropping a Local handle kills its child; an Ipc handle is asked to
        // detach so the daemon keeps the session's PTY alive.
        if let Some(PtyHandle::Ipc { tx }) = self.map.lock().unwrap().remove(tab_id) {
            let _ = tx.send(IpcCmd::Detach);
        }
    }

    fn contains(&self, tab_id: &str) -> bool {
        self.map.lock().unwrap().contains_key(tab_id)
    }
}
