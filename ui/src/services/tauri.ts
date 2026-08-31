import { invoke } from '@tauri-apps/api/core'
import type {
  Session, LaunchScope, LaunchedInfo, WorkspaceInfo, ScopeTreeWorkspace,
  ArchCatalogDto, ArchEntityDto, SaveEntityArgs, ArchLayout, ArchRoutes,
  HarnessReport, PluginInfo,
  CliInfo, SetupStatus, UpdateCheck, ImageEntry, SvgEntry,
} from '../types'

export const tauriService = {
  ptyOpen: (tmuxSession: string | null, cwd?: string | null): Promise<string> =>
    invoke('pty_open', { tmuxSession, cwd: cwd ?? null }),

  ptyClose: (tabId: string): Promise<void> =>
    invoke('pty_close', { tabId }),

  ptyWrite: (tabId: string, data: string): Promise<void> =>
    invoke('pty_write', { tabId, data }),

  ptyResize: (tabId: string, cols: number, rows: number): Promise<void> =>
    invoke('pty_resize', { tabId, cols, rows }),

  listSessions: (): Promise<Session[]> =>
    invoke('session_list'),

  sessionHarness: (
    workspace: string | null,
    tenant: string | null,
    project: string | null,
    repository: string | null,
    engine: string,
  ): Promise<HarnessReport> =>
    invoke('session_harness', { workspace, tenant, project, repository, engine }),

  sessionKill: (id: string): Promise<void> =>
    invoke('session_kill', { id }),

  getSessionTitle: (workDir: string, sessionId: string): Promise<string | null> =>
    invoke('get_session_title', { workDir, sessionId }),

  sessionLaunch: (scope: LaunchScope): Promise<LaunchedInfo> =>
    invoke('session_launch', { scope }),

  listWorkspaces: (): Promise<WorkspaceInfo[]> =>
    invoke('workspace_list'),

  scopeTree: (): Promise<ScopeTreeWorkspace[]> =>
    invoke('scope_tree'),

  architectureLoad: (workspace: string, tenant: string): Promise<ArchCatalogDto> =>
    invoke('architecture_load', { workspace, tenant }),

  architectureSaveEntity: (args: SaveEntityArgs): Promise<ArchEntityDto> =>
    invoke('architecture_save_entity', { args }),

  architectureDeleteEntity: (workspace: string, tenant: string, kindFolder: string, id: string): Promise<void> =>
    invoke('architecture_delete_entity', { workspace, tenant, kindFolder, id }),

  architectureLoadLayout: (catalogPath: string): Promise<ArchLayout> =>
    invoke('architecture_load_layout', { catalogPath }),

  architectureSaveLayout: (catalogPath: string, positions: ArchLayout): Promise<void> =>
    invoke('architecture_save_layout', { catalogPath, positions }),

  architectureLoadRoutes: (catalogPath: string): Promise<ArchRoutes> =>
    invoke('architecture_load_routes', { catalogPath }),

  architectureSaveRoutes: (catalogPath: string, routes: ArchRoutes): Promise<void> =>
    invoke('architecture_save_routes', { catalogPath, routes }),

  scopeOpenFolder: (pathSegments: string[]): Promise<void> =>
    invoke('scope_open_folder', { pathSegments }),

  documentReadB64: (path: string): Promise<string> =>
    invoke('document_read_b64', { path }),

  documentReveal: (path: string): Promise<void> =>
    invoke('document_reveal', { path }),

  imageList: (): Promise<ImageEntry[]> =>
    invoke('image_list'),

  imageDelete: (id: string, workspace: string): Promise<void> =>
    invoke('image_delete', { id, workspace }),

  imageArchive: (id: string, workspace: string): Promise<void> =>
    invoke('image_archive', { id, workspace }),

  imageReveal: (path: string): Promise<void> =>
    invoke('image_reveal', { path }),

  svgList: (): Promise<SvgEntry[]> =>
    invoke('svg_list'),

  svgDelete: (id: string, workspace: string): Promise<void> =>
    invoke('svg_delete', { id, workspace }),

  svgArchive: (id: string, workspace: string): Promise<void> =>
    invoke('svg_archive', { id, workspace }),

  svgReveal: (path: string): Promise<void> =>
    invoke('svg_reveal', { path }),

  sessionClean: (): Promise<number> =>
    invoke('session_clean'),

  pluginList: (): Promise<PluginInfo[]> =>
    invoke('plugin_list'),

  pluginEnable: (name: string, scope: string): Promise<void> =>
    invoke('plugin_enable', { name, scope }),

  pluginDisable: (name: string, scope: string): Promise<void> =>
    invoke('plugin_disable', { name, scope }),

  cliCheck: (): Promise<CliInfo> =>
    invoke('cli_check'),

  cliInstall: (method: string): Promise<void> =>
    invoke('cli_install', { method }),

  setupCheck: (): Promise<SetupStatus> =>
    invoke('setup_check'),

  orbitWorkspaceAdd: (path: string, name?: string): Promise<void> =>
    invoke('orbit_workspace_add', { path, name: name ?? null }),

  checkUpdates: (): Promise<UpdateCheck> =>
    invoke('check_updates'),
}
