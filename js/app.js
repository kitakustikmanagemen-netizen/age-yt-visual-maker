// ============================================================
// AGE YT# Visual Maker — app.js
// ============================================================

const state = {
  activeFeature: FEATURES[0].id,
  isGenerating: false,
  retryCount: 0,
};

// ------------------------------------------------------------
// Helpers: API key & worker URL storage (konsisten Tools #1/#2)
// ------------------------------------------------------------
function getKeys() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS) || "[]");
  } catch {
    return [];
  }
}
function saveKeys(keys) {
  localStorage.setItem(LS_KEYS, JSON.stringify(keys));
}
function getWorkerUrl() {
  return localStorage.getItem(LS_WORKER) || DEFAULT_WORKER_URL;
}
function setWorkerUrl(url) {
  if (url && url.trim()) localStorage.setItem(LS_WORKER, url.trim());
  else localStorage.removeItem(LS_WORKER);
}

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderNav();
  renderKeyList();
  bindModalEvents();
  selectFeature(state.activeFeature);

  if (!getKeys().length) openModal();
});

// ------------------------------------------------------------
// Nav kiri (channel strip ala mixer)
// ------------------------------------------------------------
function renderNav() {
  const nav = document.getElementById("feature-nav");
  nav.innerHTML = "";
  FEATURES.forEach((f) => {
    const btn = document.createElement("button");
    btn.className = "nav-item";
    btn.dataset.id = f.id;
    btn.style.setProperty("--accent", f.accent);
    btn.innerHTML = `<span class="nav-led"></span><span class="nav-icon">${f.icon}</span><span class="nav-label">${f.label}</span>`;
    btn.addEventListener("click", () => selectFeature(f.id));
    nav.appendChild(btn);
  });
}

function selectFeature(id) {
  state.activeFeature = id;
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === id);
  });
  renderForm();
  renderResultPanel(null);
}

// ------------------------------------------------------------
// Form dinamis per fitur
// ------------------------------------------------------------
function renderForm() {
  const f = getFeatureById(state.activeFeature);
  const wrap = document.getElementById("form-panel");
  document.documentElement.style.setProperty("--current-accent", f.accent);

  let extraHtml = "";
  if (f.extraField) {
    if (f.extraField.type === "select") {
      const opts = f.extraField.options
        .map(
          (o) =>
            `<option value="${o}" ${o === f.extraField.defaultValue ? "selected" : ""}>${o}</option>`
        )
        .join("");
      extraHtml = `
        <label class="field-label">${f.extraField.label}</label>
        <select id="field-extra">${opts}</select>`;
    } else if (f.extraField.type === "text") {
      extraHtml = `
        <label class="field-label">${f.extraField.label}</label>
        <input type="text" id="field-extra" placeholder="${f.extraField.placeholder || ""}" />`;
    }
  }

  const aspectHtml = f.showAspectRatio
    ? `
      <label class="field-label">Rasio gambar</label>
      <select id="field-aspect">
        ${ASPECT_RATIOS.map(
          (a) =>
            `<option value="${a.id}" ${a.id === f.defaultAspect ? "selected" : ""}>${a.label}</option>`
        ).join("")}
      </select>`
    : "";

  wrap.innerHTML = `
    <div class="form-header" style="--accent:${f.accent}">
      <span class="form-icon">${f.icon}</span>
      <h2>${f.label}</h2>
    </div>

    <label class="field-label">${f.topicLabel}</label>
    <textarea id="field-topic" rows="3" placeholder="${f.topicPlaceholder}"></textarea>

    <label class="field-label">Platform</label>
    <select id="field-platform">
      ${PLATFORMS.map((p) => `<option value="${p}">${p}</option>`).join("")}
    </select>

    ${aspectHtml}
    ${extraHtml}

    <label class="field-label">Detail tambahan (opsional)</label>
    <textarea id="field-detail" rows="2" placeholder="Tone, warna, referensi gaya, dll."></textarea>

    <button id="generate-btn" class="btn-generate" style="--accent:${f.accent}">
      ⚡ Generate
    </button>
  `;

  document.getElementById("generate-btn").addEventListener("click", handleGenerate);
}

function readForm() {
  const f = getFeatureById(state.activeFeature);
  const form = {
    topic: document.getElementById("field-topic").value.trim(),
    platform: document.getElementById("field-platform").value,
    detail: document.getElementById("field-detail")?.value.trim() || "",
  };
  if (f.showAspectRatio) form.aspect = document.getElementById("field-aspect").value;
  if (f.extraField) {
    const val = document.getElementById("field-extra").value;
    form[f.extraField.id] = val;
    if (f.extraField.id === "styleType") form.styleType = val;
    if (f.extraField.id === "titleText") form.titleText = val;
  }
  return form;
}

// ------------------------------------------------------------
// Generate — router text vs image
// ------------------------------------------------------------
async function handleGenerate() {
  if (state.isGenerating) return;

  const keys = getKeys();
  if (!keys.length) {
    openModal();
    return;
  }

  const f = getFeatureById(state.activeFeature);
  const form = readForm();

  if (!form.topic) {
    renderResultPanel({ error: "Isi dulu bagian utamanya sebelum generate." });
    return;
  }

  state.isGenerating = true;
  state.retryCount = 0;
  setGeneratingUI(true);

  try {
    if (f.type === "image") {
      await generateImages(f, form, keys);
    } else {
      await generateText(f, form, keys);
    }
  } finally {
    state.isGenerating = false;
    setGeneratingUI(false);
  }
}

function setGeneratingUI(loading) {
  const btn = document.getElementById("generate-btn");
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? "⏳ Sedang generate..." : "⚡ Generate";
}

// ------------------------------------------------------------
// Panggil Worker (dengan rotasi API key kalau kena limit)
// ------------------------------------------------------------
async function callWorker(payload, keys) {
  const maxAttempts = keys.length;
  let lastError = "Semua API key gagal dipakai.";

  for (let i = 0; i < maxAttempts; i++) {
    const key = keys[i];
    try {
      const res = await fetch(getWorkerUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, apiKey: key }),
      });
      const data = await res.json();

      if (res.status === 401 || res.status === 403 || res.status === 429) {
        lastError = data.error || "API key kena limit/ditolak, coba key berikutnya...";
        continue;
      }
      if (!res.ok) {
        lastError = data.error || "Terjadi error dari server.";
        continue;
      }
      return data;
    } catch (err) {
      lastError = "Gagal menghubungi Worker: " + err.message;
    }
  }
  throw new Error(lastError);
}

// ------------------------------------------------------------
// Mode teks — dengan auto-retry kalau MAX_TOKENS (pola dari Tools #2)
// ------------------------------------------------------------
async function generateText(f, form, keys) {
  const prompt = f.buildPrompt(f, form);
  let maxTokens = f.maxTokens || 2048;
  let attempt = 0;
  let result;

  while (attempt < 3) {
    try {
      result = await callWorker(
        { mode: "text", prompt, model: DEFAULT_TEXT_MODEL, maxTokens, temperature: 0.8 },
        keys
      );
    } catch (err) {
      renderResultPanel({ error: err.message });
      return;
    }

    if (result.finishReason === "MAX_TOKENS") {
      maxTokens = Math.min(16384, Math.round(maxTokens * 1.6));
      attempt++;
      continue;
    }
    break;
  }

  renderResultPanel({ type: "text", content: result.text });
}

// ------------------------------------------------------------
// Mode gambar — 1 gambar (thumbnail/meme) atau banyak gambar (carousel)
// ------------------------------------------------------------
async function generateImages(f, form, keys) {
  const images = [];

  if (f.id === "carousel") {
    const slideCount = parseInt(form.slideCount || "5", 10);
    renderResultPanel({ type: "progress", message: `Menyiapkan outline ${slideCount} slide...` });

    const outline = await buildCarouselOutline(form, slideCount, keys);

    for (let i = 0; i < slideCount; i++) {
      renderResultPanel({
        type: "progress",
        message: `Generate slide ${i + 1} dari ${slideCount}...`,
        partialImages: images,
      });
      const prompt = f.buildPrompt(f, form, i + 1, slideCount, outline[i] || form.topic);
      try {
        const result = await callWorker({ mode: "image", prompt, model: DEFAULT_IMAGE_MODEL }, keys);
        images.push(...result.images);
      } catch (err) {
        renderResultPanel({ error: `Gagal di slide ${i + 1}: ${err.message}`, partialImages: images });
        return;
      }
    }
  } else {
    renderResultPanel({ type: "progress", message: "Generate gambar..." });
    const prompt = f.buildPrompt(f, form);
    try {
      const result = await callWorker({ mode: "image", prompt, model: DEFAULT_IMAGE_MODEL }, keys);
      images.push(...result.images);
    } catch (err) {
      renderResultPanel({ error: err.message });
      return;
    }
  }

  renderResultPanel({ type: "image", images, form });
}

// Minta outline singkat tiap slide dari model teks supaya carousel tidak
// mengulang isi yang sama persis di tiap gambar.
async function buildCarouselOutline(form, slideCount, keys) {
  const prompt =
    `Buatkan outline isi untuk ${slideCount} slide carousel media sosial tentang: "${form.topic}". ` +
    `Balas HANYA dalam format list bernomor 1 sampai ${slideCount}, tiap baris 1 kalimat pendek (maks 15 kata) ` +
    `berisi poin/isi khusus slide tersebut, tanpa kalimat pembuka atau penutup.`;
  try {
    const result = await callWorker(
      { mode: "text", prompt, model: DEFAULT_TEXT_MODEL, maxTokens: 1024, temperature: 0.7 },
      keys
    );
    const lines = result.text
      .split("\n")
      .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
      .filter(Boolean);
    return lines.length >= slideCount ? lines : Array(slideCount).fill(form.topic);
  } catch {
    return Array(slideCount).fill(form.topic);
  }
}

// ------------------------------------------------------------
// Render panel hasil
// ------------------------------------------------------------
function renderResultPanel(result) {
  const panel = document.getElementById("result-panel");

  if (!result) {
    panel.innerHTML = `<div class="result-empty">Hasil generate akan muncul di sini.</div>`;
    return;
  }

  if (result.error) {
    const imgs = result.partialImages && result.partialImages.length ? renderGallery(result.partialImages) : "";
    panel.innerHTML = `<div class="result-error">⚠️ ${escapeHtml(result.error)}</div>${imgs}`;
    return;
  }

  if (result.type === "progress") {
    const imgs = result.partialImages && result.partialImages.length ? renderGallery(result.partialImages) : "";
    panel.innerHTML = `<div class="result-progress">⏳ ${escapeHtml(result.message)}</div>${imgs}`;
    return;
  }

  if (result.type === "text") {
    panel.innerHTML = `
      <div class="result-text">${escapeHtml(result.content).replace(/\n/g, "<br>")}</div>
      <div class="result-actions">
        <button id="copy-text-btn" class="btn-secondary">📋 Salin Teks</button>
        <button id="send-tools-btn" class="btn-secondary">➡️ Kirim ke Tools Lain</button>
      </div>
    `;
    document.getElementById("copy-text-btn").addEventListener("click", () => {
      navigator.clipboard.writeText(result.content);
      flashButton("copy-text-btn", "✅ Tersalin!");
    });
    document.getElementById("send-tools-btn").addEventListener("click", () => {
      sendToOtherTools({ content: result.content });
    });
    return;
  }

  if (result.type === "image") {
    panel.innerHTML = `
      ${renderGallery(result.images)}
      <div class="result-actions">
        <button id="send-tools-btn" class="btn-secondary">➡️ Kirim ke Tools Lain</button>
      </div>
    `;
    document.getElementById("send-tools-btn").addEventListener("click", () => {
      sendToOtherTools({ content: `${result.images.length} gambar berhasil di-generate (${state.activeFeature}).` });
    });
    bindDownloadButtons();
    return;
  }
}

function renderGallery(images) {
  const items = images
    .map(
      (img, i) => `
      <div class="gallery-item">
        <img src="data:${img.mimeType};base64,${img.data}" alt="Hasil ${i + 1}" />
        <button class="btn-download" data-index="${i}">⬇️ Download</button>
      </div>`
    )
    .join("");
  window.__lastImages = images;
  return `<div class="gallery-grid">${items}</div>`;
}

function bindDownloadButtons() {
  document.querySelectorAll(".btn-download").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.index, 10);
      const img = window.__lastImages[idx];
      const ext = img.mimeType.includes("png") ? "png" : "jpg";
      const a = document.createElement("a");
      a.href = `data:${img.mimeType};base64,${img.data}`;
      a.download = `age-yt-visual-${state.activeFeature}-${idx + 1}.${ext}`;
      a.click();
    });
  });
}

function flashButton(id, text) {
  const btn = document.getElementById(id);
  const original = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = original), 1500);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ------------------------------------------------------------
// Kirim ke Tools Lain — clipboard JSON terstruktur
// ------------------------------------------------------------
function sendToOtherTools(extra) {
  const payload = {
    source: "AGE YT# Visual Maker",
    feature: state.activeFeature,
    featureLabel: getFeatureById(state.activeFeature).label,
    generatedAt: new Date().toISOString(),
    ...extra,
  };
  navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  flashButton("send-tools-btn", "✅ Tersalin ke Clipboard!");
}

// ------------------------------------------------------------
// Modal Pengaturan API Key
// ------------------------------------------------------------
function openModal() {
  document.getElementById("settings-modal").classList.add("open");
}
function closeModal() {
  document.getElementById("settings-modal").classList.remove("open");
}

function renderKeyList() {
  const list = document.getElementById("key-list");
  const keys = getKeys();
  list.innerHTML = "";
  keys.forEach((k, i) => {
    const row = document.createElement("div");
    row.className = "key-row";
    row.innerHTML = `<span>Key #${i + 1} — ${maskKey(k)}</span><button data-i="${i}" class="btn-remove-key">✕</button>`;
    list.appendChild(row);
  });
  list.querySelectorAll(".btn-remove-key").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.i, 10);
      const keys = getKeys();
      keys.splice(i, 1);
      saveKeys(keys);
      renderKeyList();
    });
  });
}

function maskKey(k) {
  if (k.length <= 8) return "••••••";
  return k.slice(0, 4) + "••••••" + k.slice(-4);
}

function bindModalEvents() {
  document.getElementById("open-settings-btn").addEventListener("click", openModal);
  document.getElementById("close-modal-btn").addEventListener("click", closeModal);

  document.getElementById("add-key-btn").addEventListener("click", () => {
    const input = document.getElementById("new-key-input");
    const val = input.value.trim();
    if (!val) return;
    const keys = getKeys();
    keys.push(val);
    saveKeys(keys);
    input.value = "";
    renderKeyList();
  });

  const workerInput = document.getElementById("worker-url-input");
  workerInput.value = localStorage.getItem(LS_WORKER) || "";
  document.getElementById("save-worker-btn").addEventListener("click", () => {
    setWorkerUrl(workerInput.value);
    flashButton("save-worker-btn", "✅ Tersimpan!");
  });
}
