import { expect, test } from '@playwright/test';

test.describe('TestNest smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads the application shell', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'TestNest' })).toBeVisible();
  });

  test('shows the dashboard by default', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 2, name: 'Dashboard' }),
    ).toBeVisible();
    await expect(page.getByText('Total Projects')).toBeVisible();
    await expect(page.getByRole('button', { name: 'No Run: 0' })).toBeVisible();
  });

  test('sidebar navigation works', async ({ page }) => {
    await page.getByRole('button', { name: 'Projects' }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Projects' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Test Cases' }).click();
    await expect(page.getByRole('heading', { name: 'Test Cases' })).toBeVisible();

    await page.getByRole('button', { name: 'Test Execution' }).click();
    await expect(
      page.getByRole('heading', { name: 'Test Execution' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Defects' }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Defects' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Reports' }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Reports' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Dashboard' }),
    ).toBeVisible();
  });
});
