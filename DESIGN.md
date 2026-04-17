# DESIGN.md — 个人站（1:1 复刻 dany.works）

> 本规范完全基于 dany.works 原站 CSS/JS 提取。实现时严格遵守。

---

## 1. Visual Theme & Atmosphere

- **设计哲学**：极简主义 + 可切换氛围。单屏三列信息流，大量留白，等宽字体营造「工程师笔记」质感。
- **氛围关键词**：克制、实验性、夜感、可玩、氛围可变（晴 / 秋叶 / 午夜 / 雨 / 混沌）。
- **一句话定调**：三列静态内容流 + 氛围层（视频 + 音频覆盖）+ 键盘彩蛋交互。
- **可玩性标签**：键盘快捷键（D/N/S/M/R/C）、logo 字母点击、Matter.js 物理 chaos。

---

## 2. Color Palette & Roles

使用 **CSS Houdini `@property`** 注册四个类型化颜色 token，才能实现 400ms 颜色平滑过渡。

```css
@property --bg   { syntax: '<color>'; inherits: true; initial-value: #080808; }
@property --text { syntax: '<color>'; inherits: true; initial-value: #b4b4b4; }
@property --mid  { syntax: '<color>'; inherits: true; initial-value: #404040; }
@property --line { syntax: '<color>'; inherits: true; initial-value: #181818; }
```

### 五种模式（切 body class）

| 模式 | body class | --bg | --text | --mid | --line | 叠加层 |
|---|---|---|---|---|---|---|
| **night**（默认） | — | `#080808` | `#b4b4b4` | `#404040` | `#181818` | 无 |
| **light** | `.light` | `#f2efe9` | `#1a1a1a` | `#888` | `#d8d5cf` | 无 |
| **midnight** | `.midnight` | `#080808` | `#b4b4b4` | `#404040` | `#181818` | `moon.mp4` @ 0.6 opacity + `night.mp3` |
| **leaves/summer** | `.light.leaves` | 继承 light | — | — | — | `leaves.mp4` multiply-blend + `forest.mp3` |
| **rain** | `.light.rain` | `#9AA4B0` | `#1a1a1a` | `#70787f` | `#bcc1c7` | `rain.mp4` multiply-blend + `rain.mp3` |

### 辅助色（hover / 链接下划线）

| 元素 | night | light | rain |
|---|---|---|---|
| a 下划线 | `#303030` | `#b0b0b0` | `#a0a8b0` |
| a:hover 文字 | `#e0e0e0` | `#000` | `#000` |
| a:hover 下划线 | `#606060` | `#606060` | `#606870` |

---

## 3. Typography Rules

### 字体族

仅使用一种字体：**Fragment Mono**（Google Fonts）。等宽字体，代码/工程师质感。

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fragment+Mono&display=swap" rel="stylesheet">
```

```css
font-family: 'Fragment Mono', monospace;
```

### 字号 & 行高层级

| 用途 | font-size | line-height | 备注 |
|---|---|---|---|
| body 正文 | 14px | 1.7 | 基准 |
| section-title | 10px | — | uppercase, letter-spacing 0.07em, color: var(--mid) |
| entry-time | 11px | — | color: var(--mid) |
| video/voice btn | 14px | 1 | — |

### 禁止使用

- ❌ 无衬线字体（Inter/SF/Helvetica 等）
- ❌ 衬线字体
- ❌ 多种字体混用
- ❌ 粗体（原站没用过 `font-weight: bold`，只有 `500` 用在 section-title）

---

## 4. Component Stylings

### 4.1 三列布局

```css
.page {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr;
  min-height: 100vh;
}
.col {
  padding: 24px;
  height: 100vh;
  overflow-y: auto;
  scrollbar-width: none;
}
.col::-webkit-scrollbar { display: none; }
.col + .col { border-left: 1px solid var(--line); }
.col-1 { overflow: hidden; }
```

Col 1 不滚动（身份 + 固定底部 social），Col 2/3 独立滚动。

### 4.2 Section（Col1 信息块）

```css
.section { margin-bottom: 28px; }
.section-title {
  font-size: 10px;
  font-weight: 500;
  color: var(--mid);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 6px;
}
.links { display: flex; flex-direction: column; gap: 4px; }
```

### 4.3 链接

```css
a {
  color: var(--text);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: #303030; /* night 默认 */
}
a:hover { color: #e0e0e0; text-decoration-color: #606060; }
```

### 4.4 Entry 条目（Col2 / Col3）

```css
.entry {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 520ms var(--ease-out), transform 520ms var(--ease-out);
  margin-bottom: 32px;
}
.entry.visible { opacity: 1; transform: translateY(0); }
.entry-text { color: var(--text); white-space: pre-wrap; word-break: break-word; }
.entry-time { font-size: 11px; color: var(--mid); margin-top: 6px; }
.entry-caption { color: var(--text); margin-top: 8px; word-break: break-word; }
```

### 4.5 Social（固定左下）

```css
.social-fixed { position: fixed; bottom: 24px; left: 24px; }
@media (max-width: 768px) {
  .social-fixed { position: static; margin-top: 28px; }
}
```

### 4.6 叠加层（视频）

```css
#leaves-overlay, #moon-overlay, #rain-overlay {
  position: fixed; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  pointer-events: none;
  z-index: 999;
  opacity: 0;
  transition: opacity 700ms var(--ease-out);
}
#leaves-overlay, #rain-overlay { mix-blend-mode: multiply; }
body.leaves #leaves-overlay { opacity: 1; }
body.midnight #moon-overlay { opacity: 0.6; }
body.rain #rain-overlay { opacity: 0.6; }
```

### 4.7 Loading 占位

```css
.col-loader { color: var(--mid); padding-top: 2px; }
.col-loader-cursor { animation: blink 1.2s step-end infinite; }
@keyframes blink { 50% { opacity: 0; } }
```

HTML: `<div class="col-loader">loading<span class="col-loader-cursor">_</span></div>`

---

## 5. Layout Principles

- 容器：三列 grid，宽度铺满视口
- 列 padding：24px
- entry 间距：margin-bottom 32px
- 段落间距：32px
- 列分隔线：1px `var(--line)`
- 没有最大宽度容器（各列自适应）

**断点**：`max-width: 768px` 切换为单列堆叠。

---

## 6. Depth & Elevation

**完全无阴影 / 无渐变 / 无圆角**（除了 `.video-wrap--circle` 特例）。

扁平设计。层级只靠：
- z-index（overlay 999，chaos overlay 9001）
- `mix-blend-mode: multiply`（叶子/雨天视频融合底色）
- `border-left: 1px solid var(--line)`（列分隔）

---

## 7. Animation & Interaction（L3 档位）

### 缓动曲线

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
```

### 7.1 主题切换过渡（Houdini token 插值）

```css
body {
  transition: --bg 400ms ease, --text 400ms ease, --mid 400ms ease, --line 400ms ease;
}
```

切 body class → 四个 token 平滑交叉过渡。

### 7.2 Col 1 入场 stagger

```css
@keyframes colFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.col-1 > :nth-child(1) { animation: colFadeIn 560ms var(--ease-out)  80ms both; }
.col-1 > :nth-child(2) { animation: colFadeIn 560ms var(--ease-out) 160ms both; }
.col-1 > :nth-child(3) { animation: colFadeIn 560ms var(--ease-out) 240ms both; }
.col-1 > :nth-child(4) { animation: colFadeIn 560ms var(--ease-out) 320ms both; }
```

### 7.3 Entry reveal（滚动进入）

IntersectionObserver 触发 `.visible` class，stagger 最多 400ms：

```js
const io = new IntersectionObserver((recs) => {
  recs.filter(r => r.isIntersecting)
      .sort((a, b) => (a.target.compareDocumentPosition(b.target) & 4) ? -1 : 1)
      .forEach(rec => {
        const delay = Math.min(staggerCount * 50, 400);
        staggerCount++;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          rec.target.style.transitionDelay = `${delay}ms`;
          rec.target.classList.add('visible');
        }));
        io.unobserve(rec.target);
      });
}, { threshold: 0.05, rootMargin: '0px 0px -10px 0px' });
```

### 7.4 Loading 光标闪烁

```css
@keyframes blink { 50% { opacity: 0; } }
.col-loader-cursor { animation: blink 1.2s step-end infinite; }
```

### 7.5 叠加层淡入（700ms）

```css
#leaves-overlay, #moon-overlay, #rain-overlay {
  transition: opacity 700ms var(--ease-out);
}
```

### 7.6 键盘快捷键

| 键 | 行为 |
|---|---|
| D | light 模式 |
| N | night 模式（重置） |
| S | light + leaves 叠加 |
| M | night + moon 叠加 |
| R | light + rain 叠加（用 rain 变体色） |
| C | 触发 Matter.js chaos（再按一次恢复） |

### 7.7 Logo 字母点击（mobile）

logo 分 4 个 `data-mode` group：`day / summer / night / chaos`。移动端 `touchend` 切换模式（summer/night 会循环两个状态）。

### 7.8 HalftoneDots shader（图片覆盖）

用 `@paper-design/shaders-react` 的 `HalftoneDots` 组件，hover 时 opacity 0（220ms）显露原图：

```js
const shaderProps = {
  contrast: 0.4, originalColors: false, inverted: false,
  grid: 'hex', radius: 1, size: 0.2, scale: 1,
  grainSize: 0.5, type: 'gooey', fit: 'cover',
  grainMixer: 0.2, grainOverlay: 0.2,
  colorFront: '#2B2B2B', colorBack: '#00000000',
};
```

IntersectionObserver（rootMargin 150px）出视口卸载 shader，节省 GPU。

### 7.9 Matter.js Chaos（C 键）

- 所有可见文字被切成 span 词块，转成物理 body
- 重力 3.5，墙壁约束
- 可拖拽各物理块（mouse/touch）
- 再次按 C → 750ms ease 反向归位
- 按需 CDN 加载 Matter.js（`cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js`）

### 7.10 自定义滚轮路由（桌面）

鼠标悬停 col2/col3 → 直接滚该列。否则顺序滚 col2→col3（col1 固定）。preventDefault 接管 `wheel` 事件。

---

## 8. Do's and Don'ts

### Do

✅ 严格用 Fragment Mono，只有这一种字体
✅ 所有颜色走 `var(--bg/--text/--mid/--line)`
✅ 用 Houdini `@property` 注册颜色 token（否则过渡不生效）
✅ 列分隔用 1px 实线，颜色 `var(--line)`
✅ 保留 `loading_` 占位作为加载态
✅ 所有 entry 先透明位移，IO 触发显露
✅ 遵守 `prefers-reduced-motion`（所有动画都有关闭分支）

### Don't

❌ 不要引入 Tailwind / React / Vue 等框架（保持纯 HTML/CSS/JS）
❌ 不要加阴影、渐变、圆角（除了特意的 circle 视频）
❌ 不要用衬线 / 无衬线字体替代 Fragment Mono
❌ 不要加载模式持久化（刷新即回默认 night，原站规则）
❌ 不要在手机端保留自定义滚轮路由（只桌面启用）
❌ 不要用 console 彩色日志、表情符号装饰
❌ 不要把文案硬编码到组件里（全部走 i18n 对象）
❌ 不要在叠加层上加 pointer-events

---

## 9. Responsive Behavior

### 断点

- 桌面：`>= 769px`：三列 grid
- 移动：`<= 768px`：单列堆叠

### 移动端变化

```css
@media (max-width: 768px) {
  .page { grid-template-columns: 1fr; }
  .col  { height: auto; overflow-y: visible; }
  .col + .col { border-left: none; border-top: 1px solid var(--line); }
  .col-1 { overflow: visible; }
  .social-fixed { position: static; margin-top: 28px; }
  .logo-letter[data-mode] { cursor: pointer; touch-action: manipulation; }
  .logo-letter[data-mode]:active path { opacity: 0.5; }
}
```

### 触摸目标

- 图片 tap-and-hold 200ms 隐藏 shader（让用户长按保存图片）
- Gallery 滑动：> 40px 距离 或 velocity > 0.3 触发翻页
- Logo 字母 tap 切换主题（移动端替代键盘快捷键）

### 视频 object-position 补偿

```css
@media (max-width: 768px) {
  #moon-overlay { object-position: left; }
}
```

---

## 10. 语言规则（全局约束）

- 默认中文界面（zh）
- 支持切换到英文（en）
- 所有文案 → 顶层 `const I18N = { zh: {...}, en: {...} }` 对象
- 所有文案节点标 `data-i18n="key"`
- 语言切换器放在 Col 1 底部（social 上方）
- 切换无刷新：遍历 `[data-i18n]` 节点替换 textContent
- 语言状态**不持久化**（对齐原站 midnight 规则，刷新回默认 zh）

---

## 11. 技术依赖清单

| 来源 | 依赖 | 用途 |
|---|---|---|
| Google Fonts | Fragment Mono | 字体 |
| esm.sh | react@18, react-dom@18, @paper-design/shaders-react@0.0.72 | HalftoneDots shader |
| cdn.jsdelivr.net | lottie-web@5 | diecarz-style 动画 icon |
| cdnjs.cloudflare.com | matter-js@0.19.0 | Chaos 物理 |
| 本地 assets | leaves.mp4 / moon.mp4 / rain.mp4 / forest.mp3 / night.mp3 / rain.mp3 | 氛围叠加层 |

**素材占位策略**：用户无素材时，视频 src 留 `placeholder.mp4`（空文件），叠加层仍保留过渡效果但无视觉内容。用户后续替换真实素材即生效。
