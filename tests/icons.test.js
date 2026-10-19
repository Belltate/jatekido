import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

/** A tools/gen-icons.mjs kimenetének beolvasása: méret és egy képpont átlátszósága. */
function readPng(path) {
  const buf = readFileSync(path);
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const idat = [];
  for (let p = 8; p < buf.length; ) {
    const len = buf.readUInt32BE(p);
    if (buf.toString('ascii', p + 4, p + 8) === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  // soronként 1 szűrőbájt (a kódolónk mindig 0-t ír) + szélesség × 4 bájt RGBA
  const alphaAt = (x, y) => raw[y * (width * 4 + 1) + 1 + x * 4 + 3];
  return { width, height, alphaAt };
}

describe('ikonok', () => {
  it.each([
    ['build/icon.png', 512, false],
    ['web/icons/icon-192.png', 192, false],
    ['web/icons/icon-512.png', 512, false],
    ['web/icons/maskable-512.png', 512, true],
    ['web/icons/apple-touch-icon.png', 180, true],
  ])('%s', (path, size, fullBleed) => {
    const png = readPng(path);
    expect(png.width).toBe(size);
    expect(png.height).toBe(size);
    // a közepe mindig fedett; a sarka a lekerekített ikonon átlátszó, a teljes kitöltésűn fedett
    expect(png.alphaAt(size / 2, size / 2)).toBe(255);
    expect(png.alphaAt(0, 0)).toBe(fullBleed ? 255 : 0);
  });
});
