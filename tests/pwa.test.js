import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(path, 'utf8');

describe('telefonos app (PWA)', () => {
  const ASSETS = JSON.parse(read('web/sw.js').match(/const ASSETS = (\[[\s\S]*?\]);/)[1]);

  it('minden előre eltárolt fájl létezik', () => {
    for (const asset of ASSETS.filter((a) => a !== './')) expect(existsSync(`web/${asset}`), asset).toBe(true);
  });

  it('minden program- és stílusfájl előre el van tárolva (különben offline nem indulna)', () => {
    const files = readdirSync('web').filter((f) => /\.(html|css|js|webmanifest)$/.test(f) && f !== 'sw.js');
    for (const f of files) expect(ASSETS, f).toContain(f);
  });

  it('minden ikon előre el van tárolva', () => {
    for (const f of readdirSync('web/icons')) expect(ASSETS).toContain(`icons/${f}`);
  });

  it('a manifest telepíthető: név, kezdőcím, önálló ablak, 192-es, 512-es és maszkolható ikon', () => {
    const manifest = JSON.parse(read('web/manifest.webmanifest'));
    expect(manifest.name).toBe('Játékidő Elosztó');
    expect(manifest.start_url).toBe('./');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) expect(existsSync(`web/${icon.src}`), icon.src).toBe(true);
  });

  it('az oldal hivatkozik a manifestre és az iPhone-ikonra', () => {
    const html = read('web/index.html');
    expect(html).toContain('<link rel="manifest" href="manifest.webmanifest" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />');
  });
});
