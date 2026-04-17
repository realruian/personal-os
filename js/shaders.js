// ──────────────────────────────────────────────
// HalftoneDots shader 覆盖图片
// 出视口自动卸载 WebGL RAF，节省 GPU
// ──────────────────────────────────────────────
import React from 'https://esm.sh/react@18';
import { createRoot } from 'https://esm.sh/react-dom@18/client';
import { HalftoneDots } from 'https://esm.sh/@paper-design/shaders-react@0.0.72?deps=react@18,react-dom@18';

const shaderProps = {
  contrast: 0.4, originalColors: false, inverted: false,
  grid: 'hex', radius: 1, size: 0.2, scale: 1,
  grainSize: 0.5, type: 'gooey', fit: 'cover',
  grainMixer: 0.2, grainOverlay: 0.2,
  colorFront: '#2B2B2B', colorBack: '#00000000',
  style: { width: '100%', height: '100%', backgroundColor: '#F2F1E8' },
};

const shaderRegistry = new Map();

async function initShader(wrap) {
  if (wrap.dataset.shaderInit) return;
  const slide = wrap.closest('.gallery-slide');
  if (slide && !slide.classList.contains('active')) return;
  wrap.dataset.shaderInit = '1';
  const img     = wrap.querySelector('img');
  const overlay = wrap.querySelector('.shader-overlay');
  if (!img || !overlay) return;

  await new Promise(r => {
    if (img.complete && img.naturalWidth > 0) r();
    else img.addEventListener('load', r, { once: true });
  });

  try {
    const props = { ...shaderProps, image: img.src };
    const root  = createRoot(overlay);
    root.render(React.createElement(HalftoneDots, props));
    shaderRegistry.set(wrap, { root, props });
    visibilityObserver.observe(wrap);
  } catch (e) {
    console.warn('Shader failed:', e);
    overlay.remove();
  }
}

window._initShader = initShader;

const videoShaderProps = {
  ...shaderProps,
  style: { width: '100%', height: '100%', backgroundColor: 'transparent' },
};

function initVideoShader(wrap) {
  const overlay = wrap.querySelector('.shader-overlay');
  if (!overlay) return;
  try {
    const root = createRoot(overlay);
    root.render(React.createElement(HalftoneDots, videoShaderProps));
    shaderRegistry.set(wrap, { root, props: videoShaderProps });
    visibilityObserver.observe(wrap);
  } catch (e) {
    console.warn('Video shader failed:', e);
  }
}

const visibilityObserver = new IntersectionObserver(entries => {
  entries.forEach(({ target, isIntersecting }) => {
    const data = shaderRegistry.get(target);
    if (!data) return;
    data.root.render(isIntersecting
      ? React.createElement(HalftoneDots, data.props)
      : null
    );
  });
}, { rootMargin: '150px' });

const observer = new MutationObserver(mutations => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType === 1) {
        node.querySelectorAll?.('.img-wrap').forEach(initShader);
        node.querySelectorAll?.('.video-wrap').forEach(initVideoShader);
      }
    }
  }
});
const col3 = document.getElementById('col-images');
const col2 = document.getElementById('col-thoughts');
if (col3) observer.observe(col3, { childList: true, subtree: true });
if (col2) observer.observe(col2, { childList: true, subtree: true });

document.querySelectorAll('#col-images .img-wrap').forEach(initShader);
document.querySelectorAll('#col-thoughts .video-wrap').forEach(initVideoShader);
