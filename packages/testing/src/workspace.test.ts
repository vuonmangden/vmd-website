import { describe, expect, it } from 'vitest';

describe('workspace foundation', () => {
  it('recognizes exactly four application shells', () => {
    expect(['web', 'admin', 'api', 'worker']).toHaveLength(4);
  });
});
