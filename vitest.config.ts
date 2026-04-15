import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/test-setup.ts',
        'src/**/__tests__/**',
        'src/shared/ipc-channels.ts',
        'src/renderer/main.tsx',
        'src/main/index.ts',
        'src/preload/**',
      ],
      thresholds: {
        statements: 25,
        branches: 20,
        functions: 25,
        lines: 25,
      },
    },
    projects: [
      {
        plugins: [react()],
        define: {
          'process.env.NODE_ENV': JSON.stringify('development'),
        },
        resolve: {
          conditions: ['development', 'browser'],
        },
        test: {
          name: 'renderer',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/renderer/test-setup.ts'],
          include: ['src/renderer/**/*.test.{ts,tsx}'],
        },
      },
      {
        test: {
          name: 'main',
          environment: 'node',
          globals: true,
          include: ['src/main/**/*.test.ts'],
        },
      },
    ],
  },
});
