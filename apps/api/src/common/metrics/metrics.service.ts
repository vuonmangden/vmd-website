import { Injectable } from '@nestjs/common';

/**
 * OPS-005: minimal hand-rolled Prometheus exposition, not `prom-client` —
 * this project consistently avoids a heavyweight SDK for a slice this small
 * (same call already made for the SePay/Zalo adapters, and for Supabase
 * Admin API via raw `fetch`). In-memory only, resets on restart — matches
 * Prometheus's own expectation that counters reset on process restart, and
 * this is Phase 1 single-instance, so no cross-instance aggregation need.
 */
@Injectable()
export class MetricsService {
  private readonly requestCounts = new Map<string, number>();
  private readonly durationSumMs = new Map<string, number>();
  private readonly durationCount = new Map<string, number>();
  private readonly startedAt = Date.now();

  recordRequest(method: string, route: string, status: number, durationMs: number): void {
    const countKey = `${method}|${route}|${status}`;
    this.requestCounts.set(countKey, (this.requestCounts.get(countKey) ?? 0) + 1);
    const durationKey = `${method}|${route}`;
    this.durationSumMs.set(durationKey, (this.durationSumMs.get(durationKey) ?? 0) + durationMs);
    this.durationCount.set(durationKey, (this.durationCount.get(durationKey) ?? 0) + 1);
  }

  render(): string {
    const lines: string[] = [];

    lines.push('# HELP vmd_http_requests_total Total HTTP requests by method, route, and status code.');
    lines.push('# TYPE vmd_http_requests_total counter');
    for (const [key, count] of this.requestCounts) {
      const [method, route, status] = key.split('|');
      lines.push(`vmd_http_requests_total{method="${method}",route="${escapeLabel(route!)}",status="${status}"} ${count}`);
    }

    lines.push('# HELP vmd_http_request_duration_ms_sum Sum of HTTP request durations in milliseconds, by method and route.');
    lines.push('# TYPE vmd_http_request_duration_ms_sum counter');
    for (const [key, sum] of this.durationSumMs) {
      const [method, route] = key.split('|');
      lines.push(`vmd_http_request_duration_ms_sum{method="${method}",route="${escapeLabel(route!)}"} ${sum}`);
    }

    lines.push('# HELP vmd_http_request_duration_ms_count Count of HTTP requests measured for duration, by method and route.');
    lines.push('# TYPE vmd_http_request_duration_ms_count counter');
    for (const [key, count] of this.durationCount) {
      const [method, route] = key.split('|');
      lines.push(`vmd_http_request_duration_ms_count{method="${method}",route="${escapeLabel(route!)}"} ${count}`);
    }

    lines.push('# HELP vmd_process_uptime_seconds Seconds since the process started.');
    lines.push('# TYPE vmd_process_uptime_seconds gauge');
    lines.push(`vmd_process_uptime_seconds ${Math.floor((Date.now() - this.startedAt) / 1000)}`);

    lines.push('# HELP vmd_process_resident_memory_bytes Resident memory size in bytes.');
    lines.push('# TYPE vmd_process_resident_memory_bytes gauge');
    lines.push(`vmd_process_resident_memory_bytes ${process.memoryUsage().rss}`);

    return `${lines.join('\n')}\n`;
  }
}

/** Prometheus label values must escape backslash, double-quote, and newline. */
function escapeLabel(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}
