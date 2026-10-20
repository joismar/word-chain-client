import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts', 'shared/**/*.test.ts', 'bloc/**/*.test.ts'],
      environment: 'node',
    },
  }),
);
