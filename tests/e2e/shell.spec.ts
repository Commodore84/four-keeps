import { test, expect } from '@playwright/test';

test('navigation works and DM input persists across views', async ({ page }) => {
  await page.goto('/four-keeps/');
  await expect(page.getByRole('heading', { name: 'Four Keeps' })).toBeVisible();
  await page.getByLabel('Message the Dungeon Master').fill('I inspect the road.');
  await page.getByRole('button', { name: 'Party', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The Party' })).toBeVisible();
  await expect(page.getByLabel('Message the Dungeon Master')).toHaveValue('I inspect the road.');
  await page.getByRole('button', { name: 'Send message to Dungeon Master' }).click();
  await expect(page.getByRole('status')).toContainText('not connected yet');
});
