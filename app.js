/**
 * Клиент к Gradio share-ссылке.
 * Меняйте GRADIO_URL при появлении новой ссылки.
 */
const GRADIO_URL = "https://cc69d162143324ac08.gradio.live";

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const placeholder = document.getElementById("placeholder");
const preview = document.getElementById("preview");
const clearBtn = document.getElementById("clearBtn");
const predictBtn = document.getElementById("predictBtn");
const resultEl = document.getElementById("result");
const resultLabel = document.getElementById("resultLabel");
const confidencesEl = document.getElementById("confidences");
const errorEl = document.getElementById("error");

let currentFile = null;

// ——— UI helpers ———
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}

function hideError() {
  errorEl.classList.add("hidden");
}

function setLoading(on) {
  predictBtn.disabled = on || !currentFile;
  clearBtn.disabled = on;
  const text = predictBtn.querySelector(".btn-text");
  const loader = predictBtn.querySelector(".btn-loader");
  text.classList.toggle("hidden", on);
  loader.classList.toggle("hidden", !on);
}

function showPreview(file) {
  currentFile = file;
  const url = URL.createObjectURL(file);
  preview.src = url;
  preview.classList.remove("hidden");
  placeholder.classList.add("hidden");
  predictBtn.disabled = false;
  clearBtn.disabled = false;
  resultEl.classList.add("hidden");
  hideError();
}

function clearAll() {
  currentFile = null;
  preview.src = "";
  preview.classList.add("hidden");
  placeholder.classList.remove("hidden");
  predictBtn.disabled = true;
  clearBtn.disabled = true;
  resultEl.classList.add("hidden");
  hideError();
  fileInput.value = "";
}

function renderResult(data) {
  // data = { label, confidences: [{label, confidence}, ...] }  или строка
  let label = "—";
  let confs = [];

  if (typeof data === "string") {
    label = data;
  } else if (data && typeof data === "object") {
    label = data.label ?? data.confidences?.[0]?.label ?? "—";
    confs = Array.isArray(data.confidences) ? data.confidences : [];
  }

  resultLabel.textContent = label;
  confidencesEl.innerHTML = "";

  confs
    .slice()
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .forEach((c) => {
      const pct = Math.round((c.confidence ?? 0) * 100);
      const row = document.createElement("div");
      row.className = "conf-row";
      row.innerHTML = `
        <span class="conf-name">${escapeHtml(String(c.label ?? ""))}</span>
        <div class="conf-bar-bg"><div class="conf-bar" style="width:${pct}%"></div></div>
        <span class="conf-pct">${pct}%</span>
      `;
      confidencesEl.appendChild(row);
    });

  resultEl.classList.remove("hidden");
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ——— Gradio API ———
async function uploadFile(file) {
  const form = new FormData();
  form.append("files", file, file.name || "image.jpg");

  const res = await fetch(`${GRADIO_URL}/gradio_api/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Ошибка загрузки файла: ${res.status}`);
  }

  const paths = await res.json();
  // Обычно [" /tmp/gradio/... "]
  if (!Array.isArray(paths) || !paths[0]) {
    throw new Error("Не удалось загрузить изображение на сервер модели");
  }
  return paths[0];
}

async function callPredict(filePath) {
  // Запускаем predict
  const start = await fetch(`${GRADIO_URL}/gradio_api/call/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        {
          path: filePath,
          meta: { _type: "gradio.FileData" },
        },
      ],
    }),
  });

  if (!start.ok) {
    throw new Error(`Ошибка API: ${start.status}`);
  }

  const { event_id } = await start.json();
  if (!event_id) {
    throw new Error("Сервер не вернул event_id");
  }

  // Читаем SSE-поток результата
  const streamUrl = `${GRADIO_URL}/gradio_api/call/predict/${event_id}`;
  const streamRes = await fetch(streamUrl);

  if (!streamRes.ok) {
    throw new Error(`Ошибка получения результата: ${streamRes.status}`);
  }

  const text = await streamRes.text();
  // Ищем event: complete / data: ...
  const lines = text.split("\n");
  let lastData = null;
  let hadError = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("event:")) {
      const ev = line.slice(6).trim();
      if (ev === "error") hadError = true;
    }
    if (line.startsWith("data:")) {
      const raw = line.slice(5).trim();
      try {
        lastData = JSON.parse(raw);
      } catch {
        lastData = raw;
      }
    }
  }

  if (hadError) {
    const msg =
      (lastData && lastData.error) ||
      "Ошибка на стороне модели (возможно, Colab-сессия нестабильна). Попробуйте ещё раз или обновите share-ссылку.";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  // complete: data обычно массив [result]
  if (Array.isArray(lastData) && lastData.length > 0) {
    return lastData[0];
  }
  return lastData;
}

async function predict() {
  if (!currentFile) return;

  hideError();
  setLoading(true);

  try {
    const path = await uploadFile(currentFile);
    const result = await callPredict(path);
    renderResult(result);
  } catch (err) {
    console.error(err);
    showError(err.message || "Неизвестная ошибка");
  } finally {
    setLoading(false);
  }
}

// ——— Events ———
dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files?.[0];
  if (file && file.type.startsWith("image/")) {
    showPreview(file);
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) showPreview(file);
});

clearBtn.addEventListener("click", clearAll);
predictBtn.addEventListener("click", predict);
