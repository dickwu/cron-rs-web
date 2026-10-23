use std::path::PathBuf;

use axum::body::Body;
use axum::extract::State;
use axum::http::HeaderValue;
use axum::http::{header, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use clap::{Args as ClapArgs, Parser, Subcommand};
use rust_embed::Embed;
use tower_http::cors::{AllowOrigin, Any, CorsLayer};
use tracing::info;

#[derive(Embed)]
#[folder = "../out/"]
struct Assets;

#[derive(Parser)]
#[command(
    name = "cron-rs-web-server",
    about = "Static server for cron-rs web dashboard"
)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,

    #[command(flatten)]
    serve: ServeArgs,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// Manage the cron-rs web dashboard user systemd service
    Service {
        #[command(subcommand)]
        command: ServiceCommands,
    },
}

#[derive(Debug, Subcommand)]
enum ServiceCommands {
    /// Install or update the user systemd service
    Install {
        #[command(flatten)]
        serve: ServeArgs,
        /// Start or restart the service after installing it
        #[arg(long)]
        start: bool,
    },
    /// Remove the user systemd service
    Uninstall,
    /// Start the user systemd service
    Start,
    /// Stop the user systemd service
    Stop,
    /// Restart the user systemd service
    Restart,
    /// Show the user systemd service status
    Status,
}

#[derive(Clone, Debug, Default, ClapArgs)]
struct ServeArgs {
    /// Address to bind to. Defaults to CRON_RS_WEB_HOST, then 127.0.0.1 (this
    /// machine only). Use 0.0.0.0 to accept connections from other hosts.
    #[arg(short = 'H', long)]
    host: Option<String>,

    /// Port to bind to. Defaults to CRON_RS_WEB_PORT or 3000.
    #[arg(short, long)]
    port: Option<u16>,

    /// cron-rs API URL to pass to the browser (e.g., http://server:9746).
    /// Defaults to CRON_RS_API_URL/CRON_RS_WEB_API_URL, then browser-host:9746.
    #[arg(long)]
    api_url: Option<String>,

    /// Origin allowed to make cross-origin requests to this server (repeatable,
    /// or comma-separated in CRON_RS_WEB_CORS_ORIGIN; `*` allows any). The
    /// dashboard itself never needs this, so by default no CORS headers are sent.
    #[arg(long = "cors-origin", value_name = "ORIGIN")]
    cors_origins: Vec<String>,
}

#[derive(Clone)]
struct AppState {
    api_url: Option<String>,
}

struct Settings {
    host: String,
    port: u16,
    api_url: Option<String>,
    cors_origins: Vec<String>,
}

const DEFAULT_HOST: &str = "127.0.0.1";

impl ServeArgs {
    fn resolve(self) -> Settings {
        let host = self
            .host
            .or_else(|| std::env::var("CRON_RS_WEB_HOST").ok())
            .filter(|host| !host.trim().is_empty())
            .unwrap_or_else(|| DEFAULT_HOST.to_string());

        let port = self
            .port
            .or_else(|| {
                std::env::var("CRON_RS_WEB_PORT")
                    .ok()
                    .and_then(|port| port.parse().ok())
            })
            .unwrap_or(3000);

        let api_url = self
            .api_url
            .or_else(|| std::env::var("CRON_RS_API_URL").ok())
            .or_else(|| std::env::var("CRON_RS_WEB_API_URL").ok())
            .filter(|url| !url.trim().is_empty());

        let cors_origins = if self.cors_origins.is_empty() {
            std::env::var("CRON_RS_WEB_CORS_ORIGIN")
                .map(|v| split_origins(&v))
                .unwrap_or_default()
        } else {
            self.cors_origins
                .iter()
                .flat_map(|v| split_origins(v))
                .collect()
        };

        Settings {
            host,
            port,
            api_url,
            cors_origins,
        }
    }
}

fn split_origins(value: &str) -> Vec<String> {
    value
        .split(',')
        .map(|origin| origin.trim().trim_end_matches('/').to_string())
        .filter(|origin| !origin.is_empty())
        .collect()
}

/// Builds the CORS layer for the configured origins, or `None` when CORS is off.
fn cors_layer(origins: &[String]) -> AppResult<Option<CorsLayer>> {
    if origins.is_empty() {
        return Ok(None);
    }
    if origins.iter().any(|origin| origin == "*") {
        return Ok(Some(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        ));
    }
    let values = origins
        .iter()
        .map(|origin| {
            HeaderValue::from_str(origin)
                .map_err(|_| format!("invalid --cors-origin value {origin:?}: expected an origin like https://ops.example.com"))
        })
        .collect::<Result<Vec<_>, _>>()?;
    Ok(Some(
        CorsLayer::new()
            .allow_origin(AllowOrigin::list(values))
            .allow_methods(Any)
            .allow_headers(Any),
    ))
}

/// Next.js puts content-hashed assets under _next/static; only those can be
/// cached forever. Everything else (fonts, icons) may change between releases.
fn cache_control_for(path: &str) -> &'static str {
    if path.starts_with("_next/static/") {
        "public, max-age=31536000, immutable"
    } else {
        "public, max-age=3600"
    }
}

type AppResult<T> = Result<T, Box<dyn std::error::Error>>;

async fn static_handler(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');

    // Try exact file match
    if let Some(file) = Assets::get(path) {
        let mime = mime_guess::from_path(path).first_or_octet_stream();
        return Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, mime.as_ref())
            .header(header::CACHE_CONTROL, cache_control_for(path))
            .body(Body::from(file.data.to_vec()))
            .unwrap();
    }

    // Try with .html extension (Next.js static export pattern)
    let html_path = if path.is_empty() {
        "index.html".to_string()
    } else {
        format!("{}.html", path)
    };

    if let Some(file) = Assets::get(&html_path) {
        return Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
            .header(header::CACHE_CONTROL, "no-cache")
            .body(Body::from(file.data.to_vec()))
            .unwrap();
    }

    // Try path/index.html
    let index_path = format!("{}/index.html", path);
    if let Some(file) = Assets::get(&index_path) {
        return Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
            .header(header::CACHE_CONTROL, "no-cache")
            .body(Body::from(file.data.to_vec()))
            .unwrap();
    }

    // SPA fallback: serve index.html for client-side routing
    if !path.contains('.') {
        if let Some(file) = Assets::get("index.html") {
            return Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
                .header(header::CACHE_CONTROL, "no-cache")
                .body(Body::from(file.data.to_vec()))
                .unwrap();
        }
    }

    // 404
    Response::builder()
        .status(StatusCode::NOT_FOUND)
        .header(header::CONTENT_TYPE, "text/plain")
        .body(Body::from("404 Not Found"))
        .unwrap()
}

async fn runtime_config_handler(State(state): State<AppState>) -> impl IntoResponse {
    let api_url = state
        .api_url
        .as_deref()
        .map(js_string)
        .unwrap_or_else(|| "null".to_string());
    let script = format!("window.__CRON_RS_CONFIG__ = {{ apiUrl: {api_url} }};\n");

    Response::builder()
        .status(StatusCode::OK)
        .header(
            header::CONTENT_TYPE,
            "application/javascript; charset=utf-8",
        )
        .header(header::CACHE_CONTROL, "no-store")
        .body(Body::from(script))
        .unwrap()
}

fn js_string(value: &str) -> String {
    let mut escaped = String::from("\"");
    for ch in value.chars() {
        match ch {
            '\\' => escaped.push_str("\\\\"),
            '"' => escaped.push_str("\\\""),
            '\n' => escaped.push_str("\\n"),
            '\r' => escaped.push_str("\\r"),
            '\t' => escaped.push_str("\\t"),
            '<' => escaped.push_str("\\u003c"),
            '>' => escaped.push_str("\\u003e"),
            '&' => escaped.push_str("\\u0026"),
            '\u{2028}' => escaped.push_str("\\u2028"),
            '\u{2029}' => escaped.push_str("\\u2029"),
            _ => escaped.push(ch),
        }
    }
    escaped.push('"');
    escaped
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    let cli = Cli::parse();
    let result = match cli.command {
        Some(Commands::Service { command }) => handle_service_command(command).await,
        None => run_server(cli.serve.resolve()).await,
    };
    if let Err(err) = result {
        eprintln!("error: {err}");
        std::process::exit(1);
    }
}

async fn run_server(settings: Settings) -> AppResult<()> {
    let state = AppState {
        api_url: settings.api_url.clone(),
    };

    let mut app = Router::new()
        .route("/runtime-config.js", get(runtime_config_handler))
        .fallback(get(static_handler))
        .with_state(state);
    if let Some(cors) = cors_layer(&settings.cors_origins)? {
        info!("CORS allowed for: {}", settings.cors_origins.join(", "));
        app = app.layer(cors);
    }

    let addr = bind_addr(&settings.host, settings.port);
    let listener = tokio::net::TcpListener::bind(&addr).await.map_err(|e| {
        format!(
            "couldn't listen on {addr}: {e}. If another process is using port {port}, \
             choose a free one with --port or CRON_RS_WEB_PORT; check --host / CRON_RS_WEB_HOST \
             is an address of this machine.",
            port = settings.port
        )
    })?;

    info!("cron-rs web dashboard running at http://{}", addr);
    if settings.host == DEFAULT_HOST {
        info!("Listening on loopback only; pass --host 0.0.0.0 to allow other machines");
    }
    match &settings.api_url {
        Some(api_url) => info!("API backend configured as {}", api_url),
        None => info!("API backend will default in browser to current host on port 9746"),
    }
    info!("Press Ctrl+C to stop");

    axum::serve(listener, app).await?;
    Ok(())
}

const SERVICE_UNIT: &str = "cron-rs-web.service";

/// `host:port`, bracketing bare IPv6 addresses.
fn bind_addr(host: &str, port: u16) -> String {
    if host.contains(':') && !host.starts_with('[') {
        format!("[{host}]:{port}")
    } else {
        format!("{host}:{port}")
    }
}

async fn handle_service_command(command: ServiceCommands) -> AppResult<()> {
    if !cfg!(target_os = "linux") {
        return Err(format!(
            "the service subcommand manages a systemd user unit and only works on Linux \
             (this build targets {}). Run the server directly instead, for example under \
             launchd or a terminal multiplexer.",
            std::env::consts::OS
        )
        .into());
    }
    match command {
        ServiceCommands::Install { serve, start } => install_service(serve.resolve(), start).await,
        ServiceCommands::Uninstall => uninstall_service().await,
        ServiceCommands::Start => systemctl_checked(&["start", SERVICE_UNIT]).await,
        ServiceCommands::Stop => systemctl_checked(&["stop", SERVICE_UNIT]).await,
        ServiceCommands::Restart => systemctl_checked(&["restart", SERVICE_UNIT]).await,
        ServiceCommands::Status => status_service().await,
    }
}

async fn install_service(settings: Settings, start: bool) -> AppResult<()> {
    let unit_dir = user_unit_dir()?;
    let unit_path = unit_dir.join(SERVICE_UNIT);
    let binary_path = std::env::current_exe()?.to_string_lossy().to_string();
    let content = generate_service_unit(&binary_path, &settings);

    tokio::fs::write(&unit_path, content).await?;
    println!("Wrote {}", unit_path.display());

    systemctl_checked(&["daemon-reload"]).await?;

    if start {
        systemctl_checked(&["enable", SERVICE_UNIT]).await?;
        systemctl_checked(&["restart", SERVICE_UNIT]).await?;
        println!("Installed and started {SERVICE_UNIT}");
    } else {
        systemctl_checked(&["enable", SERVICE_UNIT]).await?;
        println!("Installed {SERVICE_UNIT}");
    }

    Ok(())
}

async fn uninstall_service() -> AppResult<()> {
    let unit_path = user_unit_dir()?.join(SERVICE_UNIT);

    let _ = systemctl_allow_fail(&["disable", "--now", SERVICE_UNIT]).await;

    if unit_path.exists() {
        tokio::fs::remove_file(&unit_path).await?;
        println!("Removed {}", unit_path.display());
    }

    systemctl_checked(&["daemon-reload"]).await
}

async fn status_service() -> AppResult<()> {
    let output = systemctl_allow_fail(&["status", "--no-pager", SERVICE_UNIT]).await?;
    print!("{}", String::from_utf8_lossy(&output.stdout));
    eprint!("{}", String::from_utf8_lossy(&output.stderr));
    Ok(())
}

/// Quotes one ExecStart argument so spaces, quotes, `%` specifiers and `$`
/// variable expansion reach the program literally.
fn systemd_quote(arg: &str) -> String {
    let mut out = String::from("\"");
    for ch in arg.chars() {
        match ch {
            '\\' => out.push_str("\\\\"),
            '"' => out.push_str("\\\""),
            '%' => out.push_str("%%"),
            '$' => out.push_str("$$"),
            '\n' => out.push_str("\\n"),
            _ => out.push(ch),
        }
    }
    out.push('"');
    out
}

fn generate_service_unit(binary_path: &str, settings: &Settings) -> String {
    let mut args = vec![
        binary_path.to_string(),
        "--host".to_string(),
        settings.host.clone(),
        "--port".to_string(),
        settings.port.to_string(),
    ];
    if let Some(api_url) = &settings.api_url {
        args.push("--api-url".to_string());
        args.push(api_url.clone());
    }
    for origin in &settings.cors_origins {
        args.push("--cors-origin".to_string());
        args.push(origin.clone());
    }
    let exec_start = args
        .iter()
        .map(|a| systemd_quote(a))
        .collect::<Vec<_>>()
        .join(" ");

    format!(
        "[Unit]\n\
         Description=cron-rs web dashboard\n\
         After=network.target\n\
         \n\
         [Service]\n\
         Type=simple\n\
         ExecStart={exec_start}\n\
         Restart=on-failure\n\
         RestartSec=5\n\
         \n\
         [Install]\n\
         WantedBy=default.target\n"
    )
}

fn user_unit_dir() -> AppResult<PathBuf> {
    let home = std::env::var("HOME").unwrap_or_else(|_| String::from("/root"));
    let unit_dir = PathBuf::from(home)
        .join(".config")
        .join("systemd")
        .join("user");
    std::fs::create_dir_all(&unit_dir)?;
    Ok(unit_dir)
}

async fn systemctl_checked(args: &[&str]) -> AppResult<()> {
    let output = systemctl_allow_fail(args).await?;
    if !output.status.success() {
        return Err(format!(
            "systemctl --user {} failed with status {}: {}",
            args.join(" "),
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        )
        .into());
    }
    Ok(())
}

async fn systemctl_allow_fail(args: &[&str]) -> AppResult<std::process::Output> {
    let output = tokio::process::Command::new("systemctl")
        .arg("--user")
        .args(args)
        .output()
        .await?;
    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::{
        bind_addr, cache_control_for, cors_layer, generate_service_unit, js_string, split_origins,
        Settings,
    };

    #[test]
    fn escapes_runtime_config_string_for_javascript() {
        assert_eq!(
            js_string("http://server:9746/?x=\"<tag>\"&y=1"),
            "\"http://server:9746/?x=\\\"\\u003ctag\\u003e\\\"\\u0026y=1\""
        );
    }

    #[test]
    fn service_unit_runs_web_server_with_bind_args() {
        let unit = generate_service_unit(
            "/usr/local/bin/cron-rs-web-server",
            &Settings {
                host: "0.0.0.0".to_string(),
                port: 3000,
                api_url: Some("http://server:9746".to_string()),
                cors_origins: vec!["https://ops.example.com".to_string()],
            },
        );

        assert!(unit.contains("Description=cron-rs web dashboard"));
        assert!(unit.contains(
            "ExecStart=\"/usr/local/bin/cron-rs-web-server\" \"--host\" \"0.0.0.0\" \"--port\" \"3000\" \"--api-url\" \"http://server:9746\" \"--cors-origin\" \"https://ops.example.com\""
        ));
        assert!(unit.contains("Restart=on-failure"));
        assert!(unit.contains("WantedBy=default.target"));
    }

    #[test]
    fn service_unit_quotes_specifiers_spaces_and_variables() {
        let unit = generate_service_unit(
            "/opt/my tools/cron-rs-web-server",
            &Settings {
                host: "127.0.0.1".to_string(),
                port: 3000,
                api_url: Some("http://h:9746/?a=100%25&b=$HOME\"x".to_string()),
                cors_origins: vec![],
            },
        );
        assert!(unit.contains("ExecStart=\"/opt/my tools/cron-rs-web-server\" "));
        assert!(unit.contains("\"http://h:9746/?a=100%%25&b=$$HOME\\\"x\""));
        assert!(!unit.contains("--cors-origin"));
    }

    #[test]
    fn cors_is_off_by_default_and_validates_origins() {
        assert!(cors_layer(&[]).unwrap().is_none());
        assert!(cors_layer(&["*".to_string()]).unwrap().is_some());
        assert!(cors_layer(&["https://ops.example.com".to_string()])
            .unwrap()
            .is_some());
        assert!(cors_layer(&["bad\norigin".to_string()]).is_err());
        assert_eq!(
            split_origins(" https://a.example/ ,,https://b.example"),
            vec![
                "https://a.example".to_string(),
                "https://b.example".to_string()
            ]
        );
    }

    #[test]
    fn formats_bind_addresses() {
        assert_eq!(bind_addr("127.0.0.1", 3000), "127.0.0.1:3000");
        assert_eq!(bind_addr("::1", 3000), "[::1]:3000");
        assert_eq!(bind_addr("[::]", 3000), "[::]:3000");
    }

    #[test]
    fn only_hashed_assets_are_immutable() {
        assert!(cache_control_for("_next/static/chunks/a.js").contains("immutable"));
        assert!(!cache_control_for("fonts/FiraCode-latin-wght.woff2").contains("immutable"));
    }
}
