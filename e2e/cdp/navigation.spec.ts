import { test, expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import {
  connectToApp,
  navigateTo,
  assertNoError,
  collectConsoleErrors,
  filterRealErrors,
  resetErrorBoundary,
  type ConsoleEntry,
} from './cdp-setup';

let browser: Browser;
let page: Page;
let consoleErrors: ConsoleEntry[];

test.beforeAll(async () => {
  ({ browser, page } = await connectToApp());
});

test.afterAll(async () => {
  await navigateTo(page, '/');
  await browser.close();
});

test.beforeEach(async () => {
  await resetErrorBoundary(page);
  consoleErrors = collectConsoleErrors(page);
});

test.afterEach(async ({}, testInfo) => {
  await assertNoError(page);

  const realErrors = filterRealErrors(consoleErrors);
  if (realErrors.length > 0) {
    const summary = realErrors.map(e => `[${e.type}] ${e.text}`).join('\n');
    testInfo.annotations.push({ type: 'console-errors', description: summary });
    throw new Error(
      `Console errors on ${page.url()}:\n${summary}`
    );
  }

  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
});

// ── Hub ──

test('Hub: landing page loads', async () => {
  await navigateTo(page, '/');
  await expect(page.getByRole('heading', { name: 'Operation Nexus' })).toBeVisible();
});

// ── Resume App ──

test('Resume: home page', async () => {
  await navigateTo(page, '/resume');
  await expect(page).toHaveURL(/#\/resume/);
  await expect(page.locator('nav')).toBeVisible();
});

test('Resume: transform page', async () => {
  await navigateTo(page, '/resume/enhance');
  await expect(page).toHaveURL(/#\/resume\/enhance/);
});

test('Resume: transform history page', async () => {
  await navigateTo(page, '/resume/history');
  await expect(page).toHaveURL(/#\/resume\/history/);
});

test('Resume: match engine page', async () => {
  await navigateTo(page, '/resume/match');
  await expect(page).toHaveURL(/#\/resume\/match/);
});

test('Resume: batch page', async () => {
  await navigateTo(page, '/resume/batch');
  await expect(page).toHaveURL(/#\/resume\/batch/);
});

test('Resume: recruiter review page', async () => {
  await navigateTo(page, '/resume/review');
  await expect(page).toHaveURL(/#\/resume\/review/);
});

test('Resume: admin settings page', async () => {
  await navigateTo(page, '/resume/settings');
  await expect(page).toHaveURL(/#\/resume\/settings/);
});

// ── Data Sync App ──

test('DataSync: main page', async () => {
  await navigateTo(page, '/datasync');
  await expect(page).toHaveURL(/#\/datasync/);
});

// ── Command Center App ──

test('CommandCenter: home page', async () => {
  await navigateTo(page, '/command-center');
  await expect(page).toHaveURL(/#\/command-center/);
});

test('CommandCenter: open positions report', async () => {
  await navigateTo(page, '/command-center/open-positions');
  await expect(page).toHaveURL(/#\/command-center\/open-positions/);
});

test('CommandCenter: placements page', async () => {
  await navigateTo(page, '/command-center/placements');
  await expect(page).toHaveURL(/#\/command-center\/placements/);
});

test('CommandCenter: reallocation page', async () => {
  await navigateTo(page, '/command-center/reallocation');
  await expect(page).toHaveURL(/#\/command-center\/reallocation/);
});

// ── Agents App ──

test('Agents: landing page', async () => {
  await navigateTo(page, '/agents');
  await expect(page).toHaveURL(/#\/agents/);
});

test('Agents: Scout-9 pipeline', async () => {
  await navigateTo(page, '/agents/scout-9');
  await expect(page).toHaveURL(/#\/agents\/scout-9/);
});

test('Agents: Scout-9 reports', async () => {
  await navigateTo(page, '/agents/scout-9/reports');
  await expect(page).toHaveURL(/#\/agents\/scout-9\/reports/);
});

test('Agents: Scout-9 knowledge base', async () => {
  await navigateTo(page, '/agents/scout-9/brain');
  await expect(page).toHaveURL(/#\/agents\/scout-9\/brain/);
});

test('Agents: Scout-9 settings', async () => {
  await navigateTo(page, '/agents/scout-9/settings');
  await expect(page).toHaveURL(/#\/agents\/scout-9\/settings/);
});

// ── Path App ──

test('Path: developer dashboard', async () => {
  await navigateTo(page, '/path');
  await expect(page).toHaveURL(/#\/path/);
});

test('Path: DP portal', async () => {
  await navigateTo(page, '/path/dp-portal');
  await expect(page).toHaveURL(/#\/path\/dp-portal/);
});

test('Path: learning paths', async () => {
  await navigateTo(page, '/path/learning-paths');
  await expect(page).toHaveURL(/#\/path\/learning-paths/);
});

test('Path: insights', async () => {
  await navigateTo(page, '/path/insights');
  await expect(page).toHaveURL(/#\/path\/insights/);
});

test('Path: analytics', async () => {
  await navigateTo(page, '/path/analytics');
  await expect(page).toHaveURL(/#\/path\/analytics/);
});

test('Path: assessment queue', async () => {
  await navigateTo(page, '/path/assessment-queue');
  await expect(page).toHaveURL(/#\/path\/assessment-queue/);
});

test('Path: career ladders', async () => {
  await navigateTo(page, '/path/career-ladders');
  await expect(page).toHaveURL(/#\/path\/career-ladders/);
});

test('Path: skill taxonomy', async () => {
  await navigateTo(page, '/path/skill-taxonomy');
  await expect(page).toHaveURL(/#\/path\/skill-taxonomy/);
});

// ── Settings App ──

test('Settings: database settings', async () => {
  await navigateTo(page, '/settings');
  await expect(page).toHaveURL(/#\/settings/);
});
