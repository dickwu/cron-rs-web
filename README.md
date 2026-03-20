# cron-rs-web

Web dashboard for [cron-rs](https://github.com/dickwu/cron-rs) -- monitor and manage systemd timers from your browser.

<!-- TODO: Add screenshot -->

## Features

- **Real-time dashboard** -- live updates via SSE (task state, run status, hook events)
- **Task management** -- create, edit, enable/disable, trigger, delete with schedule preview
- **Run history** -- filterable run list with terminal-style stdout/stderr viewer
- **Bulk operations** -- select multiple tasks for batch enable/disable/delete
- **Charts** -- run activity and failure rate visualization
- **Responsive** -- desktop, tablet, and mobile layouts
- **JWT auth** -- login page with configurable API URL

## Quick Start

Download the `cron-rs-web` binary from [GitHub Releases](https://github.com/dickwu/cron-rs-web/releases), then:

```bash
./cron-rs-web          # starts on :3000 by default
```

Open `http://localhost:3000` in your browser. Requires [cron-rs](https://github.com/dickwu/cron-rs) daemon running (default: `localhost:9746`).

## Development

```bash
# Start the cron-rs backend
cron-rs daemon          # API on :9746

# In the cron-rs-web directory
npm install
npm run dev             # Next.js dev server on :3000
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

## License

MIT
