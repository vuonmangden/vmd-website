import assert from 'node:assert/strict';
import test from 'node:test';
import { runChecks } from './infra-check-lib.mjs';

test('returns a non-zero exit code when a check fails', async () => {
  const messages = [];
  const output = { log: (message) => messages.push(message), error: (message) => messages.push(message) };
  const code = await runChecks([['broken service', async () => { throw new Error('not healthy'); }]], output);
  assert.equal(code, 1);
  assert.match(messages[0], /broken service: not healthy/);
});
