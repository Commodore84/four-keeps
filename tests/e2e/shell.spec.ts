import { test, expect } from '@playwright/test';

test('creates a local campaign and restores its journal after reload', async ({ page }) => {
  await page.goto('/four-keeps/');
  await expect(page.getByRole('heading', { name: 'Four Keeps' })).toBeVisible();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(page.getByText('Campaign saved on this device.')).toBeVisible();
  await page.getByLabel('Message the Dungeon Master').fill('I inspect the road.');
  await page.getByRole('button', { name: 'Party', exact: true }).click();
  await expect(page.getByLabel('Message the Dungeon Master')).toHaveValue('I inspect the road.');
  await page.getByRole('button', { name: 'Send message to Dungeon Master' }).click();
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(page.getByText('I inspect the road.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(page.getByText('I inspect the road.')).toBeVisible();
});
