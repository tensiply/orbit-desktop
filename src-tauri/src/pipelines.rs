use anyhow::Result;
use orbit_core::{
    secrets,
    user_config::{self, UserConfig},
    workspace_registry::WorkspaceRegistry,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{fs, path::PathBuf};

// ── types (mirrors orbit_core::pipeline) ─────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PipelineProvider {
    GithubActions,
    Jenkins,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineConfig {
    pub name: String,
    pub provider: PipelineProvider,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workflow: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub job: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_secret: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RunStatus {
    Success,
    Failure,
    Running,
    Pending,
    Cancelled,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineStep {
    pub name: String,
    pub status: RunStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineRun {
    pub id: String,
    pub run_name: String,
    pub status: RunStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit_sha: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub triggered_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(default)]
    pub steps: Vec<PipelineStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineStatus {
    pub config: PipelineConfig,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_run: Option<PipelineRun>,
    pub fetched_at: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ── Tauri command ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_pipelines(
    workspace: Option<String>,
    tenant: Option<String>,
    project: Option<String>,
    repository: Option<String>,
) -> Result<Vec<PipelineStatus>, String> {
    let ai_root = resolve_ai_root(workspace.as_deref());
    let workspace_slug = ai_root
        .file_name()
        .map(|n| n.to_string_lossy().into_owned());

    let configs = collect_configs(
        &ai_root,
        tenant.as_deref(),
        project.as_deref(),
        repository.as_deref(),
    );

    if configs.is_empty() {
        return Ok(vec![]);
    }

    let client = reqwest::Client::builder()
        .user_agent("orbit-desktop")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let mut results = Vec::new();
    for cfg in configs {
        let token = cfg
            .token_secret
            .as_ref()
            .map(|s| secrets::resolve_scoped(s, workspace_slug.as_deref()))
            .filter(|t| !t.is_empty());

        let status = fetch_pipeline(&client, &cfg, token.as_deref(), now).await;
        results.push(status);
    }

    Ok(results)
}

// ── config collection ─────────────────────────────────────────────────────────

/// Resolve the active workspace's `ai_root`. Prefers the registry entry matching
/// the session workspace (by slug or name), falls back to the default entry, and
/// finally to the personal `UserConfig`. This is what lets pipeline configs be
/// found under a workspace whose root is not the default `~/AI`.
fn resolve_ai_root(workspace: Option<&str>) -> PathBuf {
    let registry = WorkspaceRegistry::load();
    let entry = workspace
        .and_then(|w| registry.get(w))
        .or_else(|| registry.default_entry());
    match entry {
        Some(e) => user_config::expand_tilde(&e.ai_root),
        None => UserConfig::load().ai_root_expanded(),
    }
}

fn collect_configs(
    ai_root: &std::path::Path,
    tenant: Option<&str>,
    project: Option<&str>,
    repository: Option<&str>,
) -> Vec<PipelineConfig> {
    orbit_json_paths(ai_root, tenant, project, repository)
        .iter()
        .flat_map(|p| read_pipelines_from_file(p))
        .collect()
}

fn orbit_json_paths(
    ai_root: &std::path::Path,
    tenant: Option<&str>,
    project: Option<&str>,
    repository: Option<&str>,
) -> Vec<PathBuf> {
    let mut paths = vec![ai_root.join("orbit.json")];
    if let Some(t) = tenant {
        paths.push(ai_root.join("tenants").join(t).join("orbit.json"));
        if let Some(p) = project {
            paths.push(
                ai_root
                    .join("tenants")
                    .join(t)
                    .join("projects")
                    .join(p)
                    .join("orbit.json"),
            );
            if let Some(r) = repository {
                paths.push(
                    ai_root
                        .join("tenants")
                        .join(t)
                        .join("projects")
                        .join(p)
                        .join("repositories")
                        .join(r)
                        .join("orbit.json"),
                );
            }
        }
    }
    paths
}

fn read_pipelines_from_file(path: &std::path::Path) -> Vec<PipelineConfig> {
    let Ok(text) = fs::read_to_string(path) else {
        return vec![];
    };
    let Ok(val) = serde_json::from_str::<Value>(&text) else {
        return vec![];
    };
    let Some(arr) = val.get("pipelines").and_then(|v| v.as_array()) else {
        return vec![];
    };
    arr.iter()
        .filter_map(|v| serde_json::from_value::<PipelineConfig>(v.clone()).ok())
        .collect()
}

// ── fetcher ───────────────────────────────────────────────────────────────────

async fn fetch_pipeline(
    client: &reqwest::Client,
    cfg: &PipelineConfig,
    token: Option<&str>,
    now: u64,
) -> PipelineStatus {
    let result = match cfg.provider {
        PipelineProvider::GithubActions => fetch_github(client, cfg, token, now).await,
        PipelineProvider::Jenkins => fetch_jenkins(client, cfg, token, now).await,
    };
    match result {
        Ok(ps) => ps,
        Err(e) => PipelineStatus {
            config: cfg.clone(),
            latest_run: None,
            fetched_at: now,
            error: Some(e.to_string()),
        },
    }
}

// ── GitHub Actions ────────────────────────────────────────────────────────────

async fn fetch_github(
    client: &reqwest::Client,
    cfg: &PipelineConfig,
    token: Option<&str>,
    now: u64,
) -> Result<PipelineStatus> {
    let repo = cfg
        .repo
        .as_deref()
        .ok_or_else(|| anyhow::anyhow!("missing 'repo'"))?;
    let branch = cfg.branch.as_deref().unwrap_or("main");

    let api_url = format!(
        "https://api.github.com/repos/{}/actions/runs?branch={}&per_page=1",
        repo, branch
    );

    let mut req = client
        .get(&api_url)
        .header("Accept", "application/vnd.github+json");
    if let Some(t) = token {
        req = req.header("Authorization", format!("Bearer {t}"));
    }

    let resp: Value = req.send().await?.error_for_status()?.json().await?;
    let run_val = resp["workflow_runs"]
        .as_array()
        .and_then(|a| a.first())
        .cloned();

    let latest_run = if let Some(r) = run_val.as_ref() {
        let status_str = r["status"].as_str().unwrap_or("unknown");
        let conclusion = r["conclusion"].as_str();
        let run_status = gh_run_status(status_str, conclusion);

        let mut pipeline_run = PipelineRun {
            id: r["id"].as_u64().map(|n| n.to_string()).unwrap_or_default(),
            run_name: r["name"].as_str().unwrap_or(&cfg.name).to_owned(),
            status: run_status,
            branch: r["head_branch"].as_str().map(str::to_owned),
            commit_sha: r["head_sha"]
                .as_str()
                .map(|s| s[..8.min(s.len())].to_owned()),
            commit_message: r["head_commit"]["message"].as_str().map(str::to_owned),
            triggered_by: r["triggering_actor"]["login"].as_str().map(str::to_owned),
            started_at: r["created_at"].as_str().and_then(parse_rfc3339),
            completed_at: r["updated_at"].as_str().and_then(parse_rfc3339),
            url: r["html_url"].as_str().map(str::to_owned),
            steps: vec![],
        };

        if let Some(run_id) = r["id"].as_u64() {
            if let Ok(steps) = fetch_github_jobs(client, repo, run_id, token).await {
                pipeline_run.steps = steps;
            }
        }
        Some(pipeline_run)
    } else {
        None
    };

    Ok(PipelineStatus {
        config: cfg.clone(),
        latest_run,
        fetched_at: now,
        error: None,
    })
}

async fn fetch_github_jobs(
    client: &reqwest::Client,
    repo: &str,
    run_id: u64,
    token: Option<&str>,
) -> Result<Vec<PipelineStep>> {
    let url = format!(
        "https://api.github.com/repos/{}/actions/runs/{}/jobs",
        repo, run_id
    );
    let mut req = client
        .get(&url)
        .header("Accept", "application/vnd.github+json");
    if let Some(t) = token {
        req = req.header("Authorization", format!("Bearer {t}"));
    }
    let resp: Value = req.send().await?.error_for_status()?.json().await?;
    let Some(jobs) = resp["jobs"].as_array() else {
        return Ok(vec![]);
    };

    let mut steps = Vec::new();
    for job in jobs {
        let job_name = job["name"].as_str().unwrap_or("job").to_string();
        if let Some(job_steps) = job["steps"].as_array() {
            for s in job_steps {
                steps.push(PipelineStep {
                    name: format!("{job_name} / {}", s["name"].as_str().unwrap_or("step")),
                    status: gh_run_status(
                        s["status"].as_str().unwrap_or("unknown"),
                        s["conclusion"].as_str(),
                    ),
                    started_at: s["started_at"].as_str().and_then(parse_rfc3339),
                    completed_at: s["completed_at"].as_str().and_then(parse_rfc3339),
                    message: None,
                });
            }
        }
    }
    Ok(steps)
}

// ── Jenkins ───────────────────────────────────────────────────────────────────

async fn fetch_jenkins(
    client: &reqwest::Client,
    cfg: &PipelineConfig,
    token: Option<&str>,
    now: u64,
) -> Result<PipelineStatus> {
    let base = cfg
        .url
        .as_deref()
        .ok_or_else(|| anyhow::anyhow!("missing 'url'"))?;
    let job = cfg
        .job
        .as_deref()
        .ok_or_else(|| anyhow::anyhow!("missing 'job'"))?;

    let job_path: String = job
        .split('/')
        .map(|s| format!("job/{}", s))
        .collect::<Vec<_>>()
        .join("/");
    let api_url = format!(
        "{}/{}/lastBuild/api/json?tree=result,building,displayName,number,url,timestamp,duration",
        base.trim_end_matches('/'),
        job_path
    );

    let mut req = client.get(&api_url);
    if let Some(t) = token {
        req = req.basic_auth("", Some(t));
    }

    let resp: Value = req.send().await?.error_for_status()?.json().await?;
    let building = resp["building"].as_bool().unwrap_or(false);
    let result_str = resp["result"].as_str();

    let run_status = if building {
        RunStatus::Running
    } else {
        match result_str {
            Some("SUCCESS") => RunStatus::Success,
            Some("FAILURE") | Some("UNSTABLE") => RunStatus::Failure,
            Some("ABORTED") => RunStatus::Cancelled,
            Some("NOT_BUILT") => RunStatus::Pending,
            _ => RunStatus::Unknown,
        }
    };

    let ts_ms = resp["timestamp"].as_u64().unwrap_or(0);
    let dur_ms = resp["duration"].as_u64().unwrap_or(0);
    let build_num = resp["number"].as_u64().unwrap_or(0);

    Ok(PipelineStatus {
        config: cfg.clone(),
        latest_run: Some(PipelineRun {
            id: build_num.to_string(),
            run_name: resp["displayName"]
                .as_str()
                .unwrap_or(&format!("#{build_num}"))
                .to_owned(),
            status: run_status,
            branch: None,
            commit_sha: None,
            commit_message: None,
            triggered_by: None,
            started_at: (ts_ms > 0).then_some(ts_ms / 1000),
            completed_at: (ts_ms > 0 && dur_ms > 0).then_some((ts_ms + dur_ms) / 1000),
            url: resp["url"].as_str().map(str::to_owned),
            steps: vec![],
        }),
        fetched_at: now,
        error: None,
    })
}

// ── helpers ───────────────────────────────────────────────────────────────────

fn gh_run_status(status: &str, conclusion: Option<&str>) -> RunStatus {
    match status {
        "queued" | "waiting" => RunStatus::Pending,
        "in_progress" => RunStatus::Running,
        "completed" => match conclusion {
            Some("success") => RunStatus::Success,
            Some("failure") | Some("timed_out") => RunStatus::Failure,
            Some("cancelled") | Some("skipped") => RunStatus::Cancelled,
            _ => RunStatus::Unknown,
        },
        _ => RunStatus::Unknown,
    }
}

fn parse_rfc3339(s: &str) -> Option<u64> {
    let s = s
        .strip_suffix('Z')
        .or_else(|| s.strip_suffix("+00:00"))
        .unwrap_or(s);
    let (date, time) = s.split_once('T')?;
    let mut dp = date.split('-');
    let year: i64 = dp.next()?.parse().ok()?;
    let month: i64 = dp.next()?.parse().ok()?;
    let day: i64 = dp.next()?.parse().ok()?;
    let mut tp = time.split(':');
    let hour: i64 = tp.next()?.parse().ok()?;
    let min: i64 = tp.next()?.parse().ok()?;
    let sec: i64 = tp.next()?.split('.').next()?.parse().ok()?;

    const DAYS_IN_MONTH: [i64; 12] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let is_leap = |y: i64| (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
    let mut days = 0i64;
    for y in 1970..year {
        days += if is_leap(y) { 366 } else { 365 };
    }
    for m in 1..month {
        days += DAYS_IN_MONTH[(m - 1) as usize];
        if m == 2 && is_leap(year) {
            days += 1;
        }
    }
    days += day - 1;
    let secs = days * 86400 + hour * 3600 + min * 60 + sec;
    (secs >= 0).then_some(secs as u64)
}
