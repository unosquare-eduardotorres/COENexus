import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
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
