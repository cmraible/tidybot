import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  shims: true,
  target: 'node18',
  esbuildOptions(options) {
    options.banner = {
      js: '#!/usr/bin/env node'
    };
  }
});