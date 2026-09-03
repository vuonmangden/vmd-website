import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('renders a request count and duration sum/count series per method+route(+status)', () => {
    const service = new MetricsService();
    service.recordRequest('GET', '/api/v1/public/rooms', 200, 10);
    service.recordRequest('GET', '/api/v1/public/rooms', 200, 20);
    service.recordRequest('GET', '/api/v1/public/rooms', 500, 5);

    const output = service.render();

    expect(output).toContain('vmd_http_requests_total{method="GET",route="/api/v1/public/rooms",status="200"} 2');
    expect(output).toContain('vmd_http_requests_total{method="GET",route="/api/v1/public/rooms",status="500"} 1');
    expect(output).toContain('vmd_http_request_duration_ms_sum{method="GET",route="/api/v1/public/rooms"} 35');
    expect(output).toContain('vmd_http_request_duration_ms_count{method="GET",route="/api/v1/public/rooms"} 3');
  });

  it('escapes backslash, double-quote, and newline in route labels', () => {
    const service = new MetricsService();
    service.recordRequest('GET', '/weird"route\\with\nchars', 200, 1);

    expect(service.render()).toContain('route="/weird\\"route\\\\with\\nchars"');
  });

  it('always includes process-level gauges even with no requests recorded', () => {
    const output = new MetricsService().render();
    expect(output).toContain('vmd_process_uptime_seconds ');
    expect(output).toContain('vmd_process_resident_memory_bytes ');
  });
});
