// ──────────────────────────────────────────────
// C 键彩蛋：Matter.js 物理坍塌
// 所有可见文字切成词块 → 变成物理 body 掉落；可拖拽；再按 C 键 750ms 归位
// 按需从 CDN 加载 Matter.js
// ──────────────────────────────────────────────

let chaosActive = false, chaosLock = false;
let _chaosRaf = null, _chaosState = null, _chaosEngine = null;

function activateChaos() {
  if (chaosLock) return;
  if (chaosActive) { _reverseChaos(); return; }
  if (window.Matter) { _doActivateChaos(); return; }
  chaosLock = true;
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';
  s.onload = () => { chaosLock = false; _doActivateChaos(); };
  document.head.appendChild(s);
}

function _doActivateChaos() {
  if (chaosLock || chaosActive) return;
  chaosLock = true;

  const { Engine, Bodies, Body, World } = Matter;
  const vw = window.innerWidth, vh = window.innerHeight;

  function fullyVisible(r) {
    return r.width > 0 && r.height > 0 &&
           r.top >= 1 && r.bottom <= vh - 1 &&
           r.left >= 1 && r.right <= vw - 1;
  }
  function notHidden(el) {
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  const toRestore  = [];
  const candidates = [];

  function walkText(node) {
    if (node.nodeType === 3) {
      const t = node.textContent;
      if (!t.trim()) return;
      const frag = document.createDocumentFragment();
      t.split(/(\s+)/).forEach(p => {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
        const s = document.createElement('span');
        s.className = '_cw'; s.style.display = 'inline-block'; s.textContent = p;
        frag.appendChild(s);
      });
      node.parentNode.replaceChild(frag, node);
    } else if (node.nodeType === 1 && !['IMG','VIDEO','SVG','CANVAS','BUTTON','INPUT'].includes(node.tagName)) {
      Array.from(node.childNodes).forEach(walkText);
    }
  }

  function splitContainer(el) {
    const html = el.innerHTML, vis = el.style.visibility;
    toRestore.push({ el, html, vis });
    Array.from(el.childNodes).forEach(walkText);
    el.querySelectorAll('._cw').forEach(span => {
      const r = span.getBoundingClientRect();
      if (fullyVisible(r)) candidates.push({ el: span, r, type: 'word' });
    });
    el.style.visibility = 'hidden';
  }

  function addBlock(el) {
    const r = el.getBoundingClientRect();
    if (fullyVisible(r) && notHidden(el)) candidates.push({ el, r, type: 'block' });
  }

  // Col-2 entries
  document.querySelectorAll('#col-thoughts .entry').forEach(entry => {
    const r = entry.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > vh) return;
    splitContainer(entry);
    entry.querySelectorAll('.voice-play-btn, .video-btn, .voice-scrubber, .voice-time, .video-wrap').forEach(addBlock);
  });

  // Col-1 children
  document.querySelectorAll('.col-1 > *').forEach(child => {
    const r = child.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    if (child.classList.contains('logo')) {
      if (fullyVisible(r)) candidates.push({ el: child, r, type: 'block' });
    } else {
      splitContainer(child);
      child.querySelectorAll('.diecarz-icon').forEach(addBlock);
    }
  });

  // Col-3 entries
  document.querySelectorAll('#col-images .entry').forEach(entry => {
    const r = entry.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > vh) return;
    toRestore.push({ el: entry, html: null, vis: entry.style.visibility });
    entry.style.visibility = 'hidden';

    const gallery = entry.querySelector('.gallery-wrap');
    if (gallery) {
      const activeImgWrap = gallery.querySelector('.gallery-slide.active .img-wrap');
      if (activeImgWrap) addBlock(activeImgWrap);
      const cap = gallery.querySelector('.gallery-caption');
      if (cap && cap.textContent.trim()) splitContainer(cap);
      gallery.querySelectorAll('.gallery-btn, .gallery-counter').forEach(addBlock);
    } else {
      const imgWrap = entry.querySelector('.img-wrap');
      const directMedia = entry.querySelector('img.entry-img, video.entry-img');
      if (imgWrap) addBlock(imgWrap);
      else if (directMedia) addBlock(directMedia);
      const cap = entry.querySelector('.entry-caption');
      if (cap && cap.textContent.trim()) splitContainer(cap);
    }
  });

  // 列分隔线物化为物理块
  const savedBorders = [];
  document.querySelectorAll('.col + .col').forEach(col => {
    const cs = getComputedStyle(col);
    const blw = parseFloat(cs.borderLeftWidth) || 0;
    const btw = parseFloat(cs.borderTopWidth)  || 0;
    const cr  = col.getBoundingClientRect();

    if (blw >= 1) {
      savedBorders.push({ el: col, prop: 'borderLeft', val: col.style.borderLeft });
      col.style.borderLeft = 'none';
      const sep = document.createElement('div');
      sep.style.cssText = `position:fixed;left:${cr.left - blw}px;top:0;width:${blw}px;height:${vh}px;` +
                          `background:var(--line);pointer-events:none;z-index:1`;
      document.body.appendChild(sep);
      candidates.push({
        el: sep, isTempEl: true, type: 'separator',
        r: { left: cr.left - blw, top: 0, right: cr.left, bottom: vh, width: blw, height: vh },
      });
    } else if (btw >= 1) {
      savedBorders.push({ el: col, prop: 'borderTop', val: col.style.borderTop });
      col.style.borderTop = 'none';
      const sep = document.createElement('div');
      sep.style.cssText = `position:fixed;left:0;top:${cr.top - btw}px;width:${vw}px;height:${btw}px;` +
                          `background:var(--line);pointer-events:none;z-index:1`;
      document.body.appendChild(sep);
      candidates.push({
        el: sep, isTempEl: true, type: 'separator',
        r: { left: 0, top: cr.top - btw, right: vw, bottom: cr.top, width: vw, height: btw },
      });
    }
  });

  const engine = Engine.create({ gravity: { y: 3.5 }, enableSleeping: true });
  const world  = engine.world;
  const WW = 100;
  World.add(world, [
    Bodies.rectangle(vw/2,      vh + WW/2, vw + 400, WW,  { isStatic: true, friction: 0.9, restitution: 0.04 }),
    Bodies.rectangle(-WW/2,     vh/2,       WW, vh * 4,    { isStatic: true }),
    Bodies.rectangle(vw + WW/2, vh/2,       WW, vh * 4,    { isStatic: true }),
  ]);

  const overlayRoot = document.createElement('div');
  overlayRoot.style.cssText = 'position:fixed;inset:0;z-index:9001;pointer-events:none;overflow:visible;user-select:none';
  document.body.appendChild(overlayRoot);

  const items = [];
  let dragBody = null, dragLastX = 0, dragLastY = 0, dragVx = 0, dragVy = 0, dragOx = 0, dragOy = 0;

  candidates.forEach(({ el, r, type, isTempEl }) => {
    const w  = Math.max(r.width, 2);
    const h  = Math.max(r.height, 2);
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;

    const opts =
      type === 'separator' ? { friction: 0.2, restitution: 0.5, frictionAir: 0.001, density: 0.0003 } :
      type === 'word'      ? { friction: 0.5, restitution: 0.1, frictionAir: 0.004  } :
                             { friction: 0.7, restitution: 0.06, frictionAir: 0.004 };
    const body = Bodies.rectangle(cx, cy, w, h, opts);
    World.add(world, body);

    const ov = document.createElement('div');
    ov.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;` +
                       `pointer-events:auto;cursor:grab;will-change:transform;` +
                       `transform:translate(${cx - w/2}px,${cy - h/2}px)`;

    if (type === 'word') {
      const cs = getComputedStyle(el);
      Object.assign(ov.style, {
        fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        color: cs.color, letterSpacing: cs.letterSpacing, lineHeight: cs.lineHeight,
        whiteSpace: 'nowrap', display: 'flex', alignItems: 'center',
      });
      ov.textContent = el.textContent;
    } else if (type === 'separator') {
      ov.style.width = '1px'; ov.style.background = 'var(--line)';
    } else {
      const clone = el.cloneNode(true);
      const pos = getComputedStyle(el).position;
      if (pos === 'fixed' || pos === 'sticky') clone.style.position = 'static';
      clone.style.width = w + 'px'; clone.style.height = h + 'px'; clone.style.overflow = 'hidden';
      ov.appendChild(clone);
      if (el.classList.contains('logo')) {
        const yLetter = clone.querySelector('[data-mode="chaos"]');
        if (yLetter) {
          yLetter.style.cursor = 'pointer';
          yLetter.addEventListener('touchend', e => {
            const t = e.changedTouches[0];
            if (t && Math.hypot(t.clientX - downX, t.clientY - downY) < 15) {
              e.stopPropagation();
              dragBody = null;
              activateChaos();
            }
          });
        }
      }
    }

    overlayRoot.appendChild(ov);
    const origVis = el.style.visibility;
    el.style.visibility = 'hidden';

    let downX = 0, downY = 0;
    ov.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      Matter.Sleeping && Matter.Sleeping.set(body, false);
      dragBody = body;
      dragLastX = e.clientX; dragLastY = e.clientY; dragVx = dragVy = 0;
      dragOx = body.position.x - e.clientX; dragOy = body.position.y - e.clientY;
      downX = e.clientX; downY = e.clientY; ov.style.cursor = 'grabbing';
      e.preventDefault();
    });
    ov.addEventListener('mouseup', () => { ov.style.cursor = 'grab'; });
    ov.addEventListener('click', e => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) {
        e.preventDefault(); e.stopPropagation();
      }
    });
    ov.addEventListener('touchstart', e => {
      const t = e.touches[0];
      Matter.Sleeping && Matter.Sleeping.set(body, false);
      dragBody = body;
      dragLastX = t.clientX; dragLastY = t.clientY; dragVx = dragVy = 0;
      dragOx = body.position.x - t.clientX; dragOy = body.position.y - t.clientY;
      downX = t.clientX; downY = t.clientY;
    }, { passive: true });

    items.push({ body, ov, el, type, isTempEl: !!isTempEl, origVis, cx, cy, w, h });
  });

  function onMouseMove(e) {
    if (!dragBody) return;
    dragVx = e.clientX - dragLastX; dragVy = e.clientY - dragLastY;
    dragLastX = e.clientX; dragLastY = e.clientY;
    Body.setPosition(dragBody, { x: e.clientX + dragOx, y: e.clientY + dragOy });
    Body.setVelocity(dragBody, { x: dragVx * 2, y: dragVy * 2 });
  }
  function onMouseUp() {
    if (!dragBody) return;
    Body.setVelocity(dragBody, { x: dragVx * 4, y: dragVy * 4 }); dragBody = null;
  }
  function onTouchMove(e) {
    if (!dragBody || !e.touches[0]) return;
    const t = e.touches[0];
    dragVx = t.clientX - dragLastX; dragVy = t.clientY - dragLastY;
    dragLastX = t.clientX; dragLastY = t.clientY;
    Body.setPosition(dragBody, { x: t.clientX + dragOx, y: t.clientY + dragOy });
    Body.setVelocity(dragBody, { x: dragVx * 2, y: dragVy * 2 });
    e.preventDefault();
  }
  function onTouchEnd() {
    if (!dragBody) return;
    Body.setVelocity(dragBody, { x: dragVx * 4, y: dragVy * 4 }); dragBody = null;
  }
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup',   onMouseUp);
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend',  onTouchEnd);

  function tick() {
    Engine.update(engine, 1000 / 60);
    items.forEach(({ body, ov, w, h }) => {
      const { x, y } = body.position;
      ov.style.transform = `translate(${x - w/2}px,${y - h/2}px) rotate(${body.angle}rad)`;
    });
    _chaosRaf = requestAnimationFrame(tick);
  }
  _chaosRaf = requestAnimationFrame(tick);

  document.body.style.overflow = 'hidden';
  _chaosEngine = engine;
  _chaosState  = { items, toRestore, savedBorders, overlayRoot, onMouseMove, onMouseUp, onTouchMove, onTouchEnd };
  chaosActive  = true;
  chaosLock    = false;
}

function _reverseChaos() {
  if (!_chaosState || chaosLock) return;
  chaosLock = true;
  cancelAnimationFrame(_chaosRaf);

  const { items, toRestore, savedBorders, overlayRoot, onMouseMove, onMouseUp, onTouchMove, onTouchEnd } = _chaosState;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup',   onMouseUp);
  document.removeEventListener('touchmove', onTouchMove);
  document.removeEventListener('touchend',  onTouchEnd);

  const snaps = items.map(({ body, ov, w, h, cx, cy }) => ({
    ov, w, h, cx, cy, fx: body.position.x, fy: body.position.y, fa: body.angle,
  }));
  const DUR = 750, t0 = performance.now();
  const ease = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;

  (function rev(ts) {
    const p = Math.min((ts - t0) / DUR, 1), e = ease(p);
    snaps.forEach(({ ov, w, h, cx, cy, fx, fy, fa }) => {
      const x = fx + (cx - fx) * e, y = fy + (cy - fy) * e, a = fa * (1 - e);
      ov.style.transform = `translate(${x - w/2}px,${y - h/2}px) rotate(${a}rad)`;
    });
    if (p < 1) { _chaosRaf = requestAnimationFrame(rev); return; }

    items.forEach(({ el, type, isTempEl, origVis }) => {
      if (isTempEl)        { el.remove(); return; }
      if (type !== 'word') el.style.visibility = origVis;
    });
    toRestore.forEach(({ el, html, vis }) => {
      if (html !== null) el.innerHTML = html;
      el.style.visibility = vis;
    });
    savedBorders.forEach(({ el, prop, val }) => { el.style[prop] = val; });
    overlayRoot.remove();
    Matter.Engine.clear(_chaosEngine);
    _chaosEngine = _chaosState = null;
    document.body.style.overflow = '';
    chaosActive = chaosLock = false;
  })(t0);
}

window.activateChaos = activateChaos;
