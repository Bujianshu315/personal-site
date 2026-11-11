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
const COLS = 78;
const ROWS = Math.max(10, Math.round(COLS * (height / width) * 0.55));
const cellW = width / COLS, cellH = height / ROWS;
// yetone 式色块梯度：暗部实心块（█）、中间调半色调网格（▒░）、亮部留白
// 块字符铺满整个字格，出来的是"版画色块"而不是细字符噪点
const RAMP = ' ░▒▓█';

// ---- 第一遍：算出每格的"暗度"（0=最亮 1=最暗），白底剔除记为 -1 ----
// 关键修正：ASCII 艺术的正确语义是暗部用重字符、亮部留白。
// （此前版本直接用亮度索引 RAMP，明暗一直是反的——黑矩形映射成了空格。）
const darks = Array.from({ length: ROWS }, () => new Array(COLS).fill(-1));
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    let sum = 0, n = 0, bg = 0, tot = 0;
    const x0 = Math.floor(c * cellW), x1 = Math.min(width, Math.ceil((c + 1) * cellW));
    const y0 = Math.floor(r * cellH), y1 = Math.min(height, Math.ceil((r + 1) * cellH));
    for (let y = y0; y < y1; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        const p = pix(x, y); tot++;
        const mx = Math.max(p[0], p[1], p[2]), mn = Math.min(p[0], p[1], p[2]);
        if (mx - mn < 40 && mn > 170 && p[3] > 127) { bg++; continue; } // 白底剔除（容忍轻微色偏）
        const lum = (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
        const al = p[3] / 255;
        sum += lum * al; n += al;
      }
    }
    if (!n || bg / tot > 0.6) continue; // 背景
    darks[r][c] = 1 - Math.max(0, Math.min(1, (sum / n - 0.06) / 0.86));
  }
}

// ---- 自适应直方图拉伸：anime 原图是"平色调"，先把主体明暗拉开再走三段映射 ----
const vals = darks.flat().filter((v) => v >= 0).sort((a, b) => a - b);
const pLow = vals[Math.floor(vals.length * 0.18)] ?? 0;
const pHigh = vals[Math.floor(vals.length * 0.82)] ?? 1;

// ---- 第二遍：三段映射 alma 式对比：亮部留白（呼吸感）、暗部压实（黑矩形=连续█）、中间 gamma ----
// 背景格输出 '.' 底网标记（画布层用它铺"屏幕点亮"的半调底网，脸部亮部则镂空发光）
const rows = [];
for (let r = 0; r < ROWS; r++) {
  let line = '';
  for (let c = 0; c < COLS; c++) {
    const d = darks[r][c];
    if (d < 0) { line += '.'; continue; } // 白底背景 → 底网标记
    let v = Math.max(0, Math.min(1, (d - pLow) / Math.max(0.04, pHigh - pLow)));
    if (v > 0.80) v = 1;
    else if (v < 0.22) v = 0;
    else v = Math.pow((v - 0.22) / 0.58, 1.25);
    line += RAMP[Math.round(v * (RAMP.length - 1))];
  }
  rows.push(line);
}

// 孤立半调网格降噪：最轻的 ░ 且 8 邻域里非空格不足 2 个 -> 视为噪点抹掉
const LIGHT = 1;
const chAt = (r, c) => (rows[r] && rows[r][c]) ?? ' ';
for (let r = 0; r < rows.length; r++) {
  for (let c = 0; c < rows[r].length; c++) {
    const ch = chAt(r, c);
    if (ch === ' ' || ch === RAMP[0]) continue;
    const idx = RAMP.indexOf(ch);
    if (idx < 0 || idx > LIGHT) continue;
    let neighbors = 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        if ((dr || dc) && chAt(r + dr, c + dc) !== ' ') neighbors++;
    if (neighbors < 2) rows[r] = rows[r].slice(0, c) + ' ' + rows[r].slice(c + 1);
  }
}
fs.writeFileSync(outPath, JSON.stringify({ cols: COLS, rows }, null, 1));
console.error(`avatar-ascii.json 已生成：源图 ${width}x${height} -> ${COLS}x${ROWS}`);
