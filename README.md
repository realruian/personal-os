# 个人网站 · 1:1 复刻 dany.works

参考站：https://dany.works/

## 本地预览

纯静态，但 `fetch('content/data.json')` 要走 HTTP，不能 `file://` 直接打开。选一种：

```bash
# 方案 A：Python 自带
cd /Users/tianruian/Dev/Personal-website
python3 -m http.server 5173

# 方案 B：Node
npx serve .
```

然后访问 `http://localhost:5173/`。

## 目录结构

```
Personal-website/
├── DESIGN.md          # 完整设计规范（颜色/字体/动画/组件）
├── index.html         # 入口
├── styles.css         # 全部样式
├── js/
│   ├── i18n.js        # 中英双语 locale 对象 + 切换
│   ├── app.js         # Col2/Col3 渲染、滚动路由、entry reveal
│   ├── themes.js      # 键盘快捷键 + 移动端 logo tap
│   ├── chaos.js       # Matter.js 物理彩蛋（C 键）
│   └── shaders.js     # 图片 HalftoneDots shader
└── content/
    └── data.json      # 示例内容（thoughts + images）
```

## 交互速查

| 键 | 行为 |
|---|---|
| D | Day / 浅色模式 |
| N | Night / 暗色模式（重置） |
| S | Summer 叠加（浅色 + 飘叶） |
| M | Midnight 叠加（暗色 + 月色） |
| R | Rain 叠加（冷灰色 + 雨） |
| C | Chaos 物理坍塌（再按一次归位） |

移动端点击 logo 的 4 个字母分别对应 Day / Summer 循环 / Night 循环 / Chaos。

## 替换成你自己的内容

### 1) 文案（中英双语）

编辑 `js/i18n.js`：
- `intro` — 一句话身份定位
- `artifacts` / `lab` / `social` — 链接列表

两种语言都要改。

### 2) Col 2 / Col 3 的内容流

编辑 `content/data.json`：

- `thoughts[]` — Col 2 的想法、语音、视频条目
- `images[]` — Col 3 的图片、画廊、GIF 条目

条目类型：
- `thought`：`{ type, ts, text }` 或 `{ type, ts, html }`
- `image`：`{ type: 'image', ts, url, caption }`
- `gallery`：`{ type: 'gallery', ts, images: [{url}], captionHtml }`
- `gif`：`{ type: 'gif', ts, url }`
- `video`：`{ type: 'video', ts, url, caption }`
- `video_note`（圆形）：`{ type: 'video_note', ts, url }`
- `voice`：`{ type: 'voice', ts, url, duration, transcriptText }`

`ts` 是毫秒级 Unix 时间戳，会按倒序排，`featured: true` 的优先。

### 3) 氛围叠加层素材

> **版权说明**：`assets/` 下的视频/音频素材版权归 https://dany.works/ 原作者所有，
> 本仓库仅用于个人学习 / 本地参考。若要公开部署或商用，必须替换为自有素材
> 或免费可商用素材（如 Pexels / Pixabay）。

`index.html` 底部的 6 个标签已指向 `assets/` 下的对应文件：

```html
<video id="leaves-overlay" src="assets/leaves.mp4" ...>
<audio id="forest-audio"   src="assets/forest.mp3" ...>
<video id="moon-overlay"   src="assets/moon.mp4" ...>
<audio id="night-audio"    src="assets/night.mp3" ...>
<video id="rain-overlay"   src="assets/rain.mp4" ...>
<audio id="rain-audio"     src="assets/rain.mp3" ...>
```

建议循环短片（5-15 秒），视频 `mix-blend-mode: multiply`。

### 4) Logo

`index.html` 里的占位 logo 用 4 个字母 `Y/O/U/!`，对应四个模式。换成你自己的 SVG 时保留 4 个 `.logo-letter[data-mode]` group，data-mode 分别是 `day / summer / night / chaos`。

## 技术约束

- 颜色 token 用 CSS Houdini `@property` 注册，必须支持 Chromium 85+ / Safari 16.4+
- 主题**不持久化**（刷新即重置为 night），与原站规则一致
- 图片 shader 依赖 ESM CDN（`esm.sh`），离线或防火墙环境下会降级为纯图
- Matter.js 按需加载（首次按 C 才拉取）

## 验证清单

- [ ] 四种主题循环切换（D/N/S/M/R），颜色有 400ms 平滑过渡
- [ ] 语言切换「中 / EN」即时生效
- [ ] Col 2 / Col 3 独立滚动（桌面鼠标悬停时）
- [ ] Entry 滚动进入时 stagger fade up
- [ ] Loading 光标在内容加载前闪烁
- [ ] C 键物理坍塌 + 再按 C 归位
- [ ] 移动端（<768px）单列堆叠，logo 字母可点
- [ ] 刷新回默认 night 模式、默认中文
