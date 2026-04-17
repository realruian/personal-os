# Personal Website · tianruian.com

纯静态 HTML + CSS + JS 个人站，灵感参考 dany.works。三列布局，发布面板在 `/admin.html`。

## 技术栈
- 纯 HTML / CSS / JS，**无构建工具**。修改后直接 commit push → Vercel 自动部署
- Vercel Framework Preset: **Other**（不是 Next.js / Vite；改错会 build 失败）
- 部署 repo: `realruian/personal-os`（private）。**不是** `ai-personal-site`
- 域名：`tianruian.com`

## 常用命令

```bash
# 本地预览（当前项目目录下）
python3 -m http.server 5173

# JS 语法检查（改了任何 js/*.js 必跑）
node -c js/app.js

# JSON 校验（改了 content/data.json 或用 admin 发布后必跑）
python3 -c "import json; json.load(open('content/data.json'))"
```

## YOU MUST：改完代码必跑验证

1. 对应 JS 文件 `node -c`
2. 动了 data.json 就 `python3 -c "import json; ..."`
3. 打开 `localhost:5173` 手测关键路径（按 D/N/S/M/R/C 切主题、hover 图、发布面板）

## 架构硬约束（踩过的坑）

- **Col 2 thoughts 按 ts 降序 + featured 置顶**（排序逻辑在 `js/app.js` 的 renderCol2 前）
- **Col 3 images 按 `data.json` 数组位置渲染**（**不按 ts**！要调整顺序就改数组里的位置，改 ts 没用）
- 发布面板 `js/admin.js` 的 `REPO_NAME` 常量必须和 Vercel 接的 repo 名一致
- 主题不持久化，刷新回默认（当前默认 `light leaves`，在 `<body>` class 上）
- HalftoneDots shader 走 esm.sh CDN；`@property` 颜色 token 需要 Chromium 85+ / Safari 16.4+
- `.img-wrap:not([data-shader-init="1"])::after` CSS 占位，shader ready 后自动让位

## Git 纪律（YOU MUST）

- **push 前先 `git pull --rebase origin main`** —— admin 发布面板每次发都会产生远端 commit，本地没同步直接 push 会被拒
- **不要** 用 `-c commit.gpgsign=false`、`--no-verify`、`--no-gpg-sign`、`--no-edit`（违反 Git Safety Protocol）
- force push（`--force` / `-f`）只在用户明确说"完全替代 / 覆盖 / 丢掉旧历史"时才用
- 推 / 改 remote 前 `git remote -v` 确认 URL，对照 Vercel Settings → Git 里显示的 repo

## 发布面板（admin.html）

- URL：`tianruian.com/admin.html`
- 认证：GitHub fine-grained PAT，**repo 范围必须选 `personal-os`**，权限 `Contents: Read and write`
- 存 `localStorage.gh_token`，每台设备各自存一次
- 可选 Anthropic API key → 自动翻译英文（`localStorage.anthropic_key`）
- 两种模式：thought（图文）/ photo（纯图片到 Col 3）
- manage 面板可 edit / delete 历史条目

**YOU MUST：三处 repo 名必须一致**
`admin.js` 的 `REPO_NAME` / PAT 的 Repository access / Vercel 项目接的 repo —— 任一不一致发布就 403 或推不到正确的部署。改 repo 名时三处都要同步改。

## 内容字段约定（data.json）

- thought：`{ type: 'thought', ts, text_zh, text_en?, images?: [{url}], featured?, featured_ts? }`
- image：`{ type: 'image', ts, url, caption_zh?, caption_en? }`
- gallery：`{ type: 'gallery', ts, images: [{url}], captionHtml_zh?, captionHtml_en? }`

## 不要动

- `assets/*.mp4` / `assets/*.mp3` — 从 dany.works 下载的素材，公开发布前不可未经同意改或再分发
- `.vercel/` — Vercel CLI 缓存，已在 .gitignore
- `robots.txt` 禁 `/admin.html` 索引的规则
- 根目录 `DESIGN.md` — 视觉设计规范，要改样式先看它

## 经验教训

**shader-init 标志的时序要求**（2026-04-18 修复 flicker 沉淀）
- `data-shader-init` 同时承担两个职责：① shader 防重复 init；② CSS `:not()::after` 占位让位
- **必须等 React mount + WebGL 编译 + 首帧 paint 才能设**（root.render 之后再 double RAF），否则占位提早消失，露出原图 → halftone 的视觉切换 = flicker
- 防重复 init 用内部 flag（`wrap._shaderStarted`）解耦，不要让 CSS 状态被异步流程提前触发

**诊断时序 race 不要只看 box 几何**（flicker 6 次失败的根本原因）
- 之前一直从 layout 维度修（aspect-ratio / contain / padding-bottom）—— 全错方向
- 真凶是**像素层面的视觉切换**：`performance.getEntriesByType('layout-shift')` 一直是空数组就该警觉，box 没动 ≠ 没 flicker
- 排查 race 时序：用 `performance.getEntriesByType('resource')` 看资源加载时刻，用 `drawImage + getImageData` 验证 img 像素 vs 屏幕像素是否一致，用截屏看实际渲染
- "本地丝滑、线上 flicker" 几乎一定是网络 RTT 把 race window 从 ~0ms 拉到 ~500ms，**不是 Vercel 性能问题**

## 参考

- 整站设计规范：`DESIGN.md`
- 用户面向的说明：`README.md`
- 原参考站：https://dany.works
