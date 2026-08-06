export async function runChecks(definitions, output = console) {
  let failed = false;
  for (const [name, action] of definitions) {
    try {
      const detail = await action();
      output.log(`PASS ${name}: ${detail}`);
    } catch (error) {
      failed = true;
      const detail = error instanceof Error ? error.message : String(error);
      output.error(`FAIL ${name}: ${detail}`);
    }
  }
  return failed ? 1 : 0;
}
