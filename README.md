# cron-rs-web

Web dashboard for [cron-rs](https://github.com/dickwu/cron-rs) -- monitor and manage systemd timers from your browser.

<!-- TODO: Add screenshot -->

## Features

- **Real-time dashboard** -- live updates via SSE (task state, run status, hook events)
- **Task management** -- create, edit, enable/disable, trigger, delete with schedule preview
- **Hook settings in task detail** -- add, edit, and delete hooks from each task page
- **Hooks catalog** -- `/hooks` lists only tasks that already have configured hooks
- **Run history** -- filterable run list with terminal-style stdout/stderr viewer
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
cron-rs init --password 'change-this-password' --host 0.0.0.0
cron-rs import
cron-rs service install --host 0.0.0.0 --start

# 2. Start the web dashboard from SSH / chat
cron-rs-web-server service install --host 0.0.0.0 --start
# Open http://your-server:3000
```

Open `http://your-server:3000` in your browser. By default, the dashboard
connects to the cron-rs API on the same browser host at port `9746`, so
`http://your-server:3000` uses `http://your-server:9746`.

Hook configuration stays in the task detail page (`/tasks?id=...`). The
dedicated `/hooks` page is a read-only catalog so you can see which tasks
already have hooks without duplicating hook-editing controls.

For a custom backend URL:

```bash
cron-rs-web-server service install --host 0.0.0.0 --api-url http://api-host:9746 --start
```

The static server also accepts `CRON_RS_WEB_HOST`, `CRON_RS_WEB_PORT`,
`CRON_RS_API_URL`, and `CRON_RS_WEB_API_URL` for non-interactive server setup.

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
npm install
npm run dev             # Next.js dev server on :3000

# Expose the dev server from SSH
npm run dev -- --hostname 0.0.0.0
```

The dev server proxies API calls to the cron-rs daemon at `localhost:9746`.

## Tech Stack

| Package | Purpose |
|---------|---------|
| Next.js 16 | App Router, static export |
| Ant Design 6 | UI components |
| @ant-design/charts 2 | Data visualization |
| @ant-design/icons 6 | Icons |
| SWR | Data fetching with cache invalidation |
| TypeScript | Type safety |

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
