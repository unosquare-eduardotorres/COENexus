import { chromium, type Browser, type Page } from '@playwright/test';

const CDP_ENDPOINT = 'http://127.0.0.1:9222';
const SETTLE_MS = 1500;

export async function connectToApp(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.connectOverCDP(CDP_ENDPOINT);
  const defaultContext = browser.contexts()[0];

  if (!defaultContext) {
    throw new Error('No browser context found. Is the app running with "npm run dev:debug"?');
  }

  const pages = defaultContext.pages();
  const page = pages.find(p => p.url().includes('index.html')) || pages[0];

  if (!page) {
    throw new Error('No Electron renderer page found.');
  }

  return { browser, page };
}

export async function navigateTo(page: Page, hash: string): Promise<void> {
  const currentUrl = page.url();
  const baseUrl = currentUrl.split('#')[0];
  await page.goto(`${baseUrl}#${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(SETTLE_MS);
}

export async function assertNoError(page: Page): Promise<void> {
  const errorBoundary = page.locator('text=Something went wrong');
  const isVisible = await errorBoundary.isVisible().catch(() => false);
  if (isVisible) {
    const errorMsg = await page.locator('.glass-panel p').textContent().catch(() => 'unknown');
    throw new Error(`ErrorBoundary triggered on ${page.url()}: ${errorMsg}`);
  }
}

export type ConsoleEntry = { type: string; text: string };

export function collectConsoleErrors(page: Page): ConsoleEntry[] {
  const errors: ConsoleEntry[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on('pageerror', err => {
    errors.push({ type: 'pageerror', text: err.message });
  });
  return errors;
}

export async function resetErrorBoundary(page: Page): Promise<void> {
  const retryButton = page.locator('button:has-text("Retry")');
  const isVisible = await retryButton.isVisible().catch(() => false);
  if (isVisible) {
    await retryButton.click();
    await page.waitForTimeout(500);
  }
}

const IGNORED_CONSOLE_PATTERNS = [
  'Electron Security Warning',
  'Download the React DevTools',
  'net::ERR_',
  'favicon.ico',
];

export function filterRealErrors(errors: ConsoleEntry[]): ConsoleEntry[] {
  return errors.filter(e =>
    !IGNORED_CONSOLE_PATTERNS.some(pattern => e.text.includes(pattern))
  );
}
