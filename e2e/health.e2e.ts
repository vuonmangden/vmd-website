import { test, expect } from '@playwright/test';

test.describe('Health smoke tests', () => {
  test('web homepage returns 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('API health endpoint returns ok', async ({ request }) => {
    const response = await request.get('http://localhost:3002/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
