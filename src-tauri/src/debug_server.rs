use axum::{
    extract::{Query, State},
    response::sse::{Event, KeepAlive, Sse},
    routing::post,
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    convert::Infallible,
    path::PathBuf,
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tokio::sync::{mpsc, Mutex};
use tokio_stream::{wrappers::ReceiverStream, StreamExt};
use uuid::Uuid;

use crate::debug_buffer::SharedDebugBuffer;

const BASE_PORT: u16 = 17777;
const MAX_PORT: u16 = 17800;

// (event_type, data) pairs sent to SSE clients
type SseMsg = (String, String);

#[derive(Clone)]
struct ServerState {
    buffer: SharedDebugBuffer,
    sessions: Arc<Mutex<HashMap<String, mpsc::Sender<SseMsg>>>>,
}

pub async fn run(buffer: SharedDebugBuffer) {
    let port = match bind_port().await {
        Some(p) => p,
        None => {
            tracing::warn!("debug MCP server: no free port in {BASE_PORT}–{MAX_PORT}, skipping");
            return;
        }
    };

    if let Err(e) = write_discovery_file(port) {
        tracing::warn!("debug MCP server: failed to write discovery file: {e}");
    }

    let state = ServerState {
        buffer,
        sessions: Arc::new(Mutex::new(HashMap::new())),
    };

    let app = Router::new()
        // Streamable HTTP transport (Claude Code default for type:http MCPs)
        .route("/sse", post(streamable_post).get(sse_handler))
        // Legacy SSE transport message channel
        .route("/message", post(message_handler))
        .with_state(state);

    tracing::info!("debug MCP server listening on 127.0.0.1:{port}");

    let listener = match tokio::net::TcpListener::bind(format!("127.0.0.1:{port}")).await {
        Ok(l) => l,
        Err(e) => {
            tracing::warn!("debug MCP server: bind failed: {e}");
            return;
        }
    };

    if let Err(e) = axum::serve(listener, app).await {
        tracing::warn!("debug MCP server: {e}");
    }
}

async fn bind_port() -> Option<u16> {
    for port in BASE_PORT..=MAX_PORT {
        if tokio::net::TcpListener::bind(format!("127.0.0.1:{port}"))
            .await
            .is_ok()
        {
            return Some(port);
        }
    }
    None
}

fn write_discovery_file(port: u16) -> anyhow::Result<()> {
    let home = directories::BaseDirs::new()
        .map(|b| b.home_dir().to_path_buf())
        .unwrap_or_else(|| PathBuf::from("/"));
    let data_dir = home.join(".orbit/data");
    std::fs::create_dir_all(&data_dir)?;
    let payload = json!({
        "port": port,
        "pid": std::process::id(),
        "started_at": SystemTime::now().duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs()).unwrap_or(0)
    });
    std::fs::write(
        data_dir.join("orbit-desktop-debug.json"),
        serde_json::to_string_pretty(&payload)?,
    )?;
    Ok(())
}

// ── Streamable HTTP transport (MCP 2024-11-05) ────────────────────────────────
// Claude Code uses this when the MCP is configured with "type": "http".
// Each request is a standalone POST → JSON response pair.

async fn streamable_post(
    State(state): State<ServerState>,
    body: axum::body::Bytes,
) -> axum::response::Response {
    use axum::{body::Body, http::header, response::Response};

    let Ok(body_val) = serde_json::from_slice::<Value>(&body) else {
        return Response::builder()
            .status(400)
            .body(Body::empty())
            .unwrap();
    };

    // Notifications have no id — acknowledge with 202, no response body
    if body_val.get("id").is_none() {
        return Response::builder()
            .status(202)
            .body(Body::empty())
            .unwrap();
    }

    let result = handle_rpc(&state, &body_val).await;
    let json_bytes = serde_json::to_vec(&result).unwrap_or_default();

    Response::builder()
        .status(200)
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json_bytes))
        .unwrap()
}

// ── SSE endpoint ─────────────────────────────────────────────────────────────

async fn sse_handler(
    State(state): State<ServerState>,
) -> Sse<impl tokio_stream::Stream<Item = Result<Event, Infallible>>> {
    let session_id = Uuid::new_v4().to_string();
    let (tx, rx) = mpsc::channel::<SseMsg>(64);

    // Send the endpoint URL as the first SSE event
    let endpoint_url = format!("/message?sessionId={session_id}");
    let _ = tx
        .try_send(("endpoint".to_string(), endpoint_url))
        .is_ok();

    state
        .sessions
        .lock()
        .await
        .insert(session_id, tx);

    let stream = ReceiverStream::new(rx).map(|(event_type, data)| {
        Ok::<_, Infallible>(Event::default().event(event_type).data(data))
    });

    Sse::new(stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("ping"),
    )
}

// ── Message endpoint ──────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct SessionQuery {
    #[serde(rename = "sessionId")]
    session_id: String,
}

async fn message_handler(
    State(state): State<ServerState>,
    Query(params): Query<SessionQuery>,
    Json(body): Json<Value>,
) -> axum::http::StatusCode {
    // Notifications have no id — no response needed
    if body.get("id").is_none() {
        return axum::http::StatusCode::OK;
    }

    let response = handle_rpc(&state, &body).await;
    let json_str = match serde_json::to_string(&response) {
        Ok(s) => s,
        Err(_) => return axum::http::StatusCode::INTERNAL_SERVER_ERROR,
    };

    let sessions = state.sessions.lock().await;
    if let Some(tx) = sessions.get(&params.session_id) {
        let _ = tx.try_send(("message".to_string(), json_str));
    }

    axum::http::StatusCode::OK
}

// ── JSON-RPC dispatch ─────────────────────────────────────────────────────────

async fn handle_rpc(state: &ServerState, body: &Value) -> Value {
    let id = body.get("id").cloned().unwrap_or(Value::Null);
    let method = body
        .get("method")
        .and_then(|m| m.as_str())
        .unwrap_or("");
    let params = body.get("params").cloned().unwrap_or(json!({}));

    match method {
        "initialize" => json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": {
                "protocolVersion": "2024-11-05",
                "serverInfo": {
                    "name": "orbit-desktop-debug",
                    "version": env!("CARGO_PKG_VERSION")
                },
                "capabilities": { "tools": {} }
            }
        }),
        "ping" => json!({ "jsonrpc": "2.0", "id": id, "result": {} }),
        "tools/list" => json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": { "tools": tool_definitions() }
        }),
        "tools/call" => {
            let name = params
                .get("name")
                .and_then(|n| n.as_str())
                .unwrap_or("");
            let args = params
                .get("arguments")
                .cloned()
                .unwrap_or(json!({}));
            let result = call_tool(state, name, &args).await;
            let text = serde_json::to_string_pretty(&result).unwrap_or_default();
            json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "content": [{ "type": "text", "text": text }]
                }
            })
        }
        _ => json!({
            "jsonrpc": "2.0",
            "id": id,
            "error": { "code": -32601, "message": "Method not found" }
        }),
    }
}

// ── Tool definitions ──────────────────────────────────────────────────────────

fn tool_definitions() -> Value {
    json!([
        {
            "name": "get_logs",
            "description": "Get recent backend log entries from the running orbit-desktop instance. Returns the most recent entries (newest last). Use level to filter by severity, target to filter by Rust module path.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "level": {
                        "type": "string",
                        "description": "Filter by log level: TRACE, DEBUG, INFO, WARN, ERROR",
                        "enum": ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"]
                    },
                    "target": {
                        "type": "string",
                        "description": "Filter by Rust module path substring (e.g. 'orbit_desktop::sessions')"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of entries to return (default: 100, max: 2000)",
                        "default": 100
                    }
                }
            }
        },
        {
            "name": "get_commands",
            "description": "Get recent Tauri command invocations from the frontend. Shows which commands were called, their duration, and whether they succeeded.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "Filter by command name substring (e.g. 'session')"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of entries to return (default: 50, max: 500)",
                        "default": 50
                    }
                }
            }
        },
        {
            "name": "get_daemon_status",
            "description": "Get the current status of the orbit daemon (orbitd). Shows whether it's running, its PID, uptime, and active session count.",
            "inputSchema": {
                "type": "object",
                "properties": {}
            }
        },
        {
            "name": "get_sessions",
            "description": "Get the list of active AI sessions managed by the orbit daemon. Shows engine, scope, PID, and tmux session for each.",
            "inputSchema": {
                "type": "object",
                "properties": {}
            }
        }
    ])
}

// ── Tool implementations ──────────────────────────────────────────────────────

async fn call_tool(state: &ServerState, name: &str, args: &Value) -> Value {
    match name {
        "get_logs" => {
            let level = args.get("level").and_then(|v| v.as_str());
            let target = args.get("target").and_then(|v| v.as_str());
            let limit = args
                .get("limit")
                .and_then(|v| v.as_u64())
                .unwrap_or(100)
                .min(2000) as usize;

            match state.buffer.read() {
                Ok(buf) => json!(buf.logs_filtered(level, target, limit)),
                Err(_) => json!({ "error": "buffer lock poisoned" }),
            }
        }

        "get_commands" => {
            let command = args.get("command").and_then(|v| v.as_str());
            let limit = args
                .get("limit")
                .and_then(|v| v.as_u64())
                .unwrap_or(50)
                .min(500) as usize;

            match state.buffer.read() {
                Ok(buf) => json!(buf.cmds_filtered(command, limit)),
                Err(_) => json!({ "error": "buffer lock poisoned" }),
            }
        }

        "get_daemon_status" => {
            if !orbit_client::ipc::is_available() {
                return json!({ "running": false });
            }
            match orbit_client::ipc::status().await {
                Ok(info) => json!({
                    "running": true,
                    "pid": info.pid,
                    "uptime_secs": info.uptime_secs,
                    "session_count": info.session_count
                }),
                Err(e) => json!({ "running": false, "error": e.to_string() }),
            }
        }

        "get_sessions" => match orbit_client::ipc::list_sessions().await {
            Ok(sessions) => json!(sessions),
            Err(e) => json!({ "error": e.to_string() }),
        },

        _ => json!({ "error": format!("unknown tool: {name}") }),
    }
}
