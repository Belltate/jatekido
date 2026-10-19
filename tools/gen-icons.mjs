/**
 * Az ikonok előállítása kódból, függőség nélkül (a Desktop Defender tools/genIcons.ts mintájára):
 * apró PNG-kódoló és 4×4-es túlmintavételezett raszterizáló.
 * Futtatás: `npm run icons`. Kimenet: build/icon.png (Windows-telepítő) és web/icons/ (telefonos app).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bitmélység
  ihdr[9] = 6; // RGBA
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

// ---- alakzatok, egységnyi [0,1]² koordinátákban
const everywhere = () => true;
const circle = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const roundRect = (x0, y0, x1, y1, r) => (x, y) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
/** Óramutató a középpontból: `angle` a 12 órától az óramutató járása szerint, `length` hosszú, `width` vastag. */
const hand = (angle, length, width) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const mx = 0.5 + (length / 2) * s;
  const my = 0.5 - (length / 2) * c;
  return (x, y) => {
    const dx = x - mx;
    const dy = y - my;
    return Math.abs(dx * c + dy * s) <= width / 2 && Math.abs(-dx * s + dy * c) <= length / 2;
  };
};

const TRANSPARENT = [0, 0, 0, 0];

function render(size, layers) {
  const ss = 4;
  const out = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = (px + (sx + 0.5) / ss) / size;
          const y = (py + (sy + 0.5) / ss) / size;
          let c = TRANSPARENT;
          for (const l of layers) if (l.inside(x, y)) c = l.color;
          const al = c[3] / 255;
          r += c[0] * al;
          g += c[1] * al;
          b += c[2] * al;
          a += al;
        }
      }
      const i = (py * size + px) * 4;
      out[i] = a > 0 ? Math.round(r / a) : 0;
      out[i + 1] = a > 0 ? Math.round(g / a) : 0;
      out[i + 2] = a > 0 ? Math.round(b / a) : 0;
      out[i + 3] = Math.round((a / (ss * ss)) * 255);
    }
  }
  return out;
}

const BG = hex('#101418');
const FACE = hex('#f2f4f8');
const DOT_COLORS = ['#ffb547', '#3ddc97', '#4da3ff'];

/**
 * Óralap, a peremén három színes pont: a körbe forgó nevek. Minden a középponttól 0,35-ön belül van,
 * így a telefonok kerek vagy csepp alakú maszkja (0,4-es biztonsági kör) sem vág bele.
 * `fullBleed`: teljes négyzetes háttér (maszkolható és iPhone-ikon), különben lekerekített, átlátszó sarkú.
 */
function appIcon(fullBleed) {
  const dots = DOT_COLORS.flatMap((color, i) => {
    const a = (i * 2 * Math.PI) / 3;
    const x = 0.5 + 0.275 * Math.sin(a);
    const y = 0.5 - 0.275 * Math.cos(a);
    return [
      { inside: circle(x, y, 0.075), color: BG },
      { inside: circle(x, y, 0.06), color: hex(color) },
    ];
  });
  return [
    { inside: fullBleed ? everywhere : roundRect(0.03, 0.03, 0.97, 0.97, 0.22), color: BG },
    { inside: circle(0.5, 0.5, 0.3), color: FACE },
    { inside: circle(0.5, 0.5, 0.25), color: BG },
    { inside: hand(0, 0.17, 0.04), color: FACE },
    { inside: hand(Math.PI / 3, 0.12, 0.045), color: FACE },
    { inside: circle(0.5, 0.5, 0.035), color: FACE },
    ...dots,
  ];
}

const OUTPUTS = [
  ['build/icon.png', 512, false],
  ['web/icons/icon-192.png', 192, false],
  ['web/icons/icon-512.png', 512, false],
  ['web/icons/maskable-512.png', 512, true],
  ['web/icons/apple-touch-icon.png', 180, true],
];

for (const [rel, size, fullBleed] of OUTPUTS) {
  const file = join(ROOT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, encodePng(size, size, render(size, appIcon(fullBleed))));
  console.log('Kész:', rel);
}
