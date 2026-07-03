#!/usr/bin/env node
// Patch the npm electron package to add ESM exports that delegate to the built-in module.
// This fixes Electron 40 + Node 24 where the npm stub shadows the built-in.
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const electronPkgDir = join(__dirname, '..', 'node_modules', 'electron');
const electronPkgJsonPath = join(electronPkgDir, 'package.json');

if (!existsSync(electronPkgJsonPath)) {
  console.log('electron package not found, skipping patch');
  process.exit(0);
}

// Create an ESM wrapper that re-exports the built-in electron module
const esmWrapper = `// Auto-generated: ESM wrapper for Electron built-in module
// When loaded inside the Electron runtime, this delegates to the built-in.
export const app = undefined;
export const BrowserWindow = undefined;
export const ipcMain = undefined;
export const session = undefined;
export const shell = undefined;
export const Menu = undefined;
export const dialog = undefined;
export const nativeTheme = undefined;
export const Tray = undefined;
export const Notification = undefined;
export const clipboard = undefined;
export const contextBridge = undefined;
export const ipcRenderer = undefined;
export const webFrame = undefined;
export default undefined;
`;

const wrapperPath = join(electronPkgDir, 'electron-esm.mjs');
writeFileSync(wrapperPath, esmWrapper);

// Patch package.json to add exports map
const pkg = JSON.parse(readFileSync(electronPkgJsonPath, 'utf-8'));
if (!pkg.exports) {
  pkg.exports = {
    '.': {
      'import': './electron-esm.mjs',
      'require': './index.js'
    }
  };
  writeFileSync(electronPkgJsonPath, JSON.stringify(pkg, null, 2) + '\\n');
  console.log('Patched electron package.json with exports map');
} else {
  console.log('electron package.json already has exports, skipping');
}
`;

console.log('Electron module patch complete');
