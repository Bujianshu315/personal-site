// 生成 og.png 分享卡（1200x630）：微信/QQ/Twitter 分享时的卡片图
// 设计 = 站点本身：暗厅 + 薄荷绿 CRT 银幕 + 粉字，全直角
// 用法：npm run og
import sharp from 'sharp';

const W = 1200, H = 630;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- 放映厅底色 -->
  <rect width="${W}" height="${H}" fill="#06080a"/>
  <!-- 环境光：银幕照亮的房间 -->
  <radialGradient id="amb" cx="0.5" cy="0.46" r="0.75">
    <stop offset="0" stop-color="#8fe0cd" stop-opacity="0.13"/>
    <stop offset="0.55" stop-color="#8fe0cd" stop-opacity="0.04"/>
    <stop offset="1" stop-color="#8fe0cd" stop-opacity="0"/>
  </radialGradient>
  <rect width="${W}" height="${H}" fill="url(#amb)"/>

  <!-- 银幕（全直角） -->
  <rect x="120" y="96" width="960" height="400" fill="#a9dcd0"/>
  <rect x="120" y="96" width="960" height="400" fill="#8cc9b9" opacity="0.35"/>
  <!-- 扫描线 -->
  <defs>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="1.5" fill="#0a1e22" opacity="0.10"/>
    </pattern>
    <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a9dcd0"/>
      <stop offset="1" stop-color="#8cc9b9"/>
    </linearGradient>
  </defs>
  <rect x="120" y="96" width="960" height="400" fill="url(#scr)"/>
  <rect x="120" y="96" width="960" height="400" fill="url(#scan)"/>
  <!-- 四角暗角 -->
  <rect x="120" y="96" width="960" height="400" fill="#062220" opacity="0.16" rx="0"/>

  <!-- 场刊目录（左栏小字） -->
  <text x="76" y="${H / 2}" fill="#4d5d67" font-family="Consolas, monospace" font-size="17" text-anchor="middle">
    <tspan x="76" dy="-44">关于我</tspan>
    <tspan x="76" dy="30">AI作品</tspan>
    <tspan x="76" dy="30">博客</tspan>
    <tspan x="76" dy="30">摄影作品</tspan>
  </text>
  <!-- 服务栏（右栏小字） -->
  <text x="1124" y="${H / 2}" fill="#4d5d67" font-family="Consolas, monospace" font-size="17" text-anchor="middle">
    <tspan x="1124" dy="-44">深浅色</tspan>
    <tspan x="1124" dy="30">照片地图</tspan>
    <tspan x="1124" dy="30">GitHub</tspan>
  </text>

  <!-- 银幕内文字 -->
  <text x="600" y="252" text-anchor="middle" fill="#ee6fa4" font-family="Consolas, monospace" font-size="34" letter-spacing="6">B-TV</text>
  <text x="600" y="330" text-anchor="middle" fill="#14333b" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="72" font-weight="bold">个人放映室</text>
  <text x="600" y="378" text-anchor="middle" fill="#2e5a62" font-family="Consolas, monospace" font-size="22" letter-spacing="3">博客 / 摄影 / AI 作品，正在放映</text>
  <text x="600" y="430" text-anchor="middle" fill="#d84e8e" font-family="Consolas, monospace" font-size="18">$ whoami —— bujianshu</text>

  <!-- 底部：域名 + 更新戳 -->
  <rect x="120" y="528" width="960" height="2" fill="#1d4a52"/>
  <text x="120" y="566" fill="#3d4a52" font-family="Consolas, monospace" font-size="16">notree-cinema.pages.dev</text>
  <text x="1080" y="566" fill="#3d4a52" font-family="Consolas, monospace" font-size="16" text-anchor="end">REEL 01/04 - 2026</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/og.png');
console.log('public/og.png 生成完成 (1200x630)');
