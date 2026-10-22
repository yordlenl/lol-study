// 產生主畫面圖示（PNG）。改了圖案再執行 npm run icons，產生的檔案要一起存進倉庫。
import { mkdirSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';

const SIZES = [180, 192, 512];
const SUPERSAMPLE = 4;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const GREEN = hex('#2b8a6e');
const GREEN_DARK = hex('#237259');
const WHITE = hex('#ffffff');

// 點 (px, py) 到線段 (ax, ay)-(bx, by) 的距離
function segmentDistance(px, py, ax, ay, bx, by) {
  const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
  return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
}

// 座標 x、y 都在 0～1 之間，回傳該點的顏色。
// 圖案：綠色漸層底、白色圓角卡片、卡片上一個綠色打勾。
function paint(x, y) {
  const halfW = 0.26;
  const halfH = 0.3;
  const radius = 0.07;
  const qx = Math.max(Math.abs(x - 0.5) - (halfW - radius), 0);
  const qy = Math.max(Math.abs(y - 0.5) - (halfH - radius), 0);
  const inCard = Math.hypot(qx, qy) < radius;
  if (!inCard) return GREEN.map((top, i) => top + (GREEN_DARK[i] - top) * y);
  const tick = Math.min(
    segmentDistance(x, y, 0.37, 0.51, 0.46, 0.6),
    segmentDistance(x, y, 0.46, 0.6, 0.64, 0.41),
  );
  return tick < 0.035 ? GREEN : WHITE;
}

function render(size) {
  const row = size * 3 + 1;
  const raw = Buffer.alloc(row * size);
  for (let py = 0; py < size; py++) {
    raw[py * row] = 0;
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const c = paint((px + (sx + 0.5) / SUPERSAMPLE) / size, (py + (sy + 0.5) / SUPERSAMPLE) / size);
          for (let i = 0; i < 3; i++) sum[i] += c[i];
        }
      }
      for (let i = 0; i < 3; i++) {
        raw[py * row + 1 + px * 3 + i] = Math.round(sum[i] / SUPERSAMPLE ** 2);
      }
    }
  }
  return encodePng(size, raw);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, raw) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 每個顏色 8 位元
  header[9] = 2; // RGB，不透明（iPadOS 主畫面圖示不能有透明）
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = new URL('../public/icons/', import.meta.url);
mkdirSync(outDir, { recursive: true });
for (const size of SIZES) {
  writeFileSync(new URL(`icon-${size}.png`, outDir), render(size));
  console.log(`public/icons/icon-${size}.png`);
}
