import { expect, test } from '@playwright/test';
import { fillSetup } from './helpers.js';

// A `web` projekt: telefonméretű Edge (Pixel 7), a tools/serve.mjs-sel kiszolgált web/ mappán.

const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('telefonon is körbe forognak a nevek, és semmi nem lóg ki oldalra', async ({ page }) => {
  await page.goto('/');
  expect(await noSideScroll(page)).toBe(true);
  await fillSetup(page, { names: ['Anna', 'Bence'], total: [0, 0, 4], turn: [0, 0, 2] });
  await page.click('#start');
  await expect(page.locator('#current-name')).toHaveText('Anna');
  expect(await noSideScroll(page)).toBe(true);
  await expect(page.locator('#handover')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#current-name')).toHaveText('Bence');
  expect(await noSideScroll(page)).toBe(true);
  await page.tap('#handover');
  await expect(page.locator('#handover')).toBeHidden();
  await expect(page.locator('#done')).toBeVisible({ timeout: 4000 });
});

test('böngészőben látszik a telepítési súgó', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#install-help')).toBeVisible();
});

test('egyszeri megnyitás után internet nélkül is betölt', async ({ page, context }) => {
  await page.goto('/');
  const cached = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const cache = await caches.open('jatekido-v2');
    return (await cache.keys()).length;
  });
  expect(cached).toBeGreaterThanOrEqual(13);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#setup-form')).toBeVisible();
});
