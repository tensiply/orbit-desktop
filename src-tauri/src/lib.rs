pub mod domain;
pub mod infrastructure;

mod architecture;
mod command_recorder;
mod daemon;
mod debug_buffer;
mod debug_layer;
mod debug_server;
mod documents;
mod plugins;
mod pty;
mod scopes;
mod sessions;
mod workspaces;

use std::sync::Arc;

use command_recorder::CommandRecorder;
use domain::ports::{
    arch_catalog::ArchCatalogRepo,
    document_store::DocumentStore,
    folder_opener::FolderOpener,
    harness_inspector::HarnessInspector,
    plugin_repository::PluginRepository,
    scope_repository::ScopeRepository,
    session_title_reader::SessionTitleReader,
    workspace_repository::WorkspaceRepository,
};
use infrastructure::{
    claude_session_title::ClaudeSessionTitleReader,
    fs_arch_catalog::FsArchCatalog,
    fs_document_store::FsDocumentStore,
    fs_scope_repo::FsScopeRepo,
    orbit_engine_harness::OrbitEngineHarness,
    orbit_ipc::OrbitIpcClient,
    orbit_plugin_repo::OrbitPluginRepo,
    orbit_workspace_repo::OrbitWorkspaceRepo,
    pty_registry::PtyRegistry,
    xdg_folder_opener::XdgFolderOpener,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, Layer};

#[tauri::command]
fn open_devtools(window: tauri::WebviewWindow) {
    window.open_devtools();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(all(feature = "dev", target_os = "linux"))]
    let _ = std::fs::write("/proc/self/comm", "orbit-dev");

    let buffer = debug_buffer::new_shared();

    let fmt_layer = tracing_subscriber::fmt::layer().with_filter(
        tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "orbit_desktop=debug".into()),
    );

    tracing_subscriber::registry()
        .with(fmt_layer)
        .with(debug_layer::DebugLayer::new(buffer.clone()))
        .init();

    let recorder = CommandRecorder::new(buffer.clone());

    let buffer_for_server = buffer.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .manage(recorder)
        .manage(OrbitIpcClient)
        .manage(PtyRegistry::new())
        .manage(Arc::new(FsScopeRepo) as Arc<dyn ScopeRepository>)
        .manage(Arc::new(FsDocumentStore) as Arc<dyn DocumentStore>)
        .manage(Arc::new(OrbitEngineHarness) as Arc<dyn HarnessInspector>)
        .manage(Arc::new(FsArchCatalog) as Arc<dyn ArchCatalogRepo>)
        .manage(Arc::new(ClaudeSessionTitleReader) as Arc<dyn SessionTitleReader>)
        .manage(Arc::new(OrbitPluginRepo) as Arc<dyn PluginRepository>)
        .manage(Arc::new(OrbitWorkspaceRepo) as Arc<dyn WorkspaceRepository>)
        .manage(Arc::new(XdgFolderOpener) as Arc<dyn FolderOpener>)
        .invoke_handler(tauri::generate_handler![
            // Sessions
            sessions::session_list,
            sessions::session_kill,
            sessions::session_clean,
            sessions::session_launch,
            sessions::session_harness,
            sessions::get_session_title,
            // PTY
            pty::pty_open,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_close,
            // Daemon
            daemon::daemon_status,
            daemon::daemon_ensure_running,
            // Plugins
            plugins::plugin_list,
            plugins::plugin_enable,
            plugins::plugin_disable,
            // Documents
            documents::document_list,
            documents::document_read_b64,
            documents::document_delete,
            documents::document_archive,
            documents::document_reveal,
            // Workspaces
            workspaces::workspace_list,
            // Scopes
            scopes::scope_tree,
            scopes::scope_open_folder,
            // Architecture
            architecture::architecture_load,
            architecture::architecture_save_entity,
            architecture::architecture_delete_entity,
            architecture::architecture_load_layout,
            architecture::architecture_save_layout,
            architecture::architecture_load_routes,
            architecture::architecture_save_routes,
            // Dev tools
            open_devtools,
        ])
        .setup(|_app| {
            #[cfg(feature = "dev")]
            {
                use tauri::Manager;
                if let Some(win) = _app.get_webview_window("main") {
                    let _ = win.set_title("Orbit Dev");
                }
            }

            // Start debug MCP server
            tauri::async_runtime::spawn(debug_server::run(buffer_for_server));

            // Auto-start daemon on launch
            tauri::async_runtime::spawn(async move {
                use crate::domain::ports::orbit_client::OrbitClient;
                if let Err(e) = OrbitIpcClient.ensure_running().await {
                    tracing::warn!("daemon auto-start: {e}");
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running orbit desktop");
}
