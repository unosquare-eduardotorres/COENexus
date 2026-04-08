import { test, expect, _electron as electron } from '@playwright/test';

test('should launch app and show landing page', async () => {
  const app = await electron.launch({ args: ['.'] });
  const page = await app.firstWindow();
  await expect(page.locator('text=Operation Nexus')).toBeVisible();
  await app.close();
});

test('should navigate to resume app', async () => {
  const app = await electron.launch({ args: ['.'] });
  const page = await app.firstWindow();
  await page.click('[data-testid="app-card-resume"]');
  await expect(page).toHaveURL(/#\/resume/);
  await app.close();
});
