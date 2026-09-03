import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  it('serves the rendered metrics as plain text, bypassing the JSON envelope', () => {
    const metrics = new MetricsService();
    metrics.recordRequest('GET', '/api/v1/public/rooms', 200, 12);
    const controller = new MetricsController(metrics);
    const response = { setHeader: jest.fn(), send: jest.fn() };

    controller.get(response as never);

    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    expect(response.send).toHaveBeenCalledWith(expect.stringContaining('vmd_http_requests_total{method="GET",route="/api/v1/public/rooms",status="200"} 1'));
  });
});
