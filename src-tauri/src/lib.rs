pub mod domain;
pub mod infrastructure;

mod architecture;
mod command_recorder;
mod daemon;
mod debug_buffer;
mod debug_layer;
mod debug_server;
mod documents;
mod images;
mod makefile;
mod plugins;
mod pty;
mod scopes;
mod sessions;
mod svgs;
mod tasks;
mod updates;
mod workspaces;

use std::sync::Arc;

use command_recorder::CommandRecorder;
use domain::ports::{
    arch_catalog::ArchCatalogRepo, document_store::DocumentStore, folder_opener::FolderOpener,
    harness_inspector::HarnessInspector, plugin_repository::PluginRepository,
    scope_repository::ScopeRepository, session_title_reader::SessionTitleReader,
    workspace_repository::WorkspaceRepository,
};
use infrastructure::{
    claude_session_title::ClaudeSessionTitleReader, fs_arch_catalog::FsArchCatalog,
    fs_document_store::FsDocumentStore, fs_scope_repo::FsScopeRepo,
    orbit_engine_harness::OrbitEngineHarness, orbit_ipc::OrbitIpcClient,
    orbit_plugin_repo::OrbitPluginRepo, orbit_workspace_repo::OrbitWorkspaceRepo,
    pty_registry::PtyRegistry, xdg_folder_opener::XdgFolderOpener,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, Layer};

#[cfg(debug_assertions)]
#[tauri::command]
fn open_devtools(window: tauri::WebviewWindow) {
    window.open_devtools();
}

#[cfg(not(debug_assertions))]
#[tauri::command]
fn open_devtools(_window: tauri::WebviewWindow) {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(all(feature = "dev", target_os = "linux"))]
    let _ = std::fs::write("/proc/self/comm", "orbit-dev");

    // Dev build: isolate the daemon, socket, and data under ~/.orbit-dev so the
    // dev app and the stable install never share orbitd. Spawned orbit children
    // inherit this env. Respect an explicit ORBIT_HOME if the caller set one.
    #[cfg(feature = "dev")]
    if std::env::var_os("ORBIT_HOME").is_none() {
        if let Some(dirs) = directories::BaseDirs::new() {
            std::env::set_var("ORBIT_HOME", dirs.home_dir().join(".orbit-dev"));
        }
    }

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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
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
            documents::document_import,
            documents::document_read_b64,
            documents::document_delete,
            documents::document_archive,
            documents::document_reveal,
            // Images
            images::image_list,
            images::image_delete,
            images::image_archive,
            images::image_reveal,
            // SVGs
            svgs::svg_list,
            svgs::svg_delete,
            svgs::svg_archive,
            svgs::svg_reveal,
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
            // Tasks
            tasks::task_list,
            tasks::task_get,
            tasks::task_create,
            tasks::task_update,
            tasks::task_delete,
            // Makefile
            makefile::makefile_targets,
            // Updates & CLI
            updates::check_updates,
            updates::setup_check,
            updates::orbit_workspace_add,
            // Dev tools (no-op in release builds)
            open_devtools,
        ])
        .setup(|app| {
            #[cfg(feature = "dev")]
            {
                use tauri::Manager;
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.set_title("Orbit Dev");
                }
            }

            // Register a launcher entry when running as an AppImage (first run only).
            std::thread::spawn(crate::infrastructure::appimage_integration::integrate);

            // Start debug MCP server (needs an AppHandle to emit events into the webview)
            tauri::async_runtime::spawn(debug_server::run(buffer_for_server, app.handle().clone()));

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
