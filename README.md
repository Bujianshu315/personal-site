# personal-site · 个人放映室

Bujianshu 的个人网站。概念：暗色放映厅正中挂一块薄荷绿 CRT 大银幕，银幕里"放映"关于我、AI 作品、博客和摄影；左右两条安静的场刊目录/服务菜单，底部一条版权栏。

## 怎么跑

```bash
npm install     # 首次安装依赖
npm run dev     # 开发预览 → http://localhost:4321
npm run build   # 构建到 dist/（部署 Cloudflare Pages 用）
```

## 结构

```
src/
  pages/index.astro        首页：三栏（场刊目录 | 银幕 | 服务菜单）+ 四卷内容 + 全部交互脚本
  layouts/Base.astro       HTML 骨架（data-theme 挂在 <html> 上）
  components/
    GrainCanvas.astro      房间环境光：以银幕为中心的辐射光晕照亮影厅（无噪点）
    ScreenGrain.astro      银幕内的胶片颗粒（噪点只属于画面，被银幕裁剪）
    AsciiAvatar.astro      ASCII 头像（canvas 渲染 + CRT 扫描线 + 逐行开机）
  styles/global.css        配色变量（暗色默认 / 浅色=整体反色），全站唯一取色处
  data/avatar-ascii.json   头像转出的字符画数据
scripts/
  png2ascii.mjs            头像 → ASCII 转换脚本（零依赖 Node）
public/
  avatar.png               头像原图
```

## 首页交互（v1.4）

- **换片**：桌面滚轮 / 键盘 ↑↓ 或 PgUp/PgDn / 点左栏卷名 → 黑幕垂直划过（快门），内容在黑幕下平滑滑入；触屏走原生 scroll-snap
- **右栏服务**：☀/☾ 深浅色（放映室开关机既视感）、照片地图（外链机位地图）、关于我（回第一卷）、语言（施工中 toast）、GitHub
- **无障碍**：prefers-reduced-motion 下关闭所有动画；键盘可完整操作；画布均有 aria-label

## 常用操作

- **换头像**：覆盖 `public/avatar.png`（白底最佳），跑 `npm run ascii`
- **改文案**：直接编辑 `src/pages/index.astro` 里对应 `<article class="scene">`
- **改配色**：全部在 `src/styles/global.css` 顶部变量（暗色 :root + 浅色 [data-theme='light'] 成对修改）
- **改分享卡**：编辑 `scripts/make-og.mjs` 后跑 `npm run og`（微信/QQ 分享时显示的卡片图）
- **主题记忆**：选择存在 localStorage，首次访问跟随系统偏好（Base.astro 内联脚本）
- **以后加博客**：计划用 Astro content collections，写 Markdown 进 `src/content/blog/` 自动出现在博客卷

## 部署

- 线上地址：https://notree-cinema.pages.dev （Cloudflare Pages，连 GitHub 仓库，push main 自动部署）
- 仓库：https://github.com/Bujianshu315/personal-site

## 待办（按优先级）

1. 博客系统（content collections + 文章页 + RSS）
2. 摄影页（画廊 + EXIF GPS 机位地图）
3. 来访计数挂件（不蒜子 / Cloudflare Workers）
4. ~~部署：git init → GitHub → Cloudflare Pages（xxx.pages.dev）~~ ✅ 完成
