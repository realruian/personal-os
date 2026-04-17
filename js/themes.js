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
  let _summerCycle = 0; // 0→summer, 1→rain
  let _nightCycle  = 0; // 0→night,  1→midnight

  document.querySelectorAll('.logo-letter[data-mode]').forEach(el => {
    el.addEventListener('touchend', e => {
      e.preventDefault();
      const mode = el.dataset.mode;

      if (mode === 'day') {
        document.body.classList.add('light');
        stopSummer(); stopMidnight(); stopRain();
        _summerCycle = 0; _nightCycle = 0;
      } else if (mode === 'night') {
        stopSummer(); stopRain();
        if (_nightCycle === 0) {
          document.body.classList.remove('light', 'leaves');
          stopMidnight();
          _nightCycle = 1;
        } else {
          document.body.classList.remove('light', 'leaves');
          stopMidnight();
          document.body.classList.add('midnight');
          safePlay(mv()); safePlay(ma());
          _nightCycle = 0;
        }
      } else if (mode === 'summer') {
        stopMidnight();
        if (_summerCycle === 0) {
          stopRain();
          document.body.classList.add('light', 'leaves');
          safePlay(v()); safePlay(a());
          _summerCycle = 1;
        } else {
          stopSummer();
          document.body.classList.remove('leaves');
          document.body.classList.add('light', 'rain');
          safePlay(rv()); safePlay(ra());
          _summerCycle = 0;
        }
      } else if (mode === 'chaos') {
        if (typeof window.activateChaos === 'function') window.activateChaos();
      }
    }, { passive: false });
  });
})();
