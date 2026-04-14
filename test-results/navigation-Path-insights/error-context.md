# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> Path: insights
- Location: e2e/cdp/navigation.spec.ts:163:5

# Error details

```
Error: ErrorBoundary triggered on file:///Users/eduardo.torres/Downloads/COE%20Operation%20Nexus/out/renderer/index.html#/path/insights: Minified React error #185; visit https://react.dev/errors/185 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
```

# Test source

```ts
  1  | import { chromium, type Browser, type Page } from '@playwright/test';
  2  | 
  3  | const CDP_ENDPOINT = 'http://127.0.0.1:9222';
  4  | const SETTLE_MS = 1500;
  5  | 
  6  | export async function connectToApp(): Promise<{ browser: Browser; page: Page }> {
  7  |   const browser = await chromium.connectOverCDP(CDP_ENDPOINT);
  8  |   const defaultContext = browser.contexts()[0];
  9  | 
  10 |   if (!defaultContext) {
  11 |     throw new Error('No browser context found. Is the app running with "npm run dev:debug"?');
  12 |   }
  13 | 
  14 |   const pages = defaultContext.pages();
  15 |   const page = pages.find(p => p.url().includes('index.html')) || pages[0];
  16 | 
  17 |   if (!page) {
  18 |     throw new Error('No Electron renderer page found.');
  19 |   }
  20 | 
  21 |   return { browser, page };
  22 | }
  23 | 
  24 | export async function navigateTo(page: Page, hash: string): Promise<void> {
  25 |   const currentUrl = page.url();
  26 |   const baseUrl = currentUrl.split('#')[0];
  27 |   await page.goto(`${baseUrl}#${hash}`, { waitUntil: 'domcontentloaded' });
  28 |   await page.waitForTimeout(SETTLE_MS);
  29 | }
  30 | 
  31 | export async function assertNoError(page: Page): Promise<void> {
  32 |   const errorBoundary = page.locator('text=Something went wrong');
  33 |   const isVisible = await errorBoundary.isVisible().catch(() => false);
  34 |   if (isVisible) {
  35 |     const errorMsg = await page.locator('.glass-panel p').textContent().catch(() => 'unknown');
> 36 |     throw new Error(`ErrorBoundary triggered on ${page.url()}: ${errorMsg}`);
     |           ^ Error: ErrorBoundary triggered on file:///Users/eduardo.torres/Downloads/COE%20Operation%20Nexus/out/renderer/index.html#/path/insights: Minified React error #185; visit https://react.dev/errors/185 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
  37 |   }
  38 | }
  39 | 
  40 | export type ConsoleEntry = { type: string; text: string };
  41 | 
  42 | export function collectConsoleErrors(page: Page): ConsoleEntry[] {
  43 |   const errors: ConsoleEntry[] = [];
  44 |   page.on('console', msg => {
  45 |     if (msg.type() === 'error') {
  46 |       errors.push({ type: msg.type(), text: msg.text() });
  47 |     }
  48 |   });
  49 |   page.on('pageerror', err => {
  50 |     errors.push({ type: 'pageerror', text: err.message });
  51 |   });
  52 |   return errors;
  53 | }
  54 | 
  55 | const IGNORED_CONSOLE_PATTERNS = [
  56 |   'Electron Security Warning',
  57 |   'Download the React DevTools',
  58 |   'net::ERR_',
  59 |   'favicon.ico',
  60 | ];
  61 | 
  62 | export function filterRealErrors(errors: ConsoleEntry[]): ConsoleEntry[] {
  63 |   return errors.filter(e =>
  64 |     !IGNORED_CONSOLE_PATTERNS.some(pattern => e.text.includes(pattern))
  65 |   );
  66 | }
  67 | 
```