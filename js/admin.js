// ──────────────────────────────────────────────
// 发布面板逻辑：GitHub API 直接操作 repo 内容
// repo: realruian/personal-os
// 数据源：content/data.json
// 图片路径：assets/thoughts/{ts}-{i}.{ext}
// ──────────────────────────────────────────────

const REPO_OWNER = 'realruian';
const REPO_NAME = 'personal-os';
const BRANCH = 'main';
const DATA_PATH = 'content/data.json';
const TOKEN_KEY = 'gh_token';
const ANTHROPIC_KEY = 'anthropic_key';

// ── 状态 ──
let selectedFiles = []; // [{ file, blobUrl }]  — 新选的文件
let keptImageUrls = []; // [url, url]            — 编辑时保留的旧图 url
let currentMode = 'thought'; // 'thought' | 'photo'
let editingEntry = null;    // 正在编辑的条目：{ ts, type } 或 null

// ── DOM ──
const $ = (id) => document.getElementById(id);
const authSection = $('auth-section');
const postSection = $('post-section');
const tokenInput = $('token-input');
const saveTokenBtn = $('save-token-btn');
const logoutBtn = $('logout-btn');
const textZh = $('text-zh');
const textEn = $('text-en');
const captionZh = $('caption-zh');
const captionEn = $('caption-en');
const galleryCheck = $('gallery-check');
const featuredCheck = $('featured-check');
const translateCheck = $('translate-check');
const translateWrapper = $('translate-wrapper');
const thoughtFields = $('thought-fields');
const photoFields = $('photo-fields');
const tabBtns = document.querySelectorAll('.tab-btn');
const dropZone = $('drop-zone');
const fileInput = $('file-input');
const previewGrid = $('preview-grid');
const publishBtn = $('publish-btn');
const cancelBtn = $('cancel-btn');
const statusEl = $('status');
const anthropicKeyInput = $('anthropic-key-input');
const saveAnthropicBtn = $('save-anthropic-btn');
const anthropicStatus = $('anthropic-status');
const manageDetails = $('manage-details');
const entriesList = $('entries-list');

// ── GitHub API 封装 ──

function ghHeaders() {
  return {
    'Authorization': `Bearer ${getToken()}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };
}

async function ghGet(path) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ghPut(path, contentBase64, sha, message) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const body = { message, content: contentBase64, branch: BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: ghHeaders(),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ghDelete(path, sha, message) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: ghHeaders(),
    body: JSON.stringify({ message, sha, branch: BRANCH })
  });
  // 404 说明文件已不存在，视作成功
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ── 工具 ──

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function getAnthropicKey() { return localStorage.getItem(ANTHROPIC_KEY); }

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = reader.result;
      const comma = s.indexOf(',');
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function strToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToStr(b64) {
  const binary = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function guessExt(file) {
  const name = (file.name || '').toLowerCase();
  const m = name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/);
  if (m) return m[1] === 'jpeg' ? 'jpg' : m[1];
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/gif') return 'gif';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

function showStatus(msg, type) {
  statusEl.className = `status ${type || ''}`;
  statusEl.textContent = msg;
  statusEl.classList.remove('hidden');
}

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── 图片选择 / 预览 ──

function addFiles(files) {
  Array.from(files).forEach((file) => {
    if (!file.type.startsWith('image/')) return;
    const blobUrl = URL.createObjectURL(file);
    selectedFiles.push({ file, blobUrl });
  });
  renderPreview();
}

function removeNewFile(idx) {
  URL.revokeObjectURL(selectedFiles[idx].blobUrl);
  selectedFiles.splice(idx, 1);
  renderPreview();
}

function removeKeptImage(idx) {
  keptImageUrls.splice(idx, 1);
  renderPreview();
}

function renderPreview() {
  // 先显示保留的旧图（编辑态），再显示新选的
  const kept = keptImageUrls.map((url, i) =>
    `<div class="preview-item">
       <img src="/${url}" alt="">
       <button type="button" class="preview-remove" data-kept="${i}">×</button>
     </div>`
  ).join('');
  const fresh = selectedFiles.map((item, i) =>
    `<div class="preview-item">
       <img src="${item.blobUrl}" alt="">
       <button type="button" class="preview-remove" data-new="${i}">×</button>
     </div>`
  ).join('');
  previewGrid.innerHTML = kept + fresh;
  previewGrid.querySelectorAll('.preview-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.kept != null) removeKeptImage(parseInt(btn.dataset.kept, 10));
      else removeNewFile(parseInt(btn.dataset.new, 10));
    });
  });
}

// ── 翻译（可选） ──

async function translateToEn(textZh) {
  const key = getAnthropicKey();
  if (!key) throw new Error('Anthropic key 未设置，无法自动翻译');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: 'You translate Chinese to English. Output only the English translation, no explanations, no quotes around it, preserve paragraph breaks and line formatting exactly.',
      messages: [{ role: 'user', content: textZh }]
    })
  });
  if (!res.ok) throw new Error(`translate failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const text = json?.content?.[0]?.text;
  if (!text) throw new Error('translate: empty response');
  return text.trim();
}

// ── 发布 / 更新 ──

async function uploadNewImages(ts) {
  const uploaded = [];
  for (let i = 0; i < selectedFiles.length; i++) {
    showStatus(`上传图片 ${i + 1}/${selectedFiles.length}...`);
    const file = selectedFiles[i].file;
    const ext = guessExt(file);
    const path = `assets/thoughts/${ts}-${i}.${ext}`;
    const b64 = await fileToBase64(file);
    await ghPut(path, b64, null, `post: upload ${path}`);
    uploaded.push({ url: path });
  }
  return uploaded;
}

async function publish() {
  // 根据 mode 读字段
  let text_zh, text_en, caption_zh, caption_en;
  if (currentMode === 'thought') {
    text_zh = textZh.value.trim();
    text_en = textEn.value.trim();
    if (!text_zh) {
      showStatus('中文内容是必填的', 'error');
      textZh.focus();
      return;
    }
  } else {
    caption_zh = captionZh.value.trim();
    caption_en = captionEn.value.trim();
    if (selectedFiles.length === 0 && keptImageUrls.length === 0) {
      showStatus('photo 模式需要至少一张图', 'error');
      return;
    }
  }

  const featured = featuredCheck.checked;
  const shouldTranslate = translateCheck.checked;

  publishBtn.disabled = true;
  cancelBtn.disabled = true;
  const ts = editingEntry ? editingEntry.ts : Date.now();

  try {
    // 自动翻译（仅 thought 模式）
    if (currentMode === 'thought' && shouldTranslate && !text_en && text_zh) {
      showStatus('翻译中...');
      text_en = await translateToEn(text_zh);
    }

    // 上传新图片
    const newUploaded = await uploadNewImages(ts);
    const keptObjs = keptImageUrls.map(url => ({ url }));
    const allImages = [...keptObjs, ...newUploaded];

    // 读取 data.json
    showStatus('读取 data.json...');
    const current = await ghGet(DATA_PATH);
    if (!current) throw new Error('data.json 不存在');
    const currentJson = JSON.parse(base64ToStr(current.content));
    currentJson.thoughts = currentJson.thoughts || [];
    currentJson.images = currentJson.images || [];

    // 构造新条目
    let newEntry;
    if (currentMode === 'thought') {
      newEntry = {
        type: 'thought',
        ts,
        text_zh,
        ...(text_en ? { text_en } : {}),
        ...(allImages.length ? { images: allImages } : {}),
        ...(featured ? { featured: true, featured_ts: ts } : {})
      };
    } else {
      // photo 模式：gallery 或多个 image
      if (galleryCheck.checked && allImages.length > 1) {
        newEntry = {
          type: 'gallery',
          ts,
          images: allImages.map(im => ({ url: im.url })),
          ...(caption_zh ? { captionHtml_zh: caption_zh } : {}),
          ...(caption_en ? { captionHtml_en: caption_en } : {})
        };
      } else {
        // 多张独立图 → 只有一张或不打包：每张一个 image 条目
        // 若多张独立图，用户意图模糊，我们只用第一张为主条目，把剩余单独追加
        newEntry = {
          type: 'image',
          ts,
          url: allImages[0].url,
          ...(caption_zh ? { caption_zh } : {}),
          ...(caption_en ? { caption_en } : {})
        };
      }
    }

    // 写回：编辑 or 新增
    if (editingEntry) {
      const arr = editingEntry.type === 'thought' ? currentJson.thoughts : currentJson.images;
      const idx = arr.findIndex(e => e.ts === editingEntry.ts);
      if (idx >= 0) arr[idx] = newEntry;
      else arr.unshift(newEntry);
    } else {
      if (currentMode === 'thought') {
        if (featured) currentJson.thoughts.forEach(t => { delete t.featured; delete t.featured_ts; });
        currentJson.thoughts.unshift(newEntry);
      } else {
        currentJson.images.unshift(newEntry);
        // photo 模式若多张独立图（非 gallery），把其他图当独立条目加入
        if (!galleryCheck.checked && allImages.length > 1) {
          for (let i = 1; i < allImages.length; i++) {
            currentJson.images.splice(i, 0, {
              type: 'image',
              ts: ts + i,  // 时间戳微调避免重复
              url: allImages[i].url,
              ...(caption_zh ? { caption_zh } : {}),
              ...(caption_en ? { caption_en } : {})
            });
          }
        }
      }
    }

    // 提交
    showStatus(editingEntry ? '更新 data.json...' : '提交 data.json...');
    const digest = (text_zh || caption_zh || '(无文字)').slice(0, 20).replace(/\s+/g, ' ');
    const date = new Date(ts).toISOString().slice(0, 16).replace('T', ' ');
    const prefix = editingEntry ? 'edit' : 'post';
    const message = `${prefix}: ${date} · ${digest}`;
    const newContentB64 = strToBase64(JSON.stringify(currentJson, null, 2) + '\n');
    await ghPut(DATA_PATH, newContentB64, current.sha, message);

    showStatus(
      `✅ ${editingEntry ? '更新' : '发布'}成功！\n` +
      '主站约 60-90 秒后部署完成，刷新 https://tianruian.com 可见。',
      'success'
    );

    resetForm();
    // 如果 manage 展开着，重新加载列表
    if (manageDetails.open) loadEntries();
  } catch (e) {
    console.error(e);
    const msg = String(e.message || e);
    if (msg.includes('401') || msg.includes('Bad credentials')) {
      showStatus('❌ Token 无效或已过期。点 logout 重新输入。\n\n' + msg, 'error');
    } else if (msg.includes('403')) {
      showStatus('❌ Token 权限不足。确认 fine-grained PAT 的 Contents 是 Read and write，且 repo 范围含 personal-os。\n\n' + msg, 'error');
    } else if (msg.includes('404')) {
      showStatus('❌ Repo 或文件路径找不到。\n\n' + msg, 'error');
    } else {
      showStatus('❌ 失败：\n\n' + msg, 'error');
    }
  } finally {
    publishBtn.disabled = false;
    cancelBtn.disabled = false;
  }
}

function resetForm() {
  textZh.value = '';
  textEn.value = '';
  captionZh.value = '';
  captionEn.value = '';
  galleryCheck.checked = false;
  featuredCheck.checked = false;
  translateCheck.checked = false;
  selectedFiles.forEach((f) => URL.revokeObjectURL(f.blobUrl));
  selectedFiles = [];
  keptImageUrls = [];
  renderPreview();
  exitEditMode();
}

// ── 编辑模式 ──

function enterEditMode(entry, type) {
  editingEntry = { ts: entry.ts, type };
  publishBtn.textContent = '更新';
  // 插入编辑 banner
  let banner = document.querySelector('.edit-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'edit-banner';
    banner.innerHTML = `
      <span>正在编辑：${fmtDate(entry.ts)}</span>
      <button type="button" class="edit-banner-cancel">cancel</button>
    `;
    document.querySelector('.tab-switch').after(banner);
    banner.querySelector('.edit-banner-cancel').addEventListener('click', () => {
      if (confirm('取消编辑？当前改动会丢失。')) {
        resetForm();
      }
    });
  } else {
    banner.firstElementChild.textContent = `正在编辑：${fmtDate(entry.ts)}`;
  }

  // 切到正确 mode
  if (type === 'thought') switchMode('thought');
  else switchMode('photo');

  // 填内容
  if (type === 'thought') {
    textZh.value = entry.text_zh || entry.text || '';
    textEn.value = entry.text_en || '';
  } else {
    captionZh.value = entry.caption_zh || entry.captionHtml_zh || '';
    captionEn.value = entry.caption_en || entry.captionHtml_en || '';
    galleryCheck.checked = entry.type === 'gallery';
  }
  featuredCheck.checked = !!entry.featured;

  // 图片：保留现有 url，等待新增
  selectedFiles.forEach((f) => URL.revokeObjectURL(f.blobUrl));
  selectedFiles = [];
  if (entry.images && Array.isArray(entry.images)) {
    keptImageUrls = entry.images.map(im => im.url);
  } else if (entry.url) {
    keptImageUrls = [entry.url];
  } else {
    keptImageUrls = [];
  }
  renderPreview();

  // 滚到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exitEditMode() {
  editingEntry = null;
  publishBtn.textContent = '发布';
  const banner = document.querySelector('.edit-banner');
  if (banner) banner.remove();
}

// ── 历史条目列表 ──

async function loadEntries() {
  entriesList.innerHTML = '<p class="admin-hint">加载中…</p>';
  try {
    const current = await ghGet(DATA_PATH);
    if (!current) { entriesList.innerHTML = '<p class="admin-hint">data.json 不存在</p>'; return; }
    const json = JSON.parse(base64ToStr(current.content));

    const all = [
      ...(json.thoughts || []).map(t => ({ ...t, __type: 'thought' })),
      ...(json.images || []).map(i => ({ ...i, __type: 'image' }))
    ].sort((a, b) => (b.ts || 0) - (a.ts || 0));

    if (!all.length) {
      entriesList.innerHTML = '<p class="admin-hint">暂无条目</p>';
      return;
    }

    entriesList.innerHTML = all.map((e) => {
      const preview = e.__type === 'thought'
        ? (e.text_zh || e.text || '').slice(0, 60).replace(/\s+/g, ' ')
        : (e.caption_zh || e.captionHtml_zh || '').slice(0, 40);
      const imgTag = e.__type === 'image' || e.type === 'image'
        ? `<img src="/${e.url}" alt="">`
        : (e.images && e.images[0] ? `<img src="/${e.images[0].url}" alt="">` : '');
      const kindLabel = e.__type === 'thought'
        ? (e.featured ? '★ thought' : 'thought')
        : (e.type === 'gallery' ? 'gallery' : 'image');
      return `<div class="entry-row" data-ts="${e.ts}" data-kind="${e.__type}">
        <div class="entry-meta">
          <div class="entry-meta-time">${kindLabel} · ${fmtDate(e.ts)}</div>
          <div class="entry-meta-preview">${imgTag}${preview || '(无文字)'}</div>
        </div>
        <div class="entry-actions">
          <button type="button" class="entry-action-btn" data-action="edit">edit</button>
          <button type="button" class="entry-action-btn danger" data-action="delete">delete</button>
        </div>
      </div>`;
    }).join('');

    // 绑定 action
    entriesList.querySelectorAll('.entry-action-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.entry-row');
        const ts = parseInt(row.dataset.ts, 10);
        const kind = row.dataset.kind;
        const action = btn.dataset.action;
        const source = kind === 'thought' ? json.thoughts : json.images;
        const entry = source.find(x => x.ts === ts);
        if (!entry) return;

        if (action === 'edit') {
          enterEditMode(entry, kind);
        } else if (action === 'delete') {
          if (!confirm('确认删除这条？不可撤销。')) return;
          await deleteEntry(entry, kind);
        }
      });
    });
  } catch (e) {
    entriesList.innerHTML = `<p class="admin-hint" style="color:#d04040">加载失败：${e.message}</p>`;
  }
}

async function deleteEntry(entry, kind) {
  try {
    showStatus('删除关联图片...');
    // 先删关联图片
    const imageUrls = [];
    if (entry.images && Array.isArray(entry.images)) entry.images.forEach(im => imageUrls.push(im.url));
    if (entry.url) imageUrls.push(entry.url);

    for (const url of imageUrls) {
      try {
        const meta = await ghGet(url);
        if (meta && meta.sha) {
          await ghDelete(url, meta.sha, `delete: remove ${url}`);
        }
      } catch (err) {
        // 单图删除失败不阻断整体流程，继续
        console.warn('delete image failed:', url, err);
      }
    }

    // 重读 data.json（sha 可能变了），删掉该条目
    showStatus('更新 data.json...');
    const current = await ghGet(DATA_PATH);
    const json = JSON.parse(base64ToStr(current.content));
    const arrKey = kind === 'thought' ? 'thoughts' : 'images';
    json[arrKey] = (json[arrKey] || []).filter(x => x.ts !== entry.ts);

    const digest = (entry.text_zh || entry.caption_zh || '').slice(0, 20).replace(/\s+/g, ' ');
    const date = new Date(entry.ts).toISOString().slice(0, 16).replace('T', ' ');
    await ghPut(DATA_PATH, strToBase64(JSON.stringify(json, null, 2) + '\n'), current.sha, `delete: ${date} · ${digest}`);

    showStatus('✅ 已删除。主站 ~90s 后生效。', 'success');
    loadEntries();
  } catch (e) {
    showStatus('❌ 删除失败：\n\n' + String(e.message || e), 'error');
  }
}

// ── 模式切换 ──

function switchMode(mode) {
  currentMode = mode;
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  thoughtFields.classList.toggle('hidden', mode !== 'thought');
  photoFields.classList.toggle('hidden', mode !== 'photo');
  // 翻译只对 thought 有效
  translateWrapper.style.display = mode === 'thought' ? '' : 'none';
}

// ── 事件绑定 ──

function initAuth() {
  saveTokenBtn.addEventListener('click', () => {
    const val = tokenInput.value.trim();
    if (!val) return;
    localStorage.setItem(TOKEN_KEY, val);
    tokenInput.value = '';
    showUI();
  });
  tokenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveTokenBtn.click();
  });
}

function initPost() {
  publishBtn.addEventListener('click', publish);

  cancelBtn.addEventListener('click', () => {
    if (!confirm('清空当前输入？')) return;
    resetForm();
    statusEl.classList.add('hidden');
  });

  logoutBtn.addEventListener('click', () => {
    if (!confirm('清除 Token？下次发布需要重新输入。')) return;
    localStorage.removeItem(TOKEN_KEY);
    showUI();
  });

  // mode 切换
  tabBtns.forEach(b => {
    b.addEventListener('click', () => {
      if (editingEntry) {
        if (!confirm('切换模式会取消当前编辑，继续？')) return;
        resetForm();
      }
      switchMode(b.dataset.mode);
    });
  });

  // 图片拖拽 / 点击
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    addFiles(e.target.files);
    fileInput.value = '';
  });
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });

  // 粘贴图
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) addFiles(files);
  });

  // Anthropic key 保存
  saveAnthropicBtn.addEventListener('click', () => {
    const val = anthropicKeyInput.value.trim();
    if (val) {
      localStorage.setItem(ANTHROPIC_KEY, val);
      anthropicKeyInput.value = '';
      anthropicStatus.textContent = '已保存 ✓';
      anthropicStatus.style.color = 'var(--text)';
    } else {
      localStorage.removeItem(ANTHROPIC_KEY);
      anthropicStatus.textContent = '已清除';
    }
    updateTranslateUI();
    setTimeout(() => { anthropicStatus.textContent = ''; }, 3000);
  });

  // manage 面板打开时加载
  manageDetails.addEventListener('toggle', () => {
    if (manageDetails.open) loadEntries();
  });

  // iOS 键盘遮挡：VisualViewport API 动态调 padding
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const gap = window.innerHeight - window.visualViewport.height;
      document.body.style.paddingBottom = gap > 100 ? gap + 'px' : '';
    });
  }
}

function updateTranslateUI() {
  const hasKey = !!getAnthropicKey();
  translateCheck.disabled = !hasKey;
  if (!hasKey) translateCheck.checked = false;
  translateWrapper.title = hasKey ? '' : '请在 settings 里填入 Anthropic key 后启用';
  translateWrapper.style.opacity = hasKey ? '1' : '0.5';
}

function showUI() {
  if (getToken()) {
    authSection.classList.add('hidden');
    postSection.classList.remove('hidden');
    updateTranslateUI();
  } else {
    authSection.classList.remove('hidden');
    postSection.classList.add('hidden');
    tokenInput.focus();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initPost();
  showUI();
});
