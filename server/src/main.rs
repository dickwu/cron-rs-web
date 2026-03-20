use axum::body::Body;
use axum::http::{header, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use clap::Parser;
use rust_embed::Embed;
use tower_http::cors::CorsLayer;
use tracing::info;

#[derive(Embed)]
#[folder = "../out/"]
struct Assets;

#[derive(Parser)]
#[command(name = "cron-rs-web-server", about = "Static server for cron-rs web dashboard")]
struct Args {
    /// Host to bind to
    #[arg(short = 'H', long, default_value = "127.0.0.1")]
    host: String,

    /// Port to bind to
    #[arg(short, long, default_value = "3000")]
    port: u16,

    /// cron-rs API URL for CORS (e.g., http://localhost:9746)
    #[arg(long, default_value = "http://localhost:9746")]
    api_url: String,
}

async fn static_handler(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');

    // Try exact file match
    if let Some(file) = Assets::get(path) {
        let mime = mime_guess::from_path(path).first_or_octet_stream();
        return Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, mime.as_ref())
            .header(header::CACHE_CONTROL, "public, max-age=31536000, immutable")
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

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let args = Args::parse();

    let app = Router::new()
        .fallback(get(static_handler))
        .layer(CorsLayer::permissive());

    let addr = format!("{}:{}", args.host, args.port);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();

    info!("cron-rs web dashboard running at http://{}", addr);
    info!("API backend expected at {}", args.api_url);
    info!("Press Ctrl+C to stop");

    axum::serve(listener, app).await.unwrap();
}
