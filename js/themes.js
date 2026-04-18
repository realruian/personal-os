// ──────────────────────────────────────────────
// 主题切换：键盘快捷键 + mobile logo 字母点击
// 五种状态：night（默认）/ light / midnight / leaves / rain
// 无持久化，刷新回默认
// ──────────────────────────────────────────────

(function() {
  const $ = id => document.getElementById(id);
  const v  = () => $('leaves-overlay');
  const a  = () => $('forest-audio');
  const mv = () => $('moon-overlay');
  const ma = () => $('night-audio');
  const rv = () => $('rain-overlay');
  const ra = () => $('rain-audio');

  const safePlay  = el => el && el.src && el.play && el.play().catch(() => {});
  const safePause = el => { if (el) { try { el.pause(); el.currentTime = 0; } catch (_) {} } };

  const stopSummer = () => {
    safePause(v()); safePause(a());
    document.body.classList.remove('leaves');
  };
  const stopMidnight = () => {
    safePause(mv()); safePause(ma());
    document.body.classList.remove('midnight');
  };
  const stopRain = () => {
    safePause(rv()); safePause(ra());
    document.body.classList.remove('rain');
  };

  // 暴露给 chaos 使用
  window.__themes = { stopSummer, stopMidnight, stopRain };

  // ── 键盘快捷键 ─────────────────────────
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const k = e.key.toLowerCase();

    if (k === 'd') {
      // Day: light 模式，清叠加层
      document.body.classList.add('light');
      stopSummer(); stopMidnight(); stopRain();
    }
    if (k === 'n') {
      // Night: 全清
      document.body.classList.remove('light');
      stopSummer(); stopMidnight(); stopRain();
    }
    if (k === 's') {
      // Summer: light + leaves 叠加（不可反向切回）
      if (!document.body.classList.contains('leaves')) {
        document.body.classList.add('light', 'leaves');
        stopMidnight(); stopRain();
        safePlay(v()); safePlay(a());
      }
    }
    if (k === 'm') {
      // Midnight: night 底 + moon 叠加
      if (!document.body.classList.contains('midnight')) {
        document.body.classList.remove('light', 'leaves');
        stopSummer(); stopRain();
        document.body.classList.add('midnight');
        safePlay(mv()); safePlay(ma());
      }
    }
    if (k === 'r') {
      // Rain: light 底（但 .rain 会重写 bg 变冷灰）+ rain 叠加
      if (!document.body.classList.contains('rain')) {
        document.body.classList.remove('light', 'leaves');
        stopSummer(); stopMidnight();
        document.body.classList.add('light', 'rain');
        safePlay(rv()); safePlay(ra());
      }
    }
    if (k === 'c') {
      if (typeof window.activateChaos === 'function') window.activateChaos();
    }
  });

  // ── Mobile logo 字母 tap 切换 ─────────────
  // 从 body.classList 实时推断当前态，不用状态变量，避免和键盘快捷键 / 默认态不同步
  document.querySelectorAll('.logo-letter[data-mode]').forEach(el => {
    el.addEventListener('touchend', e => {
      e.preventDefault();
      const mode = el.dataset.mode;
      const cls  = document.body.classList;

      if (mode === 'day') {
        cls.add('light');
        stopSummer(); stopMidnight(); stopRain();
      } else if (mode === 'night') {
        stopSummer(); stopRain();
        cls.remove('light', 'leaves');
        if (cls.contains('midnight')) {
          stopMidnight();
        } else {
          cls.add('midnight');
          safePlay(mv()); safePlay(ma());
        }
      } else if (mode === 'summer') {
        stopMidnight();
        if (cls.contains('leaves')) {
          stopSummer();
          cls.remove('leaves');
          cls.add('light', 'rain');
          safePlay(rv()); safePlay(ra());
        } else {
          stopRain();
          cls.add('light', 'leaves');
          safePlay(v()); safePlay(a());
        }
      } else if (mode === 'chaos') {
        if (typeof window.activateChaos === 'function') window.activateChaos();
      }
    }, { passive: false });
  });

  // ── 默认夏夜模式：首次用户交互后启动森林音（视频已 autoplay + muted）─────────────
  function bootstrapLeavesAudio() {
    if (!document.body.classList.contains('leaves')) return;
    safePlay(v()); // 保险：若 autoplay 被挡，此刻补一次 play（已有用户交互）
    safePlay(a());
  }
  ['click', 'touchstart', 'keydown'].forEach(ev => {
    window.addEventListener(ev, bootstrapLeavesAudio, { once: true, passive: true });
  });
})();
