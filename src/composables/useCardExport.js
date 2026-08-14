import { invoke } from "@tauri-apps/api/core";
import { getFontEmbedCSS, toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import { createApp, nextTick } from "vue";
import CardArtwork from "../components/preview/CardArtwork.vue";
import { renderMermaidDiagrams } from "./useContentParser.js";
import { i18n } from "../i18n/index.js";

function t(key, params) {
  return i18n.global.t(key, params);
}

function isTauriRuntime() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export function useCardExport({
  activePageIndex,
  pages,
  sourcePath,
  selectedPlatform,
  exportMessage,
  isExporting,
  scale,
  selectedFormat,
  transparentBackground,
  backgroundColor,
  backgroundType,
  backgroundValue,
  selectedThemeClass,
  exportPath,
  showPageNumber,
  showTopLeft,
  showTopRight,
  showBottomLeft,
  showBottomRight,
  customFontFamily,
  customFontEmbedCss,
}) {
  async function exportDocument() {
    await nextTick();
    const allPages = pages?.value || [];
    if (!allPages.length) return;
    if (isExporting?.value) return;

    if (isExporting) isExporting.value = true;

    try {
      const platform = selectedPlatform?.value || { width: 1080, height: 1440, name: "小红书" };
      const currentScale = scale?.value || 2;
      // Map scale (1/2/3) to JPEG quality (0.80/0.90/0.95)
      const jpegQuality = currentScale === 1 ? 0.80 : currentScale === 3 ? 0.95 : 0.90;
      const format = selectedFormat?.value || "PNG";
      // Always export all pages
      const scope = "all";
      const themeClass = selectedThemeClass?.value || "theme-swiss-grid";
      const isTransparent = transparentBackground?.value || false;
      const bgHex = backgroundColor?.value || "#69eacb";
      const bgType = backgroundType?.value || "gradient";
      const bgVal = backgroundValue?.value || "linear-gradient(135deg, #69eacb 0%, #eaccf8 48%, #6654f1 100%)";
      let targetFolder = exportPath?.value?.trim() || "";
      const isTopLeft = showTopLeft?.value ?? true;
      const isTopRight = showTopRight?.value ?? showPageNumber?.value ?? true;
      const isBottomLeft = showBottomLeft?.value ?? true;
      const isBottomRight = showBottomRight?.value ?? true;

      const pagesToExport = scope === "single"
        ? [allPages[activePageIndex.value] || allPages[0]]
        : allPages;

      if (!targetFolder && isTauriRuntime()) {
        exportMessage.value = t("runtime.chooseExportFolder");
        try {
          const selectedFolder = await invoke("pick_export_folder");
          if (!selectedFolder) {
            exportMessage.value = t("runtime.exportCancelled");
            return;
          }
          targetFolder = selectedFolder;
          if (exportPath) exportPath.value = selectedFolder;
        } catch (err) {
          exportMessage.value = t("runtime.folderFailed", { error: err?.message || err });
          return;
        }
      }

      const outputFolderName = createOutputFolderName(sourcePath?.value);

      exportMessage.value = t("runtime.preparingExport", { count: pagesToExport.length });

      try {
        if (format === "PDF") {
          await exportAsPDF(pagesToExport, platform, jpegQuality, themeClass, isTransparent, bgHex, bgType, bgVal, targetFolder, outputFolderName, isTopLeft, isTopRight, isBottomLeft, isBottomRight);
        } else if (format === "长图(PNG)") {
          await exportAsLongImage(pagesToExport, platform, jpegQuality, themeClass, isTransparent, bgHex, bgType, bgVal, targetFolder, outputFolderName, isTopLeft, isTopRight, isBottomLeft, isBottomRight);
        } else if (format === "JPG") {
          await exportAsImages(pagesToExport, platform, jpegQuality, themeClass, false, bgHex, bgType, bgVal, "jpg", targetFolder, outputFolderName, isTopLeft, isTopRight, isBottomLeft, isBottomRight);
        } else {
          await exportAsImages(pagesToExport, platform, jpegQuality, themeClass, isTransparent, bgHex, bgType, bgVal, "png", targetFolder, outputFolderName, isTopLeft, isTopRight, isBottomLeft, isBottomRight);
        }
      } catch (err) {
        console.error("Export error:", err);
        exportMessage.value = t("runtime.exportFailed", { error: err.message || err });
      }
    } finally {
      if (isExporting) isExporting.value = false;
    }
  }

  async function saveOutputBlob(blob, filename, targetFolder, outputFolderName) {
    const base64Data = await blobToBase64(blob);
    if (!base64Data) {
      throw new Error(t("runtime.binaryFailed"));
    }

    if (!isTauriRuntime()) {
      downloadBlob(blob, filename);
      return null;
    }

    try {
      const savedPath = await invoke("save_export_file", {
        folderPath: targetFolder || "",
        subfolderName: outputFolderName,
        fileName: filename,
        base64Data,
      });
      if (savedPath) return savedPath;
    } catch (err) {
      throw new Error(t("runtime.writeFailed", { error: err?.message || err }));
    }

    throw new Error(t("runtime.writeFailed", { error: "No output path returned" }));
  }

  async function exportAsImages(pageList, platform, quality, themeClass, isTransparent, bgHex, bgType, bgVal, ext, targetFolder, outputFolderName, isTopLeft, isTopRight, isBottomLeft, isBottomRight) {
    let lastSavedPath = null;
    for (let i = 0; i < pageList.length; i++) {
      const page = pageList[i];
      const pageNum = pageList.length === 1 ? activePageIndex.value + 1 : i + 1;
      exportMessage.value = t("runtime.renderingPage", { current: i + 1, total: pageList.length });

      const canvas = await renderPageToCanvas(
        page,
        platform.width,
        platform.height,
        themeClass,
        isTransparent,
        bgHex,
        bgType,
        bgVal,
        ext,
        isTopLeft,
        isTopRight,
        isBottomLeft,
        isBottomRight,
        pageNum,
        pageList.length,
        customFontFamily?.value || "",
        customFontEmbedCss?.value || "",
      );

      if (!canvas) {
        throw new Error(t("runtime.renderFailed", { page: i + 1 }));
      }

      const mimeType = ext === "jpg" ? "image/jpeg" : "image/png";
      const blobQuality = ext === "jpg" ? quality : 1.0;
      const blob = await canvasToBlob(canvas, mimeType, blobQuality);
      if (!blob) {
        throw new Error(t("runtime.convertFailed", { format: ext.toUpperCase() }));
      }

      const filename = `markcard-page-${pageNum}.${ext}`;
      lastSavedPath = await saveOutputBlob(blob, filename, targetFolder, outputFolderName);
    }

    if (lastSavedPath) {
      exportMessage.value = t("runtime.exportedTo", { path: lastSavedPath });
    } else {
      exportMessage.value = pageList.length === 1
        ? t("runtime.exportedPage", { page: activePageIndex.value + 1, format: ext.toUpperCase() })
        : t("runtime.exportedImages", { count: pageList.length, format: ext.toUpperCase() });
    }
  }

  async function exportAsLongImage(pageList, platform, quality, themeClass, isTransparent, bgHex, bgType, bgVal, targetFolder, outputFolderName, isTopLeft, isTopRight, isBottomLeft, isBottomRight) {
    const canvases = [];

    for (let i = 0; i < pageList.length; i++) {
      exportMessage.value = t("runtime.stitchingPage", { current: i + 1, total: pageList.length });
      const canvas = await renderPageToCanvas(
        pageList[i],
        platform.width,
        platform.height,
        themeClass,
        isTransparent,
        bgHex,
        bgType,
        bgVal,
        "png",
        isTopLeft,
        isTopRight,
        isBottomLeft,
        isBottomRight,
        i + 1,
        pageList.length,
        customFontFamily?.value || "",
        customFontEmbedCss?.value || "",
      );
      if (!canvas) {
        throw new Error(t("runtime.renderFailed", { page: i + 1 }));
      }
      canvases.push(canvas);
    }

    if (!canvases.length) {
      throw new Error(t("runtime.longImageFailed"));
    }

    const singleW = canvases[0].width;
    const singleH = canvases[0].height;
    const totalH = singleH * canvases.length;

    const masterCanvas = document.createElement("canvas");
    masterCanvas.width = singleW;
    masterCanvas.height = totalH;
    const ctx = masterCanvas.getContext("2d");

    if (!ctx || masterCanvas.width !== singleW || masterCanvas.height !== totalH) {
      throw new Error(t("runtime.longImageFailed"));
    }

    if (!isTransparent) {
      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, singleW, totalH);
    }

    for (let i = 0; i < canvases.length; i++) {
      ctx.drawImage(canvases[i], 0, i * singleH);
    }

    const blob = await canvasToBlob(masterCanvas, "image/png", 1.0);
    if (blob) {
      const filename = `markcard-long-image-${canvases.length}pages.png`;
      const savedPath = await saveOutputBlob(blob, filename, targetFolder, outputFolderName);
      if (savedPath) {
        exportMessage.value = t("runtime.longImageExported", { path: savedPath });
      } else {
        exportMessage.value = t("runtime.longImageComplete", { count: canvases.length });
      }
    }
  }

  async function exportAsPDF(pageList, platform, quality, themeClass, isTransparent, bgHex, bgType, bgVal, targetFolder, outputFolderName, isTopLeft, isTopRight, isBottomLeft, isBottomRight) {
    exportMessage.value = t("runtime.pdfPreparing", { count: pageList.length });

    const isLandscape = platform.width > platform.height;
    const doc = new jsPDF({
      orientation: isLandscape ? "landscape" : "portrait",
      unit: "px",
      format: [platform.width, platform.height],
    });

    for (let i = 0; i < pageList.length; i++) {
      exportMessage.value = t("runtime.pdfPage", { current: i + 1, total: pageList.length });
      const canvas = await renderPageToCanvas(
        pageList[i],
        platform.width,
        platform.height,
        themeClass,
        false,
        bgHex,
        bgType,
        bgVal,
        "png",
        isTopLeft,
        isTopRight,
        isBottomLeft,
        isBottomRight,
        i + 1,
        pageList.length,
        customFontFamily?.value || "",
        customFontEmbedCss?.value || "",
      );

      if (!canvas) {
        throw new Error(t("runtime.pdfFailed", { page: i + 1 }));
      }

      // Keep the cover lossless so decorative stickers survive the second
      // canvas-to-PDF conversion. Content pages remain JPEG-compressed to keep
      // multipage document sizes reasonable.
      const isCover = Boolean(pageList[i]?.cover);
      const imageFormat = isCover ? "PNG" : "JPEG";
      const imgData = canvas.toDataURL(isCover ? "image/png" : "image/jpeg", quality);
      if (i > 0) {
        doc.addPage([platform.width, platform.height], isLandscape ? "landscape" : "portrait");
      }
      doc.addImage(
        imgData,
        imageFormat,
        0,
        0,
        platform.width,
        platform.height,
        undefined,
        isCover ? "FAST" : undefined,
      );
    }

    const filename = `markcard-document-${pageList.length}pages.pdf`;
    const pdfArrayBuffer = doc.output("arraybuffer");
    const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

    const savedPath = await saveOutputBlob(pdfBlob, filename, targetFolder, outputFolderName);
    if (savedPath) {
      exportMessage.value = t("runtime.pdfExported", { path: savedPath });
    } else {
      exportMessage.value = t("runtime.pdfComplete", { count: pageList.length });
    }
  }

  async function openOutputFolder(targetPath) {
    try {
      await invoke("open_export_folder", { path: targetPath || exportPath?.value || "" });
    } catch {
      // ignore fallback
    }
  }

  return {
    exportCurrentPage: exportDocument,
    openOutputFolder,
  };
}

function createOutputFolderName(markdownPath) {
  if (typeof markdownPath === "string" && markdownPath.trim()) {
    const normalizedPath = markdownPath.trim().replace(/\\/g, "/");
    const fileName = normalizedPath.split("/").pop() || "";
    const extensionIndex = fileName.lastIndexOf(".");
    const stem = extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
    const safeStem = sanitizeFolderName(stem);
    if (safeStem) return safeStem;
  }

  const now = new Date();
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("");
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join("");
  return `markcard-${date}-${time}`;
}

function sanitizeFolderName(name) {
  return String(name || "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 100);
}

// Offscreen DOM card renderer for high-res snapshot capture using html-to-image
async function renderPageToCanvas(page, width, height, themeClass, isTransparent, bgHex, bgType, bgVal, ext, isTopLeft = true, isTopRight = true, isBottomLeft = true, isBottomRight = true, pageNum = 1, totalPages = 1, customFontFamily = "", customFontEmbedCss = "") {
  // Render at a standard design viewport (450px wide portrait / 640px landscape)
  // then upscale via pixelRatio so the final canvas exactly matches the target platform size.
  // This avoids the "text looks tiny" problem (DOM rendered at 1080px with 16px fonts)
  // while also avoiding the "file too large" problem (double-scaling beyond platform size).
  const baseWidth = width > height ? 640 : 450;
  const baseHeight = Math.round(baseWidth * (height / width));
  // pixelRatio needed so html-to-image outputs exactly (width × height) pixels
  const renderPixelRatio = width / baseWidth;

  const container = document.createElement("div");
  // Position off-screen so the element renders (images load) but isn't visible to user.
  // Do NOT use opacity/visibility as they inherit to children and break html-to-image output.
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${baseWidth}px`;
  container.style.height = `${baseHeight}px`;
  container.style.zIndex = "-9999";
  container.style.pointerEvents = "none";
  container.style.overflow = "hidden";
  document.body.appendChild(container);

  const exportApp = createApp(CardArtwork, {
    page,
    pageIndex: Math.max(0, pageNum - 1),
    pagesLength: totalPages,
    selectedPlatform: { width, height },
    selectedThemeClass: themeClass,
    transparentBackground: isTransparent && ext !== "jpg",
    backgroundColor: bgHex,
    backgroundType: bgType,
    backgroundValue: bgVal,
    showPageNumber: isTopRight,
    showTopLeft: isTopLeft,
    showTopRight: isTopRight,
    showBottomLeft: isBottomLeft,
    showBottomRight: isBottomRight,
    customFontFamily,
    autoPrepare: false,
  });
  exportApp.use(i18n);
  exportApp.mount(container);
  const posterNode = container.querySelector(".poster-canvas-frame");

  try {
    if (!posterNode) throw new Error(t("runtime.renderFailed", { page: pageNum }));
    if (page?.blocks?.some((block) => block?.oversize)) {
      throw new Error(t("runtime.renderFailed", { page: pageNum }));
    }
    await nextTick();
    await renderMermaidDiagrams(posterNode);
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const discoveredFontCss = await rasterizeMathForExport(posterNode);
    const fontEmbedCSS = [discoveredFontCss, customFontEmbedCss]
      .filter(Boolean)
      .join("\n");
    await rasterizeMermaidForExport(
      posterNode,
      customFontFamily,
      customFontEmbedCss,
    );
    // Inline images before cloning the node. html-to-image needs to fetch image
    // sources again while cloning; that second fetch is unreliable in the
    // Tauri WebView (especially for remote URLs) and can result in a blank
    // image in the exported PNG even though the preview displays it.
    await inlineImagesForExport(posterNode, renderPixelRatio);
    await inlineBackgroundImagesForExport(posterNode);
    await rasterizeCoverStickersForExport(posterNode);

    // Ensure all images (content images, stickers, math formula PNGs, mermaid diagrams)
    // are 100% loaded and decoded in bitmap memory before canvas capture
    const allImages = Array.from(posterNode.querySelectorAll("img"));
    const decodedImages = await Promise.all(allImages.map((img) => waitForImageDecode(img)));
    if (decodedImages.some((decoded) => !decoded)) {
      throw new Error(t("runtime.binaryFailed"));
    }

    const scrollArea = posterNode.querySelector(".card-scroll-area");
    if (scrollArea && scrollArea.scrollHeight > scrollArea.clientHeight + 1) {
      throw new Error(t("runtime.renderFailed", { page: pageNum }));
    }

    // Let the browser settle fonts, CSS, and GPU texture uploads (prevents first-export blank images)
    await new Promise((r) => setTimeout(r, 250));

    const captureOptions = {
      pixelRatio: renderPixelRatio,
      width: baseWidth,
      height: baseHeight,
      // html-to-image multiplies canvasWidth/canvasHeight by pixelRatio. The
      // previous values already included that ratio, producing 2592×3456 for
      // a requested 1080×1440 export.
      canvasWidth: baseWidth,
      canvasHeight: baseHeight,
      backgroundColor: (!isTransparent || ext === "jpg") ? (bgHex || "#69eacb") : null,
      cacheBust: false,
      skipFonts: false,
      preferredFontFormat: "woff2",
    };
    if (fontEmbedCSS) captureOptions.fontEmbedCSS = fontEmbedCSS;

    const canvas = await toCanvas(posterNode, captureOptions);
    compositeContentImages(canvas, posterNode);
    compositeCoverStickers(canvas, posterNode);
    exportApp.unmount();
    container.remove();
    return canvas;
  } catch (err) {
    console.error("html-to-image render error:", err);
    exportApp.unmount();
    container.remove();
    return null;
  }
}

/**
 * KaTeX relies on several custom web fonts. Nested font embedding inside the
 * final html-to-image capture is unreliable in WebViews, so formulas are
 * captured once at their rendered size and replaced by transparent PNGs.
 */
async function rasterizeMathForExport(root) {
  const formulaNodes = Array.from(root.querySelectorAll(".katex"));
  if (!formulaNodes.length) return null;

  let fontEmbedCSS = null;
  try {
    fontEmbedCSS = await getFontEmbedCSS(root, { preferredFontFormat: "woff2" });
  } catch (error) {
    console.warn("Failed to prepare KaTeX fonts for export", error);
  }

  for (const formulaNode of formulaNodes) {
    const rect = formulaNode.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    try {
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);
      const options = {
        pixelRatio: 2,
        width,
        height,
        canvasWidth: width,
        canvasHeight: height,
        cacheBust: false,
        skipFonts: false,
        preferredFontFormat: "woff2",
      };
      if (fontEmbedCSS) options.fontEmbedCSS = fontEmbedCSS;

      const formulaCanvas = await toCanvas(formulaNode, options);
      const image = document.createElement("img");
      image.src = formulaCanvas.toDataURL("image/png");
      image.alt = t("content.math");
      image.className = "katex-export-image";
      image.width = width;
      image.height = height;
      image.style.width = `${width}px`;
      image.style.height = `${height}px`;
      formulaNode.replaceWith(image);
    } catch (error) {
      console.warn("Failed to rasterize KaTeX formula for export", error);
    }
  }

  return fontEmbedCSS;
}

/** Rasterize Mermaid while it still has access to the live DOM font and color context. */
async function rasterizeMermaidForExport(root, customFontFamily, customFontEmbedCss) {
  const svgNodes = Array.from(root.querySelectorAll(".mermaid-raw-box svg"));
  for (const svgNode of svgNodes) {
    const rect = svgNode.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const width = Math.ceil(rect.width);
    const height = Math.ceil(rect.height);
    await inlineMermaidSvgFallback(
      svgNode,
      width,
      height,
      customFontFamily,
      customFontEmbedCss,
    );
  }
}

function replaceMermaidWithImage(svgNode, source, width, height) {
  const image = document.createElement("img");
  image.src = source;
  image.alt = t("content.mermaid");
  image.className = "mermaid-export-image";
  image.width = width;
  image.height = height;
  image.style.width = `${width}px`;
  image.style.height = `${height}px`;
  svgNode.replaceWith(image);
}

async function inlineMermaidSvgFallback(
  svgNode,
  width,
  height,
  customFontFamily = "",
  customFontEmbedCss = "",
) {
  const clone = svgNode.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  if (customFontEmbedCss) {
    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = customFontEmbedCss;
    clone.insertBefore(styleEl, clone.firstChild);
  }

  const sourceTextNodes = Array.from(svgNode.querySelectorAll("text, tspan, p, span, div, label"));
  const clonedTextNodes = Array.from(clone.querySelectorAll("text, tspan, p, span, div, label"));
  clonedTextNodes.forEach((node, index) => {
    const sourceNode = sourceTextNodes[index];
    if (!sourceNode) return;
    const computed = getComputedStyle(sourceNode);
    const family = customFontFamily
      ? `"${customFontFamily}", sans-serif`
      : computed.fontFamily || "sans-serif";
    node.style.setProperty("font-family", family, "important");
    node.style.fontSize = computed.fontSize;
    node.style.fontWeight = computed.fontWeight || "600";

    let fill = computed.fill;
    if (!fill || fill === "none" || fill === "rgba(0, 0, 0, 0)") {
      fill = computed.color && computed.color !== "rgba(0, 0, 0, 0)" ? computed.color : "#1e293b";
    }
    node.style.fill = fill;
    node.style.color = fill;
    node.setAttribute("fill", fill);
  });

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

  // Convert SVG Data URL to PNG Data URL so img.decode() in WebKit succeeds 100% without throwing exceptions
  const img = new Image();
  const pngDataUrl = await new Promise((resolve) => {
    img.onload = async () => {
      try {
        await img.decode().catch(() => undefined);
        await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width * 2);
        canvas.height = Math.max(1, height * 2);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png"));
          return;
        }
      } catch (_) {}
      resolve(svgDataUrl);
    };
    img.onerror = () => resolve(svgDataUrl);
    img.src = svgDataUrl;
  });

  replaceMermaidWithImage(svgNode, pngDataUrl, width, height);
}

function convertImageElementToDataUrl(img) {
  try {
    const width = img.naturalWidth || img.width || 300;
    const height = img.naturalHeight || img.height || 200;
    if (width === 0 || height === 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } catch (_) {
    return null;
  }
}

/**
 * Make every image a ready-to-render data URL before html-to-image clones the
 * export DOM. Local images are already data URLs, while remote/blob images are
 * fetched once here so the clone step does not depend on WebView networking.
 */
async function inlineImagesForExport(root, renderPixelRatio) {
  const imgEls = Array.from(root.querySelectorAll("img"));
  const results = await Promise.all(
    imgEls.map(async (img) => {
      const source = img.currentSrc || img.src;
      if (!source) return true;

      if (/^data:/i.test(img.src)) {
        img.srcset = "";
        const ready = await waitForImageDecode(img);
        if (!ready) return false;

        // Large local files can make html-to-image's cloned SVG exceed WebView
        // limits even though the live preview can decode the original source.
        if (img.classList.contains("card-image")) {
          const normalized = rasterizeContentImage(img, renderPixelRatio);
          if (normalized) {
            img.src = normalized;
            return waitForImageDecode(img);
          }
        }
        return true;
      }

      // Reuse pixels already decoded by the preview/export DOM when CORS allows it.
      let dataUrl = null;
      if (img.complete && img.naturalWidth > 0) {
        dataUrl = convertImageElementToDataUrl(img);
      }

      if (!dataUrl) {
        try {
          dataUrl = await loadImageSourceAsDataUrl(source);
        } catch (error) {
          console.warn(`Failed to inline image for export: ${source}`, error);
        }
      }

      if (dataUrl) {
        img.srcset = "";
        img.src = dataUrl;
        return waitForImageDecode(img);
      }

      return false;
    }),
  );

  if (results.some((ready) => !ready)) {
    throw new Error("One or more images could not be prepared for export");
  }
}

function rasterizeContentImage(img, renderPixelRatio) {
  try {
    const naturalWidth = img.naturalWidth || 0;
    const naturalHeight = img.naturalHeight || 0;
    if (naturalWidth <= 0 || naturalHeight <= 0) return null;

    const rect = img.getBoundingClientRect();
    const targetScale = Math.max(1, Number(renderPixelRatio) || 1);
    const requestedWidth = rect.width > 0
      ? Math.ceil(rect.width * targetScale)
      : naturalWidth;
    const scale = Math.min(1, 4096 / naturalWidth, 4096 / naturalHeight, requestedWidth / naturalWidth);
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(img, 0, 0, width, height);

    const sourceType = img.src.match(/^data:([^;,]+)/i)?.[1]?.toLowerCase() || "";
    const outputType = sourceType === "image/jpeg" ? "image/jpeg" : "image/png";
    return canvas.toDataURL(outputType, outputType === "image/jpeg" ? 0.92 : undefined);
  } catch (error) {
    console.warn("Failed to normalize local image for export", error);
    return null;
  }
}

function compositeContentImages(canvas, root) {
  const context = canvas.getContext("2d");
  const rootRect = root.getBoundingClientRect();
  if (!context || rootRect.width <= 0 || rootRect.height <= 0) return;

  const scaleX = canvas.width / rootRect.width;
  const scaleY = canvas.height / rootRect.height;
  for (const image of root.querySelectorAll("img.card-image")) {
    if (!image.complete || image.naturalWidth <= 0) continue;

    const rect = image.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const x = (rect.left - rootRect.left) * scaleX;
    const y = (rect.top - rootRect.top) * scaleY;
    const width = rect.width * scaleX;
    const height = rect.height * scaleY;
    const radius = Math.min(8 * Math.min(scaleX, scaleY), width / 2, height / 2);
    const opacity = Number.parseFloat(getComputedStyle(image).opacity);

    context.save();
    context.globalAlpha = Number.isFinite(opacity) ? opacity : 1;
    roundedRectPath(context, x, y, width, height, radius);
    context.clip();
    context.drawImage(image, x, y, width, height);
    context.restore();
  }
}

function compositeCoverStickers(canvas, root) {
  const context = canvas.getContext("2d");
  const rootRect = root.getBoundingClientRect();
  if (!context || rootRect.width <= 0 || rootRect.height <= 0) return;

  const scaleX = canvas.width / rootRect.width;
  const scaleY = canvas.height / rootRect.height;
  for (const sticker of root.querySelectorAll("img.cover-sticker")) {
    if (!sticker.complete || sticker.naturalWidth <= 0) continue;

    const rect = sticker.getBoundingClientRect();
    const boxWidth = sticker.offsetWidth;
    const boxHeight = sticker.offsetHeight;
    if (rect.width <= 0 || rect.height <= 0 || boxWidth <= 0 || boxHeight <= 0) continue;

    const computed = getComputedStyle(sticker);
    const borderLeft = Number.parseFloat(computed.borderLeftWidth) || 0;
    const borderRight = Number.parseFloat(computed.borderRightWidth) || 0;
    const borderTop = Number.parseFloat(computed.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(computed.borderBottomWidth) || 0;
    const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
    const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
    const contentWidth = Math.max(
      1,
      boxWidth - borderLeft - borderRight - paddingLeft - paddingRight,
    );
    const contentHeight = Math.max(
      1,
      boxHeight - borderTop - borderBottom - paddingTop - paddingBottom,
    );
    const sourceRatio = sticker.naturalWidth / sticker.naturalHeight;
    const contentRatio = contentWidth / contentHeight;
    const drawWidth = sourceRatio > contentRatio
      ? contentWidth
      : contentHeight * sourceRatio;
    const drawHeight = sourceRatio > contentRatio
      ? contentWidth / sourceRatio
      : contentHeight;
    const drawX = -boxWidth / 2
      + borderLeft
      + paddingLeft
      + (contentWidth - drawWidth) / 2;
    const drawY = -boxHeight / 2
      + borderTop
      + paddingTop
      + (contentHeight - drawHeight) / 2;

    let transform = null;
    try {
      if (computed.transform && computed.transform !== "none") {
        transform = new DOMMatrixReadOnly(computed.transform);
      }
    } catch {
      transform = null;
    }

    context.save();
    context.scale(scaleX, scaleY);
    context.translate(
      rect.left - rootRect.left + rect.width / 2,
      rect.top - rootRect.top + rect.height / 2,
    );
    if (transform) {
      context.rotate(Math.atan2(transform.b, transform.a));
      context.scale(
        Math.hypot(transform.a, transform.b) || 1,
        Math.hypot(transform.c, transform.d) || 1,
      );
    }
    const opacity = Number.parseFloat(computed.opacity);
    context.globalAlpha = Number.isFinite(opacity) ? opacity : 1;
    if (computed.filter && computed.filter !== "none") {
      context.filter = computed.filter;
    }
    context.drawImage(sticker, drawX, drawY, drawWidth, drawHeight);
    context.restore();
  }
}

function roundedRectPath(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.arcTo(x + width, y, x + width, y + radius, radius);
  context.lineTo(x + width, y + height - radius);
  context.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  context.lineTo(x + radius, y + height);
  context.arcTo(x, y + height, x, y + height - radius, radius);
  context.lineTo(x, y + radius);
  context.arcTo(x, y, x + radius, y, radius);
  context.closePath();
}

async function inlineBackgroundImagesForExport(root) {
  const elements = [root, ...root.querySelectorAll("*")];
  const candidates = elements
    .map((element) => ({
      element,
      source: extractCssUrl(element.style.backgroundImage),
    }))
    .filter(({ source }) => source && !/^data:/i.test(source));

  for (const { element, source } of candidates) {
    try {
      const dataUrl = await loadImageSourceAsDataUrl(source);
      const probe = new Image();
      probe.src = dataUrl;
      if (!await waitForImageDecode(probe)) {
        throw new Error("Decoded background image is empty");
      }
      element.style.backgroundImage = `url("${dataUrl}")`;
    } catch (error) {
      console.warn(`Failed to inline background image for export: ${source}`, error);
      throw new Error("A background image could not be prepared for export");
    }
  }
}

function extractCssUrl(backgroundImage) {
  const match = String(backgroundImage || "").trim().match(/^url\((.*)\)$/i);
  if (!match) return "";
  return match[1].trim().replace(/^(["'])(.*)\1$/, "$2");
}

async function loadImageSourceAsDataUrl(source) {
  const absoluteUrl = new URL(source, window.location.href).href;

  try {
    const response = await fetch(absoluteUrl, { cache: "force-cache", mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (blob.type && !blob.type.startsWith("image/")) {
      throw new Error(`Unexpected content type: ${blob.type}`);
    }
    return await blobToDataUrl(blob);
  } catch (browserError) {
    if (!isTauriRuntime() || !/^https?:/i.test(absoluteUrl)) throw browserError;

    const resolved = await invoke("resolve_remote_image", { url: absoluteUrl });
    if (!resolved?.dataUrl) throw browserError;
    return resolved.dataUrl;
  }
}

/** Replace cover SVG sources with PNG data before the final DOM capture. */
async function rasterizeCoverStickersForExport(root) {
  const stickers = Array.from(root.querySelectorAll("img.cover-sticker"));

  for (const sticker of stickers) {
    try {
      await waitForImageDecode(sticker);

      const canvas = document.createElement("canvas");
      canvas.width = 384;
      canvas.height = 384;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(sticker, 0, 0, 384, 384);
        const dataUrl = canvas.toDataURL("image/png");
        if (dataUrl) {
          sticker.srcset = "";
          sticker.src = dataUrl;
          await waitForImageDecode(sticker);
        }
      }
    } catch (error) {
      // Keep the already-inlined SVG as a fallback for image export.
      console.warn("Failed to rasterize cover sticker for export", error);
    }
  }
}

function waitForImageDecode(img) {
  if (!img) return Promise.resolve(false);

  if (img.complete) {
    if (img.naturalWidth <= 0) return Promise.resolve(false);
    if (typeof img.decode === "function") {
      return img.decode()
        .then(() => true)
        .catch(() => img.complete && img.naturalWidth > 0);
    }
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      img.removeEventListener("load", finish);
      img.removeEventListener("error", finish);
      resolve(img.complete && img.naturalWidth > 0);
    };

    if (img.complete) {
      finish();
    } else {
      img.addEventListener("load", finish);
      img.addEventListener("error", finish);
      setTimeout(finish, 3000);
    }
  }).then((loaded) => {
    if (!loaded) return false;
    if (typeof img.decode === "function") {
      return img.decode()
        .then(() => true)
        .catch(() => img.complete && img.naturalWidth > 0);
    }
    return img.complete && img.naturalWidth > 0;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string" && reader.result) {
        resolve(reader.result);
      } else {
        reject(new Error("Image data is empty"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function parseLine(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith("> ")) {
    return { type: "quote", content: formatRichText(trimmed.slice(2)) };
  }
  if (/^[-*]\s+/.test(trimmed)) {
    return { type: "list", content: formatRichText(trimmed.replace(/^[-*]\s+/, "")) };
  }
  if (/^\d+\.\s+/.test(trimmed)) {
    const num = trimmed.match(/^(\d+)\.\s+/)[1];
    return { type: "ordered-list", num, content: formatRichText(trimmed.replace(/^\d+\.\s+/, "")) };
  }
  return { type: "paragraph", content: formatRichText(trimmed) };
}

function formatRichText(text) {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/\*\*(.*?)\*\*/g, "<strong class='font-bold'>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code class='rounded bg-amber-100/70 dark:bg-amber-950/70 px-1.5 py-0.5 text-xs text-amber-900 dark:text-amber-200 font-mono'>$1</code>");
  html = html.replace(/\*([^*]+)\*/g, "<em class='italic'>$1</em>");
  html = html.replace(/==([^=]+)==/g, "<mark class='bg-amber-200/90 dark:bg-amber-800/70 px-1 rounded'>$1</mark>");

  return html;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (!dataUrl) {
        reject(new Error("FileReader result is empty"));
        return;
      }
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas, mimeType, quality = 0.92) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

export function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
