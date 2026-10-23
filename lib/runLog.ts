/**
 * Client-side model for paged run output.
 *
 * Newer backends serve output as byte ranges (`/runs/{id}/log`). The viewer
 * loads the tail first, prepends earlier ranges on demand and appends new
 * bytes while a run is live. `LogBuffer` stitches those ranges into lines:
 * a range rarely starts or ends on a line boundary, so the partial first
 * line (`headFragment`) and partial last line (`tailPartial`) are held aside
 * and completed when the neighbouring range arrives.
 *
 * Older backends have no log endpoint; `LogBuffer.fromLegacy` builds the same
 * structure from the full stdout/stderr strings so rendering stays virtualized.
 */
import { ApiError, downloadRunLog, getRunWithOutput, saveBlob } from './api';
import type { LogStream, RunLogChunk } from './types';

export const LineKind = { Out: 0, Err: 1, Section: 2 } as const;
export type LineKind = (typeof LineKind)[keyof typeof LineKind];

function splitLines(text: string): string[] {
  const parts = text.split('\n');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.endsWith('\r')) parts[i] = p.slice(0, -1);
  }
  return parts;
}

export class LogBuffer {
  /** Complete lines, oldest first. */
  lines: string[] = [];
  /** Per-line kinds (legacy mode); otherwise every line is `uniformKind`. */
  kinds: LineKind[] | null = null;
  uniformKind: LineKind = LineKind.Out;
  /** Partial line preceding `lines[0]` when `start > 0`. Not displayed. */
  headFragment = '';
  /** Text after the last newline (displayed as the final line if non-empty). */
  tailPartial = '';
  /** Byte range of the source covered by this buffer. */
  start = 0;
  end = 0;
  total = 0;
  complete = false;
  /** True once any range has been applied (distinguishes "empty" from "not loaded"). */
  loaded = false;

  static empty(stream: LogStream): LogBuffer {
    const b = new LogBuffer();
    b.uniformKind = stream === 'stderr' ? LineKind.Err : LineKind.Out;
    return b;
  }

  /** Initialise from a tail (or any first) chunk. */
  static fromChunk(chunk: RunLogChunk, stream: LogStream): LogBuffer {
    const b = LogBuffer.empty(stream);
    b.start = chunk.offset;
    b.end = chunk.next_offset;
    b.total = chunk.total_bytes;
    b.complete = chunk.complete;
    b.loaded = true;
    const parts = splitLines(chunk.data);
    if (chunk.offset > 0 && parts.length > 1) {
      b.headFragment = parts.shift() as string;
    }
    // A chunk that starts mid-file but holds no newline is one very long
    // line; it is shown as-is (its earlier part becomes a separate line if
    // loaded later).
    b.tailPartial = parts.pop() ?? '';
    b.lines = parts;
    return b;
  }

  static fromLegacy(stdout: string, stderr: string, stream: LogStream): LogBuffer {
    const b = LogBuffer.empty(stream);
    const enc = new TextEncoder();
    const clean = (s: string) => {
      const l = splitLines(s);
      if (l.length && l[l.length - 1] === '') l.pop();
      return s ? l : [];
    };
    const out = stream === 'stderr' ? [] : clean(stdout);
    const err = stream === 'stdout' ? [] : clean(stderr);
    const lines: string[] = [];
    const kinds: LineKind[] = [];
    if (out.length && err.length) {
      lines.push('stdout');
      kinds.push(LineKind.Section);
    }
    for (const l of out) {
      lines.push(l);
      kinds.push(LineKind.Out);
    }
    if (err.length) {
      if (out.length) {
        lines.push('stderr');
        kinds.push(LineKind.Section);
      }
      for (const l of err) {
        lines.push(l);
        kinds.push(LineKind.Err);
      }
    }
    b.lines = lines;
    b.kinds = kinds;
    b.total = (stream === 'stderr' ? 0 : enc.encode(stdout).length) +
      (stream === 'stdout' ? 0 : enc.encode(stderr).length);
    b.end = b.total;
    b.complete = true;
    b.loaded = true;
    return b;
  }

  /** Apply an earlier range ending at `start`. Returns display lines added on top. */
  prepend(chunk: RunLogChunk): number {
    if (chunk.next_offset !== this.start || chunk.offset >= this.start) return 0;
    const parts = splitLines(chunk.data + this.headFragment);
    const newFragment = chunk.offset > 0 && parts.length > 1 ? (parts.shift() as string) : '';
    if (chunk.offset === 0 && this.lines.length === 0 && !this.tailPartial) {
      // Everything so far was a fragment; fold it in.
      this.tailPartial = parts.pop() ?? '';
    }
    this.headFragment = newFragment;
    this.lines = parts.concat(this.lines);
    this.start = chunk.offset;
    this.total = Math.max(this.total, chunk.total_bytes);
    return parts.length;
  }

  /** Apply a range starting at `end` (live follow). */
  append(chunk: RunLogChunk): void {
    this.total = Math.max(chunk.total_bytes, chunk.next_offset);
    this.complete = chunk.complete;
    if (chunk.offset !== this.end || !chunk.data) {
      this.end = Math.max(this.end, chunk.offset === this.end ? chunk.next_offset : this.end);
      return;
    }
    const parts = splitLines(this.tailPartial + chunk.data);
    this.tailPartial = parts.pop() ?? '';
    for (const p of parts) this.lines.push(p);
    this.end = chunk.next_offset;
  }

  get length(): number {
    return this.lines.length + (this.tailPartial ? 1 : 0);
  }

  line(i: number): string {
    return i < this.lines.length ? this.lines[i] : this.tailPartial;
  }

  kind(i: number): LineKind {
    return this.kinds ? this.kinds[i] ?? LineKind.Out : this.uniformKind;
  }

  /** Whether everything from byte 0 is loaded (so line numbers are absolute). */
  get fromStart(): boolean {
    return this.start === 0;
  }

  text(): string {
    if (this.kinds) {
      return this.lines
        .map((l, i) => (this.kinds![i] === LineKind.Section ? `===== ${l} =====` : l))
        .join('\n');
    }
    const body = this.lines.join('\n');
    return this.tailPartial ? (body ? `${body}\n${this.tailPartial}` : this.tailPartial) : body;
  }
}

export function isMissingEndpoint(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 405);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * Save a run's full output. Prefers the streaming download endpoint; on older
 * backends falls back to fetching the run with output once.
 */
export async function saveRunOutput(runId: string, stream: LogStream = 'combined'): Promise<void> {
  const name = `${runId}${stream === 'combined' ? '' : `.${stream}`}.log`;
  if (await downloadRunLog(runId, stream, name)) return;
  const run = await getRunWithOutput(runId);
  const b = LogBuffer.fromLegacy(run.stdout || '', run.stderr || '', stream);
  saveBlob(new Blob([b.text() + '\n'], { type: 'text/plain;charset=utf-8' }), name);
}
