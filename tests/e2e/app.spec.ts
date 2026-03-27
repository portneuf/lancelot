import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

test.describe('Lancelot App', () => {
  test('should show file open page on startup', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/file\/open/);
    await expect(page.getByText('Open Inspection File')).toBeVisible();
  });

  test('should navigate via NavRail', async ({ page }) => {
    await page.goto('/');

    // Click Settings
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByText('Theme')).toBeVisible();
  });

  test('should switch themes', async ({ page }) => {
    await page.goto('/settings');

    // Click Dark theme
    await page.getByRole('button', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Click Light theme
    await page.getByRole('button', { name: 'Light' }).click();
    await expect(page.locator('html')).toHaveClass(/light/);
  });

  test('should redirect guarded routes to file/open when no file loaded', async ({ page }) => {
    await page.goto('/wafer/map');
    await expect(page).toHaveURL(/\/file\/open/);
  });

  test('should show empty states on analysis pages', async ({ page }) => {
    await page.goto('/analysis/pareto');
    // Should redirect to file/open since no file is loaded
    await expect(page).toHaveURL(/\/file\/open/);
  });

  test('should load a KLARF file via drag and drop', async ({ page }) => {
    await page.goto('/file/open');

    // Read the fixture file
    const fixturePath = resolve(__dirname, '../fixtures/sample-v12.klarf');
    const content = readFileSync(fixturePath, 'utf-8');

    // Create a file and simulate drop
    const dataTransfer = await page.evaluateHandle((text) => {
      const dt = new DataTransfer();
      const file = new File([text], 'sample-v12.klarf', { type: 'text/plain' });
      dt.items.add(file);
      return dt;
    }, content);

    const dropZone = page.locator('[class*="border-dashed"]');
    await dropZone.dispatchEvent('drop', { dataTransfer });

    // Should navigate to wafer map after successful parse
    await expect(page).toHaveURL(/\/wafer\/map/, { timeout: 10000 });
  });

  test('should display defect data after file load', async ({ page }) => {
    await page.goto('/file/open');

    const fixturePath = resolve(__dirname, '../fixtures/sample-v12.klarf');
    const content = readFileSync(fixturePath, 'utf-8');

    const dataTransfer = await page.evaluateHandle((text) => {
      const dt = new DataTransfer();
      const file = new File([text], 'sample-v12.klarf', { type: 'text/plain' });
      dt.items.add(file);
      return dt;
    }, content);

    const dropZone = page.locator('[class*="border-dashed"]');
    await dropZone.dispatchEvent('drop', { dataTransfer });

    await expect(page).toHaveURL(/\/wafer\/map/, { timeout: 10000 });

    // Navigate to defects
    await page.getByRole('link', { name: /defects/i }).click();
    await expect(page).toHaveURL(/\/inspection\/defects/);

    // Should show defect count
    await expect(page.getByText(/10 defects/)).toBeVisible();
  });
});
