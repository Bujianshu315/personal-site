// 头像 → ASCII 转换脚本（零依赖）
// 用法：node scripts/png2ascii.mjs [输入.png] [输出.json]
// 默认：public/avatar.png -> src/data/avatar-ascii.json
// 白色/浅灰背景自动剔除，亮度映射到字符梯度。换头像后重新跑一遍即可。
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inPath = process.argv[2] ?? path.join(root, 'public', 'avatar.png');
const outPath = process.argv[3] ?? path.join(root, 'src', 'data', 'avatar-ascii.json');

const buf = fs.readFileSync(inPath);
if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('不是 PNG 文件');
let off = 8, plte = null, trns = null, ihdr = null;
const idat = [];
while (off + 8 <= buf.length) {
  const len = buf.readUInt32BE(off);
  const type = buf.toString('ascii', off + 4, off + 8);
  const data = buf.subarray(off + 8, off + 8 + len);
  if (type === 'IHDR') ihdr = data;
  else if (type === 'PLTE') plte = data;
  else if (type === 'tRNS') trns = data;
  else if (type === 'IDAT') idat.push(data);
  else if (type === 'IEND') break;
  off += 12 + len;
}
const width = ihdr.readUInt32BE(0), height = ihdr.readUInt32BE(4);
const bitDepth = ihdr[8], colorType = ihdr[9], interlace = ihdr[12];
if (bitDepth !== 8) throw new Error('暂不支持位深 ' + bitDepth);
if (interlace) throw new Error('暂不支持隔行 PNG');
let bpp;
switch (colorType) {
  case 0: bpp = 1; break; case 2: bpp = 3; break; case 3: bpp = 1; break;
  case 4: bpp = 2; break; case 6: bpp = 4; break;
  default: throw new Error('暂不支持颜色类型 ' + colorType);
}
const raw = zlib.inflateSync(Buffer.concat(idat));
const stride = width * bpp;
const img = Buffer.alloc(height * stride);
let pos = 0;
for (let y = 0; y < height; y++) {
  const filter = raw[pos++];
  const row = img.subarray(y * stride, (y + 1) * stride);
  const prev = y > 0 ? img.subarray((y - 1) * stride, y * stride) : null;
  for (let x = 0; x < stride; x++) {
    const a = x >= bpp ? row[x - bpp] : 0;
    const b = prev ? prev[x] : 0;
    const c = prev && x >= bpp ? prev[x - bpp] : 0;
    let val = raw[pos + x] & 0xff;
    switch (filter) {
      case 0: break;
      case 1: val = (val + a) & 0xff; break;
      case 2: val = (val + b) & 0xff; break;
      case 3: val = (val + ((a + b) >> 1)) & 0xff; break;
      case 4: {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        val = (val + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff; break;
      }
    }
    row[x] = val;
  }
  pos += stride;
}
function pix(x, y) {
  const i = y * stride + x * bpp;
  switch (colorType) {
    case 0: { const g = img[i]; return [g, g, g, 255]; }
    case 2: return [img[i], img[i + 1], img[i + 2], 255];
    case 3: {
      const idx = img[i]; const o = idx * 3;
      const a = trns && idx < trns.length ? trns[idx] : 255;
      return [plte[o], plte[o + 1], plte[o + 2], a];
    }
    case 4: { const g = img[i]; return [g, g, g, img[i + 1]]; }
    case 6: return [img[i], img[i + 1], img[i + 2], img[i + 3]];
  }
}
const COLS = 96;
const ROWS = Math.max(10, Math.round(COLS * (height / width) * 0.55));
const cellW = width / COLS, cellH = height / ROWS;
// 更密的字符梯度（15 级）：中间调用 ;!| 撑起发丝，暗部 %#&@ 压实（眼部黑矩形是角色本体，会落成实块）
const RAMP = ' .·:;!|=+*x%#&@';
const rows = [];
for (let r = 0; r < ROWS; r++) {
  let line = '';
  for (let c = 0; c < COLS; c++) {
    let sum = 0, n = 0, bg = 0, tot = 0;
    const x0 = Math.floor(c * cellW), x1 = Math.min(width, Math.ceil((c + 1) * cellW));
    const y0 = Math.floor(r * cellH), y1 = Math.min(height, Math.ceil((r + 1) * cellH));
    for (let y = y0; y < y1; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        const p = pix(x, y); tot++;
        const mx = Math.max(p[0], p[1], p[2]), mn = Math.min(p[0], p[1], p[2]);
        if (mx - mn < 30 && mn > 180 && p[3] > 127) { bg++; continue; } // 白底剔除
        const lum = (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
        const al = p[3] / 255;
        sum += lum * al; n += al;
      }
    }
    let v;
    if (!n || bg / tot > 0.6) v = 0;
    else {
      v = sum / n;
      v = Math.max(0, Math.min(1, (v - 0.06) / 0.86));
      v = Math.pow(v, 0.95);
    }
    line += RAMP[Math.round(v * (RAMP.length - 1))];
  }
  rows.push(line);
}
fs.writeFileSync(outPath, JSON.stringify({ cols: COLS, rows }, null, 1));
console.error(`avatar-ascii.json 已生成：源图 ${width}x${height} -> ${COLS}x${ROWS}`);
