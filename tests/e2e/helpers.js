import { _electron as electron } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// path.resolve: nincs záró "\" – a Playwright Windowson "…\" formában idézné, és az elrontaná az útvonalat
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Elindítja a Windows-programot lenémítva, és visszaadja az ablakot meg a benne
 * keletkezett hibák listáját (a tesztek végén üresnek kell lennie).
 */
export async function launch() {
  const env = { ...process.env };
  // a VS Code-ból indított folyamatok öröklik; vele az Electron sima Node-ként futna
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: [ROOT], env });
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', (err) => errors.push(err.message));
  await win.waitForSelector('#setup-form');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.setAudioMuted(true));
  return { app, win, errors };
}

/** Kitölti a beállításokat; a `total` és a `turn` [óra, perc, mp] hármas. */
export async function fillSetup(page, { names, total, turn }) {
  await page.fill('#names', names.join('\n'));
  for (const [i, unit] of ['h', 'm', 's'].entries()) {
    await page.fill(`#total-${unit}`, String(total[i]));
    await page.fill(`#turn-${unit}`, String(turn[i]));
  }
}
