# cron-rs-web

Web dashboard for [cron-rs](https://github.com/dickwu/cron-rs) -- monitor and manage systemd timers from your browser.

<!-- TODO: Add screenshot -->

## Features

- **Live dashboard** -- one server-sent events (SSE) connection per tab keeps tasks and runs current; views fall back to polling when the stream is unavailable
- **Task management** -- create, edit, enable/disable, trigger and delete tasks, with next-run previews in the daemon's timezone
- **Hooks** -- create, edit and delete hooks from a task page or from `/hooks`, which also lists global hooks that run for every task
- **Run history** -- server-side filters and infinite scroll over the full history, virtualized so long histories stay fast
- **Log viewer** -- opens at the end of the log, loads earlier output on scroll, follows running jobs, searches, and downloads the full log; handles logs with 100k+ lines
- **Settings page** -- review runtime state and manage the saved API URL override
- **Bulk operations** -- select multiple tasks for batch enable/disable/delete
- **Charts** -- run activity and failure rate visualization
- **Responsive** -- desktop, tablet, and mobile layouts
- **JWT auth** -- login page with configurable API URL

## Install

### Homebrew (macOS / Linux)

```bash
brew tap dickwu/tap
brew install cron-rs-web
```

### Download binary

Grab the latest from [GitHub Releases](https://github.com/dickwu/cron-rs-web/releases). Binaries available for:

| Platform | Asset |
|----------|-------|
| macOS Apple Silicon | `cron-rs-web-aarch64-apple-darwin.tar.gz` |
| macOS Intel | `cron-rs-web-x86_64-apple-darwin.tar.gz` |
| Linux x86_64 | `cron-rs-web-x86_64-unknown-linux-gnu.tar.gz` |
| Linux ARM64 | `cron-rs-web-aarch64-unknown-linux-gnu.tar.gz` |
| Linux x86_64 (static) | `cron-rs-web-x86_64-unknown-linux-musl.tar.gz` |

## Quick Start

```bash
# 1. Install and start the backend on a Linux server (requires systemd)
# See https://github.com/dickwu/cron-rs for installation
cron-rs init --host 0.0.0.0   # prompts for the admin password
cron-rs import
cron-rs service install --host 0.0.0.0 --start

# 2. Start the web dashboard from SSH / chat
cron-rs-web-server service install --host 0.0.0.0 --start
# Open http://your-server:3000
```

Open `http://your-server:3000` in your browser. By default, the dashboard
connects to the cron-rs API on the same browser host at port `9746`, so
`http://your-server:3000` uses `http://your-server:9746`. The browser calls the
API directly, so if your daemon restricts CORS, allow the dashboard's origin
there (see the cron-rs README).

`cron-rs-web-server` listens on `127.0.0.1` unless you pass `--host` (or set
`CRON_RS_WEB_HOST`); use `--host 0.0.0.0` as above to reach it from other
machines, or keep the default and use an SSH tunnel or reverse proxy.

For a custom backend URL:

```bash
cron-rs-web-server service install --host 0.0.0.0 --api-url http://api-host:9746 --start
```

Server options:

| Flag | Environment | Default | Purpose |
|------|-------------|---------|---------|
| `--host`, `-H` | `CRON_RS_WEB_HOST` | `127.0.0.1` | Address to listen on |
| `--port`, `-p` | `CRON_RS_WEB_PORT` | `3000` | Port to listen on |
| `--api-url` | `CRON_RS_API_URL`, `CRON_RS_WEB_API_URL` | browser host, port 9746 | cron-rs API URL handed to the browser |
| `--cors-origin` (repeatable) | `CRON_RS_WEB_CORS_ORIGIN` (comma-separated) | none | Origins allowed to fetch the dashboard's files cross-origin; `*` allows any. The dashboard itself doesn't need this. |

A URL saved on the Settings page overrides `--api-url` for that browser only.

The `service` subcommands manage a systemd user unit and only work on Linux.
On macOS, run `cron-rs-web-server` directly (for example from launchd).

Useful service commands:

```bash
cron-rs-web-server service status
cron-rs-web-server service restart
cron-rs-web-server service uninstall
```

## Development

```bash
# Start the cron-rs backend
cron-rs daemon          # API on :9746

# In the cron-rs-web directory
npm ci
npm run dev             # Next.js dev server on :3000

# Expose the dev server from SSH
npm run dev -- --hostname 0.0.0.0

npm run lint            # type-check (tsc --noEmit)
npm run build           # static export to out/
```

There is no dev proxy: the app is a static export, so the browser calls the
daemon directly at `http://<browser host>:9746` (or the URL set on the login or
Settings page).

## Tech Stack

| Package | Purpose |
|---------|---------|
| Next.js 16 | App Router, static export |
| React 19 | UI (hand-written components and SVG charts, no UI kit) |
| SWR 2 | Data fetching and caching |
| @tanstack/react-virtual | Virtualized runs list |
| zustand | Small client stores (preferences, dashboard cache) |
| dayjs | Date formatting |
| TypeScript | Type safety |

Fira Code is self-hosted from `public/fonts` (SIL Open Font License 1.1), so
the dashboard makes no third-party requests.

## Production Build

The `server/` directory contains a Rust static file server (Axum + rust-embed) that embeds the built Next.js output into a single binary. No Node.js runtime required in production.

```bash
# Build the frontend
npm run build           # outputs to out/

# Build the server binary (embeds out/ via rust-embed)
cd server && cargo build --release
```

The resulting binary serves the entire dashboard as a standalone executable.

If you want the dashboard on the same port as the API instead of a separate web
service, build the sibling `cron-rs` checkout with `cargo build --release
--features embed-web` after `npm run build`. That lets `cron-rs` serve the web
UI directly on `:9746`.

## License

MIT
