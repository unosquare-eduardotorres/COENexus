# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> Hub: landing page loads
- Location: e2e/cdp/navigation.spec.ts:50:5

# Error details

```
Error: browserType.connectOverCDP: Unexpected status 404 when connecting to http://127.0.0.1:9222/json/version/.
This does not look like a DevTools server, try connecting via ws://.
Call log:
  - <ws preparing> retrieving websocket url from http://127.0.0.1:9222

```

```
TypeError: Cannot read properties of undefined (reading 'url')
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
> 25 |   const currentUrl = page.url();
     |                           ^ TypeError: Cannot read properties of undefined (reading 'url')
  26 |   const baseUrl = currentUrl.split('#')[0];
  27 |   await page.goto(`${baseUrl}#${hash}`, { waitUntil: 'domcontentloaded' });
  28 |   await page.waitForTimeout(SETTLE_MS);
  29 | }
  30 | 
  31 | export async function clickIntentCard(page: Page, title: string): Promise<void> {
  32 |   await navigateTo(page, '/resume/match');
  33 |   const card = page.locator(`button:has-text("${title}")`);
  34 |   await card.click();
  35 |   await page.waitForTimeout(SETTLE_MS);
  36 | }
  37 | 
  38 | export async function assertNoError(page: Page): Promise<void> {
  39 |   const errorBoundary = page.locator('text=Something went wrong');
  40 |   const isVisible = await errorBoundary.isVisible().catch(() => false);
  41 |   if (isVisible) {
  42 |     const errorMsg = await page.locator('.glass-panel p').textContent().catch(() => 'unknown');
  43 |     throw new Error(`ErrorBoundary triggered on ${page.url()}: ${errorMsg}`);
  44 |   }
  45 | }
  46 | 
  47 | export type ConsoleEntry = { type: string; text: string };
  48 | 
  49 | export function collectConsoleErrors(page: Page): ConsoleEntry[] {
  50 |   const errors: ConsoleEntry[] = [];
  51 |   page.on('console', msg => {
  52 |     if (msg.type() === 'error') {
  53 |       errors.push({ type: msg.type(), text: msg.text() });
  54 |     }
  55 |   });
  56 |   page.on('pageerror', err => {
  57 |     errors.push({ type: 'pageerror', text: err.message });
  58 |   });
  59 |   return errors;
  60 | }
  61 | 
  62 | export async function resetErrorBoundary(page: Page): Promise<void> {
  63 |   const retryButton = page.locator('button:has-text("Retry")');
  64 |   const isVisible = await retryButton.isVisible().catch(() => false);
  65 |   if (isVisible) {
  66 |     await retryButton.click();
  67 |     await page.waitForTimeout(500);
  68 |   }
  69 | }
  70 | 
  71 | const IGNORED_CONSOLE_PATTERNS = [
  72 |   'Electron Security Warning',
  73 |   'Download the React DevTools',
  74 |   'net::ERR_',
  75 |   'favicon.ico',
  76 | ];
  77 | 
  78 | export function filterRealErrors(errors: ConsoleEntry[]): ConsoleEntry[] {
  79 |   return errors.filter(e =>
  80 |     !IGNORED_CONSOLE_PATTERNS.some(pattern => e.text.includes(pattern))
  81 |   );
  82 | }
  83 | 
```