import { test, expect } from '@playwright/test';

test('creates a local campaign and restores its journal after reload', async ({ page }) => {
  await page.goto('/four-keeps/');
  await expect(page.getByRole('heading', { name: 'Four Keeps' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('button', { name: 'Adventure', exact: true }).click();
  await expect(page.getByText('Campaign saved on this device', { exact: false })).toBeVisible();
  await page.getByLabel('Message the Dungeon Master').fill('I inspect the road.');
  await page.getByRole('button', { name: 'Player', exact: true }).click();
  await expect(page.getByLabel('Message the Dungeon Master')).toHaveValue('I inspect the road.');
  await page.getByRole('button', { name: 'Send message to Dungeon Master' }).click();
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(page.getByText('I inspect the road.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(page.getByText('I inspect the road.')).toBeVisible();
});

test('training encounter starts, rolls initiative, and survives reload', async ({ page }) => {
  await page.goto('/four-keeps/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('New campaign name').fill('Browser combat smoke');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('button', { name: 'Adventure', exact: true }).click();
  await page.getByRole('button', { name: 'Start encounter training' }).click();
  await expect(page.getByRole('button', { name: 'Roll initiative (d20 + DEX)' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Roll initiative (d20 + DEX)' })).toBeVisible();
  await page.getByRole('button', { name: 'Roll initiative (d20 + DEX)' }).click();
  await expect(page.locator('[aria-label="Combat turn summary"]')).toBeVisible();
  await page.reload();
  await expect(page.locator('[aria-label="Combat turn summary"]')).toBeVisible();
});

test('navigation preserves unsent draft and a saved campaign after reload', async ({ page }) => {
  await page.goto('/four-keeps/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('New campaign name').fill('Browser persistence');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('button', { name: 'Adventure', exact: true }).click();
  await page.getByLabel('Message the Dungeon Master').fill('Draft before navigating');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.getByRole('button', { name: 'Adventure', exact: true }).click();
  await expect(page.getByLabel('Message the Dungeon Master')).toHaveValue('Draft before navigating');
  await page.reload();
  await expect(page.getByText('Browser persistence')).toBeVisible();
});

test('campaign deletion requires confirmation and preserves other campaigns', async ({ page }) => {
  await page.goto('/four-keeps/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('New campaign name').fill('Keep this campaign');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByLabel('New campaign name').fill('Delete this campaign');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('button', { name: 'Delete selected campaign' }).click();
  await expect(page.getByRole('group', { name: 'Confirm campaign deletion' })).toContainText('Delete this campaign');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByLabel('Active campaign')).toHaveValue(/.+/);
  await expect(page.getByLabel('Active campaign').locator('option')).toHaveCount(2);
  await page.getByRole('button', { name: 'Delete selected campaign' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByText('Campaign deleted from this device.')).toBeVisible();
  await expect(page.getByLabel('Active campaign').locator('option')).toHaveCount(1);
  await expect(page.getByLabel('Active campaign')).toContainText('Keep this campaign');
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Active campaign').locator('option')).toHaveCount(1);
  await page.getByRole('button', { name: 'Delete selected campaign' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByText('No campaign selected')).toBeVisible();
  await page.reload();
  await expect(page.getByText('No campaign selected')).toBeVisible();
});
