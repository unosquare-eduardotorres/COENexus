import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { cpSync, existsSync, mkdirSync } from 'fs'
import type { Plugin } from 'vite'

function copySqlFilesPlugin(): Plugin {
  return {
    name: 'copy-sql-files',
    closeBundle() {
      const pairs = [
        { src: 'src/main/db/schema.sql', dest: 'out/main/db/schema.sql' },
        { src: 'src/main/db/migrations', dest: 'out/main/db/migrations' },
        { src: 'src/main/db/path/schema.sql', dest: 'out/main/db/path/schema.sql' },
        { src: 'src/main/db/path/migrations', dest: 'out/main/db/path/migrations' },
        { src: 'src/main/db/agents/schema.sql', dest: 'out/main/db/agents/schema.sql' },
        { src: 'src/main/db/agents/migrations', dest: 'out/main/db/agents/migrations' },
      ]
      for (const { src, dest } of pairs) {
        if (!existsSync(src)) continue
        const destDir = dest.includes('.sql') ? resolve(dest, '..') : resolve(dest)
        mkdirSync(destDir, { recursive: true })
        cpSync(src, dest, { recursive: true })
      }
    },
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copySqlFilesPlugin()],
    build: {
      rollupOptions: {
        external: ['better-sqlite3'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
        },
      },
    },
  },
  renderer: {
    root: resolve('src/renderer'),
    plugins: [react()],
    base: './',
    build: {
      rollupOptions: {
        input: resolve('src/renderer/index.html')
      }
    }
  }
})
