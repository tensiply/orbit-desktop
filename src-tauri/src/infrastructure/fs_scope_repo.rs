use crate::domain::{
    ports::scope_repository::ScopeRepository,
    scope::{ScopeTreeProject, ScopeTreeRepo, ScopeTreeTenant, ScopeTreeWorkspace},
};
use orbit_core::{scope_index::scan_dirs, workspace_registry::WorkspaceRegistry};
use std::{
    fs,
    path::{Path, PathBuf},
};

/// Reads scope hierarchy from the filesystem by scanning the ai_root tenant/project/repository
/// directory structure managed by orbit-core's WorkspaceRegistry.
pub struct FsScopeRepo;

impl FsScopeRepo {
    fn home_dir() -> PathBuf {
        std::env::var("HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("/tmp"))
    }
}

impl ScopeRepository for FsScopeRepo {
    fn scope_tree(&self) -> Vec<ScopeTreeWorkspace> {
        let registry = WorkspaceRegistry::load();
        let home = Self::home_dir();
        let mut workspaces = Vec::new();

        for ws in &registry.workspaces {
            let tenants_dir = ws.ai_root.join("tenants");
            let mut tenant_names = scan_dirs(&tenants_dir);
            tenant_names.sort_unstable_by_key(|s: &String| s.to_lowercase());

            let mut tenants = Vec::new();
            for tenant in tenant_names {
                let projects_dir = tenants_dir.join(&tenant).join("projects");
                let mut project_names = scan_dirs(&projects_dir);
                project_names.sort_unstable_by_key(|s: &String| s.to_lowercase());

                let mut projects = Vec::new();
                for project in project_names {
                    let repos_dir = projects_dir.join(&project).join("repositories");
                    let mut repo_names = scan_dirs(&repos_dir);
                    repo_names.sort_unstable_by_key(|s: &String| s.to_lowercase());

                    let repositories = repo_names
                        .into_iter()
                        .map(|repo| {
                            let work_dir =
                                home.join(&ws.name).join(&tenant).join(&project).join(&repo);
                            let description =
                                self.read_description(&ws.ai_root, &tenant, &project, &repo);
                            ScopeTreeRepo {
                                name: repo,
                                work_dir: work_dir.to_string_lossy().to_string(),
                                description,
                            }
                        })
                        .collect();

                    projects.push(ScopeTreeProject {
                        name: project,
                        repositories,
                    });
                }

                tenants.push(ScopeTreeTenant {
                    name: tenant,
                    projects,
                });
            }

            workspaces.push(ScopeTreeWorkspace {
                name: ws.name.clone(),
                tenants,
            });
        }

        workspaces
    }

    fn read_description(
        &self,
        ai_root: &Path,
        tenant: &str,
        project: &str,
        repository: &str,
    ) -> Option<String> {
        let readme = ai_root
            .join("tenants")
            .join(tenant)
            .join("projects")
            .join(project)
            .join("repositories")
            .join(repository)
            .join("source-of-truth")
            .join("README.md");
        let text = fs::read_to_string(readme).ok()?;
        text.lines()
            .map(|l| l.trim())
            .find(|l| !l.is_empty() && !l.starts_with('#'))
            .map(|l| l.to_string())
    }
}
