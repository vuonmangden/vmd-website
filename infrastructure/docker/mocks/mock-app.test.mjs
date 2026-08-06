import assert from 'node:assert/strict';
import test from 'node:test';
import { createMockServer } from './mock-app.mjs';

async function withServer(provider, action) {
  const server = createMockServer(provider);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    await action(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

for (const provider of ['sepay', 'zalo']) {
  test(`${provider} exposes deterministic health, success, error and not-found responses`, async () => {
    await withServer(provider, async (baseUrl) => {
      const health = await fetch(`${baseUrl}/health`);
      assert.equal(health.status, 200);
      assert.deepEqual(await health.json(), { provider: `${provider}-local-mock`, status: 'ok' });

      const success = await fetch(`${baseUrl}/success`, { method: 'POST' });
      assert.equal(success.status, 200);
      assert.equal((await success.json()).status, 'success');

      const failure = await fetch(`${baseUrl}/error`, { method: 'POST' });
      assert.equal(failure.status, 422);
      assert.equal((await failure.json()).status, 'error');

      const missing = await fetch(`${baseUrl}/missing`);
      assert.equal(missing.status, 404);
      assert.equal((await missing.json()).code, 'NOT_FOUND');
    });
  });
}
