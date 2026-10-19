import { expect, test } from '@playwright/test';
import { fillSetup, launch } from './helpers.js';

test('a nevek körbe forognak, amíg le nem telik a teljes idő', async () => {
  const { app, win, errors } = await launch();
  await fillSetup(win, { names: ['Anna', 'Bence', 'Csaba'], total: [0, 0, 8], turn: [0, 0, 2] });
  await win.click('#start');

  const name = win.locator('#current-name');
  await expect(name).toHaveText('Anna');
  await expect(win.locator('#total-time')).toHaveText(/^0:0[78]$/);
  await expect(win.locator('#turn-time')).toHaveText(/^0:0[12]$/);
  await expect(name).toHaveText('Bence', { timeout: 4000 });
  await expect(name).toHaveText('Csaba', { timeout: 4000 });
  await expect(name).toHaveText('Anna', { timeout: 4000 });
  await expect(win.locator('#done')).toBeVisible({ timeout: 4000 });
  await expect(win.locator('#done')).toContainText('Letelt az idő!');

  await win.click('#again');
  await expect(win.locator('#setup')).toBeVisible();
  await expect(win.locator('#names')).toHaveValue('Anna\nBence\nCsaba');
  expect(errors).toEqual([]);
  await app.close();
});

test('név nélkül nem indul el, és kiírja, mi a baj', async () => {
  const { app, win, errors } = await launch();
  await fillSetup(win, { names: [], total: [0, 0, 8], turn: [0, 0, 2] });
  await win.click('#start');
  await expect(win.locator('#error')).toHaveText('Adj meg legalább egy nevet.');
  await expect(win.locator('#run')).toBeHidden();
  expect(errors).toEqual([]);
  await app.close();
});

test('a Leállítás megerősítést kér: Mégse után megy tovább, Igen után vissza a beállításokhoz', async () => {
  const { app, win, errors } = await launch();
  await fillSetup(win, { names: ['Anna'], total: [0, 0, 30], turn: [0, 0, 10] });
  await win.click('#start');
  await win.click('#stop');
  await expect(win.locator('#stop-confirm')).toBeVisible();
  await win.click('#stop-no');
  await expect(win.locator('#stop-confirm')).toBeHidden();
  await expect(win.locator('#run')).toBeVisible();
  await win.click('#stop');
  await win.click('#stop-yes');
  await expect(win.locator('#setup')).toBeVisible();
  expect(errors).toEqual([]);
  await app.close();
});

test('a Szünet megállítja mindkét időzítőt, a Folytatás onnan viszi tovább', async () => {
  const { app, win, errors } = await launch();
  await fillSetup(win, { names: ['Anna', 'Bence'], total: [0, 0, 30], turn: [0, 0, 10] });
  await win.click('#start');
  await win.click('#pause');
  await expect(win.locator('#pause')).toHaveText('Folytatás');
  await expect(win.locator('#paused-label')).toBeVisible();

  const total = await win.locator('#total-time').textContent();
  const turn = await win.locator('#turn-time').textContent();
  await win.waitForTimeout(2500);
  await expect(win.locator('#total-time')).toHaveText(total);
  await expect(win.locator('#turn-time')).toHaveText(turn);

  await win.click('#pause');
  await expect(win.locator('#pause')).toHaveText('Szünet');
  await expect(win.locator('#paused-label')).toBeHidden();
  await expect(win.locator('#total-time')).not.toHaveText(total, { timeout: 3000 });
  expect(errors).toEqual([]);
  await app.close();
});

test('az asztali programban nincs telepítési súgó', async () => {
  const { app, win, errors } = await launch();
  await expect(win.locator('#install-help')).toHaveCount(1);
  await expect(win.locator('#install-help')).toBeHidden();
  expect(errors).toEqual([]);
  await app.close();
});
