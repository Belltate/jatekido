import { defineConfig } from '@playwright/test';

/** Füsttesztek a valódi Electron-ablakon. Futtatás: `npm run e2e` (közben ablakok nyílnak meg). */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  use: { actionTimeout: 5_000 },
});
