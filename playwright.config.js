import { defineConfig, devices } from '@playwright/test';

/**
 * Füsttesztek. `electron`: a valódi Windows-ablak. `web`: a telefonos app telefonméretű Edge-ben;
 * a gépre telepített Edge-et használja, böngészőletöltés nem kell. Futtatás: `npm run e2e`.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  use: { actionTimeout: 5_000 },
  projects: [
    { name: 'electron', testMatch: /app\.spec\.js$/ },
    {
      name: 'web',
      testMatch: /web\.spec\.js$/,
      use: { ...devices['Pixel 7'], channel: 'msedge', baseURL: 'http://127.0.0.1:4173' },
    },
  ],
  webServer: {
    command: 'node tools/serve.mjs',
    env: { PORT: '4173' },
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
