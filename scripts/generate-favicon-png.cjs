/**
 * Generates public/favicon.png from the clock design (black square, white clock 20:23).
 * Uses only Node built-ins. Run: node scripts/generate-favicon-png.cjs
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const W = 32;
const H = 32;
const cx = 16;
const cy = 16;
const r = 10;

function createPNGChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const chunk = Buffer.concat([Buffer.from(type), data]);
  const crc = crc32(Buffer.concat([Buffer.from(type), data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, chunk, crcBuf]);
}

function crc32(buf) {
  let c = 0xffffffff;
  const table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c;
    }
    return t;
  })();
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

// RGBA image, row-major, row filter byte then 32*4 bytes per row
const rawRows = [];
const px = (x, y) => {
  if (x < 0 || x >= W || y < 0 || y >= H) return null;
  return rawRows[y] ? rawRows[y][x] : null;
};
const set = (x, y, r, g, b, a) => {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const row = rawRows[y];
  if (!row) return;
  const i = x * 4;
  row[i] = r;
  row[i + 1] = g;
  row[i + 2] = b;
  row[i + 3] = a;
};

// Initialize black
for (let y = 0; y < H; y++) {
  const row = Buffer.alloc(1 + W * 4);
  row[0] = 0; // filter: None
  for (let x = 0; x < W; x++) {
    row[1 + x * 4] = 0;
    row[2 + x * 4] = 0;
    row[3 + x * 4] = 0;
    row[4 + x * 4] = 255;
  }
  rawRows.push(row);
}

// Helper to set pixel from flat index in row (row is filter + rgba)
const setPixel = (y, x, r, g, b) => {
  const row = rawRows[y];
  if (!row || x < 0 || x >= W) return;
  const i = 1 + x * 4;
  row[i] = r;
  row[i + 1] = g;
  row[i + 2] = b;
};

// Draw circle outline (stroke ~1.5px)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (Math.abs(d - r) < 1.2) setPixel(y, x, 255, 255, 255);
  }
}

// Bresenham line
function line(x0, y0, x1, y1) {
  const round = (v) => Math.round(v);
  x0 = round(x0);
  y0 = round(y0);
  x1 = round(x1);
  y1 = round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    setPixel(y0, x0, 255, 255, 255);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

// Hands (scale from 0-32 coords; center 16,16)
// Hour: 16,16 to 11.26,14.42
line(16, 16, 11.26, 14.42);
// Minute: 16,16 to 20.68, 21.2
line(16, 16, 20.68, 21.2);

// Build IDAT (deflate of raw scanlines)
const rawData = Buffer.concat(rawRows);
const deflated = zlib.deflateSync(rawData, { level: 9 });

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

const out = Buffer.concat([
  signature,
  createPNGChunk('IHDR', ihdr),
  createPNGChunk('IDAT', deflated),
  createPNGChunk('IEND', Buffer.alloc(0)),
]);

const outPath = path.join(__dirname, '..', 'public', 'favicon.png');
fs.writeFileSync(outPath, out);
console.log('Wrote', outPath);
