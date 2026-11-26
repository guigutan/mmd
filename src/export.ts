export type ExportOptions = {
  filename?: string;
  background?: "white" | "transparent" | "dark";
  scale?: 1 | 2 | 3;
};

export type SerializedSvg = {
  source: string;
  width: number;
  height: number;
};

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const MAX_SIDE = 8192;
const MAX_PIXELS = 32_000_000;

// Freeze visual properties so downloaded SVGs do not depend on the editor's CSS.
const VISUAL_PROPERTIES = [
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "text-anchor",
  "dominant-baseline",
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "paint-order",
  "color",
];

function dimensions(svg: SVGSVGElement) {
  const box = svg.viewBox.baseVal;
  if (box && box.width > 0 && box.height > 0) {
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }

  const width = svg.width.baseVal.value;
  const height = svg.height.baseVal.value;
  if (width > 0 && height > 0) return { x: 0, y: 0, width, height };

  throw new Error("无法读取图表尺寸，请等待预览完成后重试。");
}

/** Create a standalone SVG, keeping text and shapes as vectors. */
export function serializeSvg(
  svg: SVGSVGElement,
  background: ExportOptions["background"] = "white",
): SerializedSvg {
  if (svg.querySelector("foreignObject")) {
    throw new Error(
      "当前图表含有 HTML 或数学公式标签，无法导出兼容图片。请使用普通文本标签，并将 htmlLabels 设为 false 后重试。",
    );
  }

  const { x, y, width, height } = dimensions(svg);
  if (![x, y, width, height].every(Number.isFinite)) {
    throw new Error("图表尺寸无效，请检查图表内容。");
  }

  const copy = svg.cloneNode(true) as SVGSVGElement;
  const originals = [svg, ...svg.querySelectorAll<SVGElement>("*")];
  const clones = [copy, ...copy.querySelectorAll<SVGElement>("*")];

  if (svg.isConnected) {
    originals.forEach((element, index) => {
      const clone = clones[index];
      if (!clone?.style || element.namespaceURI !== SVG_NS) return;
      const computed = getComputedStyle(element);
      for (const property of VISUAL_PROPERTIES) {
        let value = computed.getPropertyValue(property);
        // Browsers can resolve local paint references to absolute document URLs.
        value = value.replace(
          /url\(["']?[^)"']*#([^"')]+)["']?\)/g,
          "url(#$1)",
        );
        if (value) clone.style.setProperty(property, value);
      }
    });
  }

  for (const element of copy.querySelectorAll("image, feImage, use")) {
    const href =
      element.getAttribute("href") ?? element.getAttributeNS(XLINK_NS, "href");
    if (href && !href.startsWith("#") && !href.startsWith("data:image/")) {
      throw new Error(
        "图表包含外部图片，无法可靠导出。请先移除图片，或改用内嵌的 data:image 图片。",
      );
    }
  }

  copy.setAttribute("xmlns", SVG_NS);
  copy.setAttribute("width", String(width));
  copy.setAttribute("height", String(height));
  copy.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
  copy.style.removeProperty("max-width");
  copy.style.removeProperty("width");
  copy.style.removeProperty("height");
  copy.style.removeProperty("background");
  copy.style.removeProperty("background-color");
  copy.removeAttribute("tabindex");

  if (background !== "transparent") {
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", String(x));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(width));
    rect.setAttribute("height", String(height));
    rect.style.setProperty(
      "fill",
      background === "dark" ? "#20232b" : "#ffffff",
      "important",
    );
    rect.style.setProperty("stroke", "none", "important");
    copy.insertBefore(rect, copy.firstChild);
  }

  return {
    source: new XMLSerializer().serializeToString(copy),
    width,
    height,
  };
}

function filenameFor(filename: string | undefined, extension: "svg" | "png") {
  let name = (filename ?? "diagram")
    .replace(/\.(svg|png)$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[.\s]+$/g, "")
    .trim()
    .slice(0, 120);
  if (!name) name = "diagram";
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))
    name = `diagram-${name}`;
  return `${name}.${extension}`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // Keep the URL alive until the browser has picked up the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

export async function exportSvg(
  svg: SVGSVGElement,
  options: ExportOptions = {},
): Promise<void> {
  const { source } = serializeSvg(svg, options.background);
  download(
    new Blob([source], { type: "image/svg+xml;charset=utf-8" }),
    filenameFor(options.filename, "svg"),
  );
}

function loadSvgImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => {
      image.onload = image.onerror = null;
      image.src = "";
      reject(new Error("图片转换超时，请简化图表后重试。"));
    }, 15_000);
    image.onload = () => {
      window.clearTimeout(timeout);
      image.onload = image.onerror = null;
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      image.onload = image.onerror = null;
      reject(
        new Error("无法将图表转换为 PNG，请检查图表是否包含不支持的内容。"),
      );
    };
    // SVG data URLs preserve Unicode and avoid Blob-URL canvas tainting in WebKit.
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  });
}

export async function exportPng(
  svg: SVGSVGElement,
  options: ExportOptions = {},
): Promise<void> {
  const { source, width, height } = serializeSvg(svg, options.background);
  const scale = options.scale ?? 2;
  if (![1, 2, 3].includes(scale))
    throw new Error("请选择 1×、2× 或 3× 的 PNG 清晰度。");
  const pixelWidth = Math.ceil(width * scale);
  const pixelHeight = Math.ceil(height * scale);
  if (
    pixelWidth > MAX_SIDE ||
    pixelHeight > MAX_SIDE ||
    pixelWidth * pixelHeight > MAX_PIXELS
  ) {
    throw new Error(
      "PNG 尺寸过大，请降低清晰度、缩小图表，或导出 SVG。单边最多 8192 像素，总计最多 3200 万像素。",
    );
  }

  await document.fonts.ready;
  const image = await loadSvgImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法创建画布，请尝试导出 SVG。");
    if (options.background !== "transparent") {
      context.fillStyle = options.background === "dark" ? "#20232b" : "#ffffff";
      context.fillRect(0, 0, pixelWidth, pixelHeight);
    }
    context.drawImage(image, 0, 0, pixelWidth, pixelHeight);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error("PNG 生成失败，请降低清晰度后重试。")),
        "image/png",
      );
    });
    download(blob, filenameFor(options.filename, "png"));
  } catch (error) {
    if (error instanceof DOMException && error.name === "SecurityError") {
      throw new Error(
        "图表含有浏览器不允许导出的外部内容，请移除外部图片后重试。",
      );
    }
    throw error;
  } finally {
    // Release the potentially large backing buffer promptly.
    canvas.width = canvas.height = 0;
  }
}
