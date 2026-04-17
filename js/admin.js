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

// ── 状态 ──
let selectedFiles = []; // [{ file, blobUrl }]

// ── DOM ──
const $ = (id) => document.getElementById(id);
const authSection = $('auth-section');
const postSection = $('post-section');
const tokenInput = $('token-input');
const saveTokenBtn = $('save-token-btn');
const logoutBtn = $('logout-btn');
const textZh = $('text-zh');
const textEn = $('text-en');
const featuredCheck = $('featured-check');
const dropZone = $('drop-zone');
const fileInput = $('file-input');
const previewGrid = $('preview-grid');
const publishBtn = $('publish-btn');
const cancelBtn = $('cancel-btn');
const statusEl = $('status');

// ── GitHub API 封装 ──

function ghHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };
}

async function ghGet(path) {
  const token = getToken();
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`;
  const res = await fetch(url, { headers: ghHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ghPut(path, contentBase64, sha, message) {
  const token = getToken();
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const body = {
    message,
    content: contentBase64,
    branch: BRANCH
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: ghHeaders(token),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ── 工具 ──

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// File → base64（去掉 data URL 前缀）
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

// 字符串 → base64（UTF-8 安全）
function strToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// base64 → 字符串（UTF-8 安全）
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

// ── 图片选择 / 预览 ──

function addFiles(files) {
  Array.from(files).forEach((file) => {
    if (!file.type.startsWith('image/')) return;
    const blobUrl = URL.createObjectURL(file);
    selectedFiles.push({ file, blobUrl });
  });
  renderPreview();
}

function removeFile(idx) {
  URL.revokeObjectURL(selectedFiles[idx].blobUrl);
  selectedFiles.splice(idx, 1);
  renderPreview();
}

function renderPreview() {
  previewGrid.innerHTML = selectedFiles.map((item, i) =>
    `<div class="preview-item">
       <img src="${item.blobUrl}" alt="">
       <button type="button" class="preview-remove" data-idx="${i}">×</button>
     </div>`
  ).join('');
  previewGrid.querySelectorAll('.preview-remove').forEach((btn) => {
    btn.addEventListener('click', () => removeFile(parseInt(btn.dataset.idx, 10)));
  });
}

// ── 发布主流程 ──

async function publish() {
  const text_zh = textZh.value.trim();
  const text_en = textEn.value.trim();
  const featured = featuredCheck.checked;

  if (!text_zh) {
    showStatus('中文内容是必填的', 'error');
    textZh.focus();
    return;
  }

  publishBtn.disabled = true;
  cancelBtn.disabled = true;
  const ts = Date.now();

  try {
    // 1. 上传所有图片
    const images = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      showStatus(`上传图片 ${i + 1}/${selectedFiles.length}...`);
      const file = selectedFiles[i].file;
      const ext = guessExt(file);
      const path = `assets/thoughts/${ts}-${i}.${ext}`;
      const b64 = await fileToBase64(file);
      await ghPut(path, b64, null, `post: upload ${path}`);
      images.push({ url: path });
    }

    // 2. 读取当前 data.json（拿 sha + 解析内容）
    showStatus('读取 data.json...');
    const current = await ghGet(DATA_PATH);
    if (!current) throw new Error('data.json 不存在，这不应该发生');
    const currentJson = JSON.parse(base64ToStr(current.content));

    // 3. 构造新 thought
    const newThought = {
      type: 'thought',
      ts,
      text_zh,
      ...(text_en ? { text_en } : {}),
      ...(images.length ? { images } : {}),
      ...(featured ? { featured: true, featured_ts: ts } : {})
    };

    // 4. 如果新的 featured，清掉旧 featured
    if (featured && Array.isArray(currentJson.thoughts)) {
      currentJson.thoughts.forEach((t) => {
        delete t.featured;
        delete t.featured_ts;
      });
    }

    // 5. 追加
    currentJson.thoughts = currentJson.thoughts || [];
    currentJson.thoughts.unshift(newThought);

    // 6. 写回
    showStatus('提交 data.json...');
    const digest = text_zh.slice(0, 20).replace(/\s+/g, ' ');
    const date = new Date(ts).toISOString().slice(0, 16).replace('T', ' ');
    const message = `post: ${date} · ${digest}`;
    const newContentB64 = strToBase64(JSON.stringify(currentJson, null, 2) + '\n');
    await ghPut(DATA_PATH, newContentB64, current.sha, message);

    // 7. 成功
    showStatus(
      '✅ 发布成功！\n' +
      '主站约 60-90 秒后部署完成，刷新 https://tianruian.com 可见。\n' +
      '可以继续写下一条。',
      'success'
    );

    // 清空表单
    textZh.value = '';
    textEn.value = '';
    featuredCheck.checked = false;
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.blobUrl));
    selectedFiles = [];
    renderPreview();
  } catch (e) {
    console.error(e);
    const msg = String(e.message || e);
    if (msg.includes('401') || msg.includes('Bad credentials')) {
      showStatus(
        '❌ Token 无效或已过期。点 logout 重新输入。\n\n' + msg,
        'error'
      );
    } else if (msg.includes('404')) {
      showStatus(
        '❌ Repo 或文件路径找不到。确认 Token 有 ai-personal-site 的 Contents 权限。\n\n' + msg,
        'error'
      );
    } else {
      showStatus('❌ 发布失败：\n\n' + msg, 'error');
    }
  } finally {
    publishBtn.disabled = false;
    cancelBtn.disabled = false;
  }
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
    textZh.value = '';
    textEn.value = '';
    featuredCheck.checked = false;
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.blobUrl));
    selectedFiles = [];
    renderPreview();
    statusEl.classList.add('hidden');
  });

  logoutBtn.addEventListener('click', () => {
    if (!confirm('清除 Token？下次发布需要重新输入。')) return;
    localStorage.removeItem(TOKEN_KEY);
    showUI();
  });

  // 图片拖拽
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    addFiles(e.target.files);
    fileInput.value = '';
  });
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });

  // 粘贴图片（截图直接粘贴）
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
}

function showUI() {
  if (getToken()) {
    authSection.classList.add('hidden');
    postSection.classList.remove('hidden');
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
