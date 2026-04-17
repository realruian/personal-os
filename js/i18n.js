// ──────────────────────────────────────────────
// 国际化：中英双语
// 所有面向用户的文案都在这里。语言切换无刷新、不持久化。
// ──────────────────────────────────────────────
window.I18N = {
  zh: {
    title: '田睿安 · 个人站',
    intro: '田睿安<br>美团 AI 产品工程专家<br>前阿里、京东高级设计师',
    artifacts_title: 'Ships',
    lab_title: 'Writing',
    social_title: 'Social',
    artifacts: [
      { label: 'Lollipop', href: 'https://lollipop.top/' }
    ],
    lab: [
      { label: '即将到来…', href: '#' }
    ],
    howto:
      '<div class="entry-text">' +
      'howto · 玩法\n\n' +
      '键盘（桌面）：\n' +
      '  D — 白昼 · 暖白底\n' +
      '  N — 夜晚 · 回到默认黑\n' +
      '  S — 晚夏 · 飘叶 + 森林音\n' +
      '  M — 深夜 · 月色 + 虫鸣\n' +
      '  R — 雨天 · 冷灰底 + 雨声\n' +
      '  C — 混沌 · 所有元素坍塌成物理块，再按一次归位\n\n' +
      '* 首次按键无声？先点一下页面（浏览器自动播放策略）' +
      '</div>',
    social: [
      { label: 'RED/田睿安', href: 'https://www.xiaohongshu.com/user/profile/6388506d000000001f017d47' },
      { label: 'GitHub/realruian', href: 'https://github.com/realruian' },
      { label: 'mail/realruian@gmail.com', href: 'mailto:realruian@gmail.com' }
    ],
    error_loading: '内容加载失败'
  },
  en: {
    title: 'Ruian Tian · Personal Site',
    intro: 'Ruian Tian<br>AI Product Engineer at Meituan<br>Previously Senior Designer at Alibaba & JD',
    artifacts_title: 'Ships',
    lab_title: 'Writing',
    social_title: 'Social',
    artifacts: [
      { label: 'Lollipop', href: 'https://lollipop.top/' }
    ],
    lab: [
      { label: 'coming soon…', href: '#' }
    ],
    howto:
      '<div class="entry-text">' +
      'howto · how to play\n\n' +
      'keyboard (desktop):\n' +
      '  D — day · warm white\n' +
      '  N — night · default black\n' +
      '  S — summer · falling leaves + forest\n' +
      '  M — midnight · moon + night sounds\n' +
      '  R — rain · cold grey + raindrops\n' +
      '  C — chaos · everything collapses into physics; press again to restore\n\n' +
      '* first keypress silent? click once on the page (browser autoplay policy)' +
      '</div>',
    social: [
      { label: 'RED/TIANRUIAN', href: 'https://www.xiaohongshu.com/user/profile/6388506d000000001f017d47' },
      { label: 'GitHub/realruian', href: 'https://github.com/realruian' },
      { label: 'mail/realruian@gmail.com', href: 'mailto:realruian@gmail.com' }
    ],
    error_loading: 'failed to load content'
  }
};

window.CURRENT_LANG = 'zh';

function applyI18n(lang) {
  const dict = window.I18N[lang];
  if (!dict) return;
  window.CURRENT_LANG = lang;
  document.documentElement.setAttribute('lang', lang);
  document.title = dict.title;

  // 静态文本节点替换
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (dict[key] == null) return;
    el.innerHTML = dict[key];
  });

  renderLinks('artifacts-links', dict.artifacts);
  renderLinks('lab-links', dict.lab);
  renderLinks('social-links', dict.social);

  // 按钮高亮
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // 动态内容（Col2 thoughts + Col3 images）随语言重渲染
  if (typeof window.rerenderSiteData === 'function') {
    window.rerenderSiteData();
  }
}

function renderLinks(containerId, list) {
  const c = document.getElementById(containerId);
  if (!c || !Array.isArray(list)) return;
  c.innerHTML = list.map(item => {
    const isExternal = /^https?:\/\//.test(item.href);
    const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${item.href}"${attrs}>${item.label}</a>`;
  }).join('');
}

// 初始渲染
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => applyI18n('zh'));
} else {
  applyI18n('zh');
}

// 事件委托：避免按钮绑定时机或 DOM 结构变化导致失效
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.lang-btn');
  if (!btn) return;
  e.preventDefault();
  applyI18n(btn.dataset.lang);
});
