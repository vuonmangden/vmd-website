const requiredMajor = 24;
const actualVersion = process.versions.node;
const actualMajor = Number.parseInt(actualVersion.split('.')[0] ?? '', 10);

if (actualMajor !== requiredMajor) {
  console.error(
    `Unsupported Node.js ${actualVersion}. VMD requires Node.js 24 LTS (24.x).`,
  );
  process.exit(1);
}
