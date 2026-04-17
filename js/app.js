// ──────────────────────────────────────────────
// 主应用：Col 2 / Col 3 渲染 + 滚动路由 + entry reveal
// 内容源：content/*.json（静态），替代原站 /api/content 接口
// ──────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(ts) {
  const d    = new Date(ts);
  const lang = window.CURRENT_LANG === 'zh' ? 'zh-CN' : 'en-GB';
  const date = d.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

function fmtTime(s) {
  const t = Math.max(0, Math.floor(s));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function buildBar(progress, count) {
  const n   = count || 18;
  const pos = Math.min(n - 1, Math.round(Math.max(0, progress) * (n - 1)));
  return '░'.repeat(pos) + '█' + '░'.repeat(n - pos - 1);
}

// Col 2：thoughts / voice / video 按时间线混排
function renderCol2(items) {
  const col = document.getElementById('col-thoughts');
  col.querySelector('.col-loader')?.remove();
  items.forEach(item => {
    try {
    const el = document.createElement('div');
    el.className = 'entry';
    let html = '';

    if (item.type === 'voice') {
      const dur = item.duration || 0;
      html = `<div class="voice-player" data-duration="${dur}">` +
        `<button class="voice-play-btn">PLAY</button>` +
        `<span class="voice-scrubber">${buildBar(0)}</span>` +
        `<span class="voice-time">${fmtTime(dur)}</span>` +
        `<audio src="${escapeHtml(item.url)}" preload="none"></audio>` +
        `</div>`;
      if (item.transcript && item.transcript.length) {
        html += `<div class="voice-transcript">` +
          item.transcript.map(w =>
            `<span class="voice-word" data-start="${w.start}">${escapeHtml(w.word)}</span>`
          ).join(' ') +
          `</div>`;
      } else if (item.transcriptText) {
        html += `<div class="voice-transcript">${escapeHtml(item.transcriptText)}</div>`;
      }
    } else if (item.type === 'video' || item.type === 'video_note') {
      const isCircle = item.type === 'video_note';
      html = `<div class="video-entry">` +
        `<div class="video-wrap${isCircle ? ' video-wrap--circle' : ''}">` +
        `<video src="${escapeHtml(item.url)}" muted playsinline preload="none" crossorigin="anonymous"></video>` +
        `<div class="shader-overlay"></div>` +
        `</div>` +
        `<div class="video-controls">` +
        `<button class="video-btn btn-play">PLAY</button>` +
        `<button class="video-btn btn-mute">UNMUTE</button>` +
        `</div></div>`;
    } else {
      const lang = window.CURRENT_LANG || 'zh';
      const rawHtml = item['html_' + lang] || item.html;
      const rawText = item['text_' + lang] || item.text;
      html = `<div class="entry-text">${rawHtml || escapeHtml(rawText || '')}</div>`;
      if (Array.isArray(item.images) && item.images.length) {
        html += '<div class="thought-images">' +
          item.images.map(im =>
            `<div class="img-wrap">` +
            `<img src="${escapeHtml(im.url)}" class="entry-img" loading="lazy" alt="">` +
            `<div class="shader-overlay"></div>` +
            `</div>`
          ).join('') +
          '</div>';
      }
    }

    const lang = window.CURRENT_LANG || 'zh';
    const captionHtml = item['captionHtml_' + lang] || item.captionHtml;
    const captionPlain = item['caption_' + lang] || item.caption;
    const caption = captionHtml || (captionPlain ? escapeHtml(captionPlain) : null);
    if (caption) html += `<div class="entry-caption">${caption}</div>`;
    html += `<div class="entry-time">${formatDate(item.ts)}</div>`;
    el.innerHTML = html;
    col.appendChild(el);

    const videoEntry = el.querySelector('.video-entry');
    if (videoEntry) initVideo(videoEntry);
    const voicePlayer = el.querySelector('.voice-player');
    if (voicePlayer) initVoice(voicePlayer);
    } catch (err) {
      console.warn('[renderCol2] skip bad item', item, err);
    }
  });
}

// Col 3：图片 / 画廊 / GIF
function renderImages(images) {
  const col = document.getElementById('col-images');
  col.querySelector('.col-loader')?.remove();
  images.forEach(img => {
    try {
    const el = document.createElement('div');
    el.className = 'entry';
    let html = '';

    const lang = window.CURRENT_LANG || 'zh';
    const captionHtml = img['captionHtml_' + lang] || img.captionHtml;
    const captionPlain = img['caption_' + lang] || img.caption;
    const captionFinal = captionHtml || (captionPlain ? escapeHtml(captionPlain) : '');

    if (img.type === 'gallery' && img.images?.length) {
      const total = img.images.length;
      const slides = img.images.map((im, i) =>
        `<div class="gallery-slide${i === 0 ? ' active' : ''}">` +
        `<div class="img-wrap"><img src="${escapeHtml(im.url)}" class="entry-img" alt="">` +
        `<div class="shader-overlay"></div></div>` +
        `</div>`
      ).join('');
      html = `<div class="gallery-wrap"><div class="gallery-slides">` + slides + `</div>` +
        `<div class="gallery-footer">` +
        `<span class="gallery-caption">${captionFinal}</span>` +
        `<div class="gallery-nav">` +
        `<button class="gallery-btn btn-prev" style="visibility:hidden">◀</button>` +
        `<span class="gallery-counter">1/${total}</span>` +
        `<button class="gallery-btn btn-next"${total <= 1 ? ' style="visibility:hidden"' : ''}>▶</button>` +
        `</div></div></div>`;
    } else if (img.type === 'gif') {
      html = img.url.endsWith('.gif')
        ? `<img src="${escapeHtml(img.url)}" class="entry-img" alt="">`
        : `<video src="${escapeHtml(img.url)}" autoplay loop muted playsinline class="entry-img" style="display:block;width:100%;height:auto;"></video>`;
    } else {
      html = `<div class="img-wrap">` +
        `<img src="${escapeHtml(img.url)}" class="entry-img" loading="lazy" alt="">` +
        `<div class="shader-overlay"></div></div>`;
    }

    if (img.type !== 'gallery') {
      html += captionFinal ? `<div class="entry-caption">${captionFinal}</div>` : '';
    }
    html += `<div class="entry-time">${formatDate(img.ts)}</div>`;
    el.innerHTML = html;
    col.appendChild(el);

    const galleryWrap = el.querySelector('.gallery-wrap');
    if (galleryWrap) initGallery(galleryWrap);
    } catch (err) {
      console.warn('[renderImages] skip bad item', img, err);
    }
  });
}

function setupReveal(col) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const entries = Array.from(col.querySelectorAll('.entry'));
  if (!entries.length) return;
  if (reducedMotion) {
    entries.forEach(el => el.classList.add('visible'));
    return;
  }
  let staggerCount = 0;
  const io = new IntersectionObserver((recs) => {
    recs
      .filter(r => r.isIntersecting)
      .sort((a, b) => (a.target.compareDocumentPosition(b.target) & 4) ? -1 : 1)
      .forEach(rec => {
        const el = rec.target;
        const delay = Math.min(staggerCount * 50, 400);
        staggerCount++;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          el.style.transitionDelay = `${delay}ms`;
          el.classList.add('visible');
        }));
        io.unobserve(el);
      });
  }, { threshold: 0.05, rootMargin: '0px 0px -10px 0px' });
  entries.forEach(el => io.observe(el));
}

function initGallery(wrap) {
  const slides  = Array.from(wrap.querySelectorAll('.gallery-slides .gallery-slide'));
  const counter = wrap.querySelector('.gallery-counter');
  const btnPrev = wrap.querySelector('.btn-prev');
  const btnNext = wrap.querySelector('.btn-next');
  const total   = slides.length;
  if (total <= 1) return;
  let idx = 0;
  let navTimer = null;

  if (btnPrev) btnPrev.style.visibility = 'visible';

  function goTo(n, dir) {
    const nextIdx = (n + total) % total;
    if (nextIdx === idx) return;

    const prev = slides[idx];
    idx = nextIdx;
    const next = slides[idx];

    wrap.classList.add('gallery-navigating');
    clearTimeout(navTimer);
    navTimer = setTimeout(() => wrap.classList.remove('gallery-navigating'), 300);

    const enterClass = dir === 'prev' ? 'entering-prev' : 'entering-next';
    const leaveClass = dir === 'prev' ? 'leaving-prev'  : 'leaving-next';

    prev.classList.remove('active');
    prev.classList.add('leaving', leaveClass);
    setTimeout(() => prev.classList.remove('leaving', leaveClass), 300);

    next.classList.add('active', enterClass);
    setTimeout(() => next.classList.remove(enterClass), 300);

    if (counter) counter.textContent = `${idx + 1}/${total}`;

    const imgWrap = next.querySelector('.img-wrap');
    if (imgWrap && window._initShader) window._initShader(imgWrap);
  }

  btnPrev?.addEventListener('click', () => goTo(idx - 1, 'prev'));
  btnNext?.addEventListener('click', () => goTo(idx + 1, 'next'));

  let touchX = 0, touchT = 0;
  wrap.addEventListener('touchstart', e => {
    touchX = e.changedTouches[0].clientX;
    touchT = Date.now();
    wrap.classList.add('gallery-pressing');
  }, { passive: true });
  const endPress = e => {
    wrap.classList.remove('gallery-pressing');
    if (!e) return;
    const dx       = e.changedTouches[0].clientX - touchX;
    const velocity = Math.abs(dx) / (Date.now() - touchT);
    if (Math.abs(dx) > 40 || velocity > 0.3) {
      if (dx < 0) goTo(idx + 1, 'next');
      else        goTo(idx - 1, 'prev');
    }
  };
  wrap.addEventListener('touchend',    endPress, { passive: true });
  wrap.addEventListener('touchcancel', endPress, { passive: true });
}

function initVideo(entry) {
  const video   = entry.querySelector('video');
  const overlay = entry.querySelector('.shader-overlay');
  const btnPlay = entry.querySelector('.btn-play');
  const btnMute = entry.querySelector('.btn-mute');
  if (!video) return;

  btnPlay?.addEventListener('click', () => {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  });
  btnMute?.addEventListener('click', () => {
    video.muted = !video.muted;
    btnMute.textContent = video.muted ? 'UNMUTE' : 'MUTE';
  });
  video.addEventListener('play', () => {
    if (btnPlay) btnPlay.textContent = 'PAUSE';
    if (overlay) overlay.style.opacity = '0';
  });
  video.addEventListener('pause', () => {
    if (btnPlay) btnPlay.textContent = 'PLAY';
    if (overlay) overlay.style.opacity = '1';
  });
}

function initVoice(player) {
  const audio  = player.querySelector('audio');
  const btn    = player.querySelector('.voice-play-btn');
  const timeEl = player.querySelector('.voice-time');
  const barEl  = player.querySelector('.voice-scrubber');
  if (!audio) return;
  const dur = parseInt(player.dataset.duration, 10) || 0;

  const transcriptEl = player.nextElementSibling?.classList.contains('voice-transcript')
    ? player.nextElementSibling : null;
  const wordEls = transcriptEl ? Array.from(transcriptEl.querySelectorAll('.voice-word')) : [];

  let barCount = 18;
  if (barEl) {
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:inherit;font-size:inherit';
    probe.textContent = '░';
    player.appendChild(probe);
    const charW = probe.getBoundingClientRect().width || 8;
    player.removeChild(probe);
    barCount = Math.max(5, Math.floor(barEl.getBoundingClientRect().width / charW));
    barEl.textContent = buildBar(0, barCount);
  }

  btn?.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      btn.textContent = 'STOP';
      if (transcriptEl) transcriptEl.style.display = 'block';
    } else {
      audio.pause();
      btn.textContent = 'PLAY';
    }
  });

  audio.addEventListener('ended', () => {
    btn.textContent = 'PLAY';
    if (barEl) barEl.textContent = buildBar(0, barCount);
    if (timeEl) timeEl.textContent = '00:00';
    wordEls.forEach(w => w.classList.remove('spoken'));
    if (transcriptEl) transcriptEl.style.display = 'none';
  });

  audio.addEventListener('timeupdate', () => {
    const cur   = audio.currentTime;
    const total = isFinite(audio.duration) ? audio.duration : dur;
    if (barEl && total > 0) barEl.textContent = buildBar(cur / total, barCount);
    if (timeEl) timeEl.textContent = fmtTime(Math.max(0, total - cur));
    wordEls.forEach(w => {
      w.classList.toggle('spoken', cur >= parseFloat(w.dataset.start));
    });
  });

  barEl?.addEventListener('click', e => {
    const rect  = barEl.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const total = isFinite(audio.duration) ? audio.duration : dur;
    audio.currentTime = ratio * total;
  });
}

// Lightbox：点击图片全屏展示（Col 3 图片 + Col 2 thought 内嵌图都支持）
(function() {
  let lb = null;

  function ensureLightbox() {
    if (lb) return lb;
    lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = '<button type="button" class="lightbox-close" aria-label="close">×</button><img alt="">';
    document.body.appendChild(lb);
    // 点背景 / 关闭按钮关闭
    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target.classList.contains('lightbox-close')) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lb.classList.contains('active')) close();
    });
    return lb;
  }

  function open(src) {
    const el = ensureLightbox();
    el.querySelector('img').src = src;
    el.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!lb) return;
    lb.classList.remove('active');
    document.body.style.overflow = '';
    // 延迟清 src，等淡出动画结束
    setTimeout(() => { if (!lb.classList.contains('active')) lb.querySelector('img').src = ''; }, 300);
  }

  // 统一事件委托：Col 3 和 thought 内嵌图的 img-wrap 都响应
  document.addEventListener('click', (e) => {
    // 忽略 gallery 的导航按钮
    if (e.target.closest('.gallery-btn')) return;
    const wrap = e.target.closest('#col-images .img-wrap, .thought-images .img-wrap');
    if (!wrap) return;
    const img = wrap.querySelector('img');
    if (img && img.src) open(img.src);
  });
})();

// Col 3 移动端图片 tap-and-hold 隐藏 shader
(function() {
  const col3 = document.getElementById('col-images');
  if (!col3) return;
  let pressed = null;
  col3.addEventListener('touchstart', e => {
    const wrap = e.target.closest('.img-wrap');
    if (wrap && !wrap.closest('.gallery-slide')) {
      pressed = wrap;
      wrap.classList.add('img-pressing');
    }
  }, { passive: true });
  const release = () => {
    if (pressed) { pressed.classList.remove('img-pressing'); pressed = null; }
  };
  col3.addEventListener('touchend',    release, { passive: true });
  col3.addEventListener('touchcancel', release, { passive: true });
})();

// 滚轮路由：鼠标在 col2/col3 直接滚该列；否则顺序 col2 → col3
(function() {
  const desktop = () => window.matchMedia('(min-width: 769px)').matches;
  const col2 = document.getElementById('col-thoughts');
  const col3 = document.getElementById('col-images');
  if (!col2 || !col3) return;
  let hovered = null;
  col2.addEventListener('mouseenter', () => hovered = col2);
  col2.addEventListener('mouseleave', () => hovered = null);
  col3.addEventListener('mouseenter', () => hovered = col3);
  col3.addEventListener('mouseleave', () => hovered = null);

  document.addEventListener('wheel', function(e) {
    if (!desktop()) return;
    e.preventDefault();
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 24;
    if (e.deltaMode === 2) dy *= window.innerHeight;

    if (hovered === col2 || hovered === col3) {
      hovered.scrollTop += dy;
    } else {
      // 鼠标不在任何列上 → 默认只滚 col2，不再接替滚 col3
      col2.scrollTop += dy;
    }
  }, { passive: false });
})();

// 重渲染：切语言或任意时机可调
window.rerenderSiteData = function() {
  const data = window.__siteData;
  if (!data) return;
  const col2 = document.getElementById('col-thoughts');
  const col3 = document.getElementById('col-images');
  // 清空 col2：保留 how-to-entry（静态），清掉其他动态 entry 和 loader
  col2.querySelectorAll('.entry:not(.how-to-entry), .col-loader').forEach(el => el.remove());
  // 清空 col3：全部重来
  col3.querySelectorAll('.entry, .col-loader').forEach(el => el.remove());
  renderCol2(data.col2Items);
  renderImages(data.col3Media);
  setupReveal(col2);
  setupReveal(col3);
};

// 拉取静态内容 JSON
document.addEventListener('DOMContentLoaded', () => {
  fetch('content/data.json')
    .then(r => r.json())
    .then(({ thoughts, images }) => {
      const col2Media = images.filter(i => i.type === 'voice' || i.type === 'video' || i.type === 'video_note');
      const col3Media = images.filter(i => !i.type || i.type === 'image' || i.type === 'gallery' || i.type === 'gif');
      const col2Items = [...thoughts, ...col2Media].sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        if (a.featured && b.featured) return (b.featured_ts || 0) - (a.featured_ts || 0);
        return b.ts - a.ts;
      });
      window.__siteData = { col2Items, col3Media };
      const col2 = document.getElementById('col-thoughts');
      const col3 = document.getElementById('col-images');
      renderCol2(col2Items);
      renderImages(col3Media);
      setupReveal(col2);
      setupReveal(col3);
    })
    .catch(() => {
      const dict = window.I18N[window.CURRENT_LANG || 'zh'];
      const msg = (dict && dict.error_loading) || 'error loading content';
      document.querySelectorAll('.col-loader').forEach(el => { el.textContent = msg; });
    });
});
