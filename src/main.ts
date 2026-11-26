import mermaid from "mermaid";
import { createEditor } from "./editor";
import { templates } from "./templates";
import { exportSvg, exportPng, type ExportOptions } from "./export";
import "./style.css";
import { createPreviewUrl } from "./preview";

const icons: Record<string, string> = {
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  download:
    '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  upload:
    '<path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8m-8 4h5"/>',
  book: '<path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
};
const icon = (name: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? ""}</svg>`;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <header class="site-header">
    <a class="brand" href="./" aria-label="Mermaid mmd 首页"><img src="/favicon.svg" alt="" width="34" height="34"><span>Mermaid <b>mmd</b></span></a>
    <span class="brand-description">mmd.tanxianzhong.com</span>
    <a class="docs-link" href="https://mermaid.js.org/intro/" target="_blank" rel="noopener noreferrer">${icon("book")}<span>语法指南</span></a>
  </header>
  <main>
    <section class="workspace" aria-label="图表编辑工作区">
      <section class="editor-panel" aria-label="代码">
        <div class="panel-toolbar"><h2>${icon("code")}代码</h2><div class="toolbar-actions"><label class="sr-only" for="template">插入示例</label><select id="template"><option value="">插入示例</option>${Object.entries(
          templates,
        )
          .map(
            ([key, value]) => `<option value="${key}">${value.name}</option>`,
          )
          .join(
            "",
          )}</select><span class="toolbar-divider"></span><button id="import" class="icon-button" title="导入 .mmd / .txt 文件" aria-label="导入文件">${icon("upload")}</button><button id="copy" class="icon-button" title="复制代码" aria-label="复制代码">${icon("copy")}</button></div></div>
        <div id="editor"></div>
        <div class="editor-footer"><span id="line-count">Mermaid</span><button id="save-source" class="text-button" title="下载 Mermaid 源文件">保存源码 ${icon("download")}</button></div>
      </section>
      <section class="preview-panel" aria-label="图表预览">
        <div class="panel-toolbar"><h2>${icon("image")}预览 <span class="live-label">实时</span></h2><div class="preview-tools"><div class="export-settings"><label class="checkbox-label"><input id="transparent" type="checkbox">透明背景</label><label class="scale-control">PNG 清晰度<select id="scale"><option value="1">1× 标准</option><option value="2" selected>2× 高清</option><option value="3">3× 超清</option></select></label></div><div class="export-actions"><button id="export-svg" class="button secondary" disabled>${icon("download")}导出 SVG</button><button id="export-png" class="button primary" disabled>${icon("download")}导出 PNG</button></div><label class="theme-control">主题<select id="theme" aria-label="图表主题"><option value="base">简约</option><option value="neutral">黑白</option><option value="forest">森林</option><option value="dark">深色</option></select></label></div></div>
        <div class="preview-body"><div id="viewport" aria-label="图表画布"><div id="diagram-frame"><div id="diagram"></div></div></div><div id="empty-state" class="empty-state" hidden>${icon("code")}<p>从第一行代码开始</p><span>在左侧输入 Mermaid，或插入一个示例。</span></div><div class="zoom-controls" aria-label="预览缩放"><button id="zoom-out" class="icon-button" title="缩小" aria-label="缩小">${icon("minus")}</button><output id="zoom-label">100%</output><button id="zoom-in" class="icon-button" title="放大" aria-label="放大">${icon("plus")}</button><span></span><button id="fit" class="icon-button" title="适应画布" aria-label="适应画布">${icon("fit")}</button><button id="open-preview" class="icon-button" title="新页签预览" aria-label="新页签预览" disabled>${icon("external")}</button></div></div>
        <div class="preview-footer"><span id="render-status" role="status">正在准备画布…</span><span id="dimensions"></span></div>
      </section>
    </section>
    <div id="error-box" role="alert" hidden><div><strong>暂时无法生成图表</strong><span>请检查代码。当前预览可能是上一次的结果。</span></div><pre id="error-message"></pre></div>
  </main>
  <input id="filename" type="hidden" value="我的第一张图"><span id="save-status" hidden></span>
  <input id="file-input" type="file" accept=".mmd,.mermaid,.txt,text/plain" hidden>
  <div id="render-container" aria-hidden="true"></div>
  <div id="toast" role="status" hidden></div>
  <dialog id="replace-dialog"><h2>替换当前代码？</h2><p>插入示例会替换当前内容。你可以在编辑器里撤销这次操作。</p><div><button id="cancel-replace" class="button secondary">取消</button><button id="confirm-replace" class="button primary">插入示例</button></div></dialog>
`;

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const filename = $<HTMLInputElement>("filename");
const theme = $<HTMLSelectElement>("theme");
const transparent = $<HTMLInputElement>("transparent");
const scale = $<HTMLSelectElement>("scale");
const svgButton = $<HTMLButtonElement>("export-svg");
const pngButton = $<HTMLButtonElement>("export-png");
const diagram = $("diagram");
const frame = $("diagram-frame");
const viewport = $("viewport");
const storageKey = "mermaid-lite.document.v1";
let initialCode = templates.flowchart.code;
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
  if (saved && typeof saved.code === "string") {
    initialCode = saved.code;
    if (typeof saved.filename === "string")
      filename.value = saved.filename.slice(0, 80);
    if (["base", "neutral", "forest", "dark"].includes(saved.theme))
      theme.value = saved.theme;
    transparent.checked = saved.transparent === true;
    if (["1", "2", "3"].includes(saved.scale)) scale.value = saved.scale;
  }
} catch {
  storageAvailable = false;
}

let revision = 0;
let renderedRevision = -1;
let renderTimer: ReturnType<typeof setTimeout>;
let saveTimer: ReturnType<typeof setTimeout>;
let rendering = false;
let exporting = false;
let renderId = 0;
let zoom = 1;
let naturalWidth = 600;
let naturalHeight = 400;
let autoFit = true;
let currentSvg: SVGSVGElement | null = null;
let dirty = false;

function toast(message: string) {
  const element = $("toast");
  element.textContent = message;
  element.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    element.hidden = true;
  }, 3800);
}
let toastTimer = 0;
function persist() {
  if (!dirty) return;
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        code: editor.state.doc.toString(),
        filename: filename.value,
        theme: theme.value,
        transparent: transparent.checked,
        scale: scale.value,
      }),
    );
    storageAvailable = true;
    dirty = false;
    $("save-status").innerHTML = `${icon("check")}已保存到此浏览器`;
  } catch {
    storageAvailable = false;
    $("save-status").innerHTML = `${icon("lock")}无法自动保存，请下载源码`;
  }
}
function scheduleSave() {
  dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 500);
}
const editor = createEditor($("editor"), initialCode, () => {
  scheduleSave();
  queueRender();
  updateCount();
});
function updateCount() {
  $("line-count").textContent = `Mermaid · ${editor.state.doc.lines} 行`;
}
updateCount();
if (!storageAvailable)
  $("save-status").textContent = "无法读取本地草稿，请下载源码备份";

function updateExportButtons() {
  $<HTMLButtonElement>("open-preview").disabled = !currentSvg || renderedRevision !== revision;
  svgButton.disabled = pngButton.disabled =
    exporting || !currentSvg || renderedRevision !== revision;
}
function queueRender() {
  revision++;
  updateExportButtons();
  $("render-status").textContent = "正在更新…";
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => void render(), 350);
}
async function render() {
  if (rendering) return;
  const job = revision;
  const code = editor.state.doc.toString();
  $("error-box").hidden = true;
  if (!code.trim()) {
    currentSvg = null;
    diagram.replaceChildren();
    frame.style.width = frame.style.height = "0px";
    $("empty-state").hidden = false;
    $("render-status").textContent = "等待输入";
    $("dimensions").textContent = "";
    updateExportButtons();
    return;
  }
  rendering = true;
  try {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: theme.value as "base" | "neutral" | "forest" | "dark",
      layout: "dagre",
      look: "classic",
      htmlLabels: false,
      fontFamily: 'Arial, "Microsoft YaHei", "PingFang SC", sans-serif',
      flowchart: { htmlLabels: false, useMaxWidth: false, curve: "basis" },
      themeVariables:
        theme.value === "base"
          ? {
              primaryColor: "#f4f2ff",
              primaryTextColor: "#35354b",
              primaryBorderColor: "#a39bcf",
              lineColor: "#9a96b2",
              secondaryColor: "#f5f7fc",
              tertiaryColor: "#f1f5f9",
              fontSize: "15px",
            }
          : {},
      // Keep diagram directives from enabling HTML labels or weakening sanitization.
      secure: [
        "secure",
        "securityLevel",
        "startOnLoad",
        "maxTextSize",
        "maxEdges",
        "suppressErrorRendering",
        "htmlLabels",
        "flowchart",
      ],
      maxTextSize: 100_000,
    });
    const result = await mermaid.render(
      `diagram-${++renderId}`,
      code,
      $("render-container"),
    );
    if (job !== revision) return;
    diagram.innerHTML = result.svg;
    currentSvg = diagram.querySelector("svg");
    if (!currentSvg) throw new Error("没有生成有效的 SVG，请检查图表内容。");
    const box = currentSvg.viewBox.baseVal;
    const rect = currentSvg.getBoundingClientRect();
    naturalWidth = box.width || rect.width || 600;
    naturalHeight = box.height || rect.height || 400;
    currentSvg.style.maxWidth = "none";
    currentSvg.style.width = `${naturalWidth}px`;
    currentSvg.style.height = `${naturalHeight}px`;
    renderedRevision = job;
    $("empty-state").hidden = true;
    document
      .querySelector(".preview-body")!
      .classList.toggle("dark-diagram", theme.value === "dark");
    $("render-status").innerHTML = `${icon("check")}预览已更新`;
    $("dimensions").textContent =
      `${Math.round(naturalWidth)} × ${Math.round(naturalHeight)}`;
    if (autoFit) fit();
    else applyZoom();
  } catch (error) {
    if (job !== revision) return;
    renderedRevision = -1;
    $("error-box").hidden = false;
    $("error-message").textContent =
      error instanceof Error ? error.message : String(error);
    $("render-status").textContent = "代码需要调整";
    $("empty-state").hidden = !!currentSvg;
  } finally {
    $("render-container").replaceChildren();
    rendering = false;
    updateExportButtons();
    if (job !== revision) {
      clearTimeout(renderTimer);
      renderTimer = setTimeout(() => void render(), 0);
    }
  }
}
function applyZoom() {
  diagram.style.transform = `scale(${zoom})`;
  frame.style.width = `${naturalWidth * zoom}px`;
  frame.style.height = `${naturalHeight * zoom}px`;
  $("zoom-label").textContent = `${Math.round(zoom * 100)}%`;
}
function fit() {
  autoFit = true;
  zoom = Math.min(
    1,
    Math.max(0.01, (viewport.clientWidth - 80) / naturalWidth),
    Math.max(0.01, (viewport.clientHeight - 100) / naturalHeight),
  );
  applyZoom();
}
$("zoom-in").onclick = () => {
  autoFit = false;
  zoom = Math.min(4, zoom * 1.2);
  applyZoom();
};
$("zoom-out").onclick = () => {
  autoFit = false;
  zoom = Math.max(0.05, zoom / 1.2);
  applyZoom();
};
$("fit").onclick = fit;
$("open-preview").onclick = () => {
  if (!currentSvg || renderedRevision !== revision) return;
  try {
    const url = createPreviewUrl(currentSvg, theme.value === "dark");
    const link = document.createElement("a");
    link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) { toast(error instanceof Error ? error.message : "无法打开预览"); }
};
let fitFrame = 0;
new ResizeObserver(() => {
  cancelAnimationFrame(fitFrame);
  fitFrame = requestAnimationFrame(() => {
    if (autoFit && currentSvg) fit();
  });
}).observe(viewport);

async function download(format: "svg" | "png") {
  if (!currentSvg || renderedRevision !== revision || exporting) return;
  exporting = true;
  updateExportButtons();
  const options: ExportOptions = {
    filename: filename.value || "未命名图表",
    background: transparent.checked
      ? "transparent"
      : theme.value === "dark"
        ? "dark"
        : "white",
    scale: Number(scale.value) as 1 | 2 | 3,
  };
  try {
    await (format === "svg" ? exportSvg : exportPng)(currentSvg, options);
    toast(`${format.toUpperCase()} 已生成，下载已开始`);
  } catch (error) {
    toast(error instanceof Error ? error.message : "导出失败，请重试");
  } finally {
    exporting = false;
    updateExportButtons();
  }
}
svgButton.onclick = () => void download("svg");
pngButton.onclick = () => void download("png");
theme.onchange = () => {
  scheduleSave();
  queueRender();
};
filename.oninput = scheduleSave;
transparent.onchange = scheduleSave;
scale.onchange = scheduleSave;

function replaceCode(code: string) {
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: code },
  });
  autoFit = true;
}
const templateSelect = $<HTMLSelectElement>("template");
const replaceDialog = $<HTMLDialogElement>("replace-dialog");
let pendingTemplate: keyof typeof templates | null = null;
templateSelect.onchange = () => {
  if (!(templateSelect.value in templates)) return;
  pendingTemplate = templateSelect.value as keyof typeof templates;
  templateSelect.value = "";
  if (!editor.state.doc.toString().trim()) insertTemplate();
  else replaceDialog.showModal();
};
function insertTemplate() {
  if (pendingTemplate) replaceCode(templates[pendingTemplate].code);
  pendingTemplate = null;
  replaceDialog.close();
}
$("confirm-replace").onclick = insertTemplate;
$("cancel-replace").onclick = () => {
  pendingTemplate = null;
  replaceDialog.close();
};
$("copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText(editor.state.doc.toString());
    toast("代码已复制");
  } catch {
    toast("无法访问剪贴板，请在编辑器中全选并复制");
  }
};
$("save-source").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([editor.state.doc.toString()], {
      type: "text/plain;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(filename.value || "未命名图表").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")}.mmd`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
const fileInput = $<HTMLInputElement>("file-input");
$("import").onclick = () => fileInput.click();
fileInput.onchange = async () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (!file) return;
  if (file.size > 300_000) {
    toast("文件过大，请导入小于 300 KB 的 Mermaid 文本文件");
    return;
  }
  try {
    const code = await file.text();
    if (code.length > 100_000) throw new Error("代码长度不能超过 100,000 字符");
    replaceCode(code.replace(/^\uFEFF/, ""));
    filename.value = file.name
      .replace(/\.(mmd|mermaid|txt)$/i, "")
      .slice(0, 80);
    scheduleSave();
    toast("文件已导入，可撤销恢复之前的代码");
  } catch (error) {
    toast(error instanceof Error ? error.message : "读取文件失败");
  }
};
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    $("save-source").click();
  }
});
window.addEventListener("pagehide", persist);
void render();
