import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  turbopack: { root: path.resolve(__dirname, '../..') },
  // Standalone output lets the production Dockerfile ship a self-contained
  // server without installing the full monorepo node_modules at runtime.
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
};

export default config;
