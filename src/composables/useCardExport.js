import { invoke } from "@tauri-apps/api/core";
import { getFontEmbedCSS, toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import { nextTick } from "vue";
import { parseBlocks, renderBlocksToHtml, renderMermaidDiagrams } from "./useContentParser.js";
import { getCoverStickers } from "../config/coverStickers.js";
import { i18n } from "../i18n/index.js";

function t(key, params) {
  return i18n.global.t(key, params);
}

export function useCardExport({
  activePageIndex,
  pages,
  sourcePath,
  selectedPlatform,
  canvasRef,
  exportMessage,
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
}) {
  async function exportDocument() {
    await nextTick();
    const allPages = pages?.value || [];
    if (!allPages.length) return;

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

    if (!targetFolder) {
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
  }

  async function saveOutputBlob(blob, filename, targetFolder, outputFolderName) {
    const base64Data = await blobToBase64(blob);
    if (!base64Data) {
      throw new Error(t("runtime.binaryFailed"));
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

    downloadBlob(blob, filename);
    return null;
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
        pageList.length
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
        pageList.length
      );
      if (canvas) canvases.push(canvas);
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

    if (ctx) {
      if (!isTransparent) {
        ctx.fillStyle = bgHex;
        ctx.fillRect(0, 0, singleW, totalH);
      }

      for (let i = 0; i < canvases.length; i++) {
        ctx.drawImage(canvases[i], 0, i * singleH);
      }
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
        pageList.length
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
async function renderPageToCanvas(page, width, height, themeClass, isTransparent, bgHex, bgType, bgVal, ext, isTopLeft = true, isTopRight = true, isBottomLeft = true, isBottomRight = true, pageNum = 1, totalPages = 1) {
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

  const posterNode = document.createElement("div");
  posterNode.className = "poster-canvas-frame relative flex flex-col justify-between p-5 overflow-hidden rounded-2xl h-full w-full";
  posterNode.style.width = `${baseWidth}px`;
  posterNode.style.height = `${baseHeight}px`;
  posterNode.style.margin = "0";
  posterNode.style.boxSizing = "border-box";

  if (!isTransparent || ext === "jpg") {
    if (bgType === "solid") {
      posterNode.style.backgroundColor = bgVal || bgHex || "#69eacb";
      posterNode.style.backgroundImage = "none";
      posterNode.style.background = bgVal || bgHex || "#69eacb";
    } else if (bgType === "gradient" || bgType === "pattern") {
      posterNode.style.backgroundImage = bgVal;
      posterNode.style.background = bgVal;
    } else if (bgType === "image" || bgType === "wallpaper") {
      if (bgVal?.startsWith("data:") || bgVal?.startsWith("http") || bgVal?.startsWith("blob:") || bgVal?.startsWith("/")) {
        posterNode.style.backgroundImage = `url('${bgVal}')`;
        posterNode.style.backgroundSize = "cover";
        posterNode.style.backgroundPosition = "center";
        posterNode.style.backgroundRepeat = "no-repeat";
      } else {
        posterNode.style.backgroundImage = bgVal;
        posterNode.style.background = bgVal;
      }
    } else {
      posterNode.style.backgroundColor = bgHex || "#69eacb";
      posterNode.style.backgroundImage = "none";
    }
  } else {
    posterNode.style.background = "transparent";
    posterNode.style.backgroundColor = "transparent";
  }

  const cardNode = document.createElement("article");
  // Keep this class list in sync with PreviewArtworkCard. Layout-only utility
  // differences here change flex distribution and make export diverge from
  // what the user sees in the preview.
  const isCover = Boolean(page?.cover);
  cardNode.className = `card-canvas ${themeClass} ${isCover ? "is-cover" : ""} group/card relative flex-1 flex flex-col h-full w-full rounded-xl overflow-hidden shadow-md border border-black/5 dark:border-white/10`;
  cardNode.style.margin = "0";
  cardNode.style.boxSizing = "border-box";

  const blocks = page?.blocks ?? parseBlocks(page?.bodyMarkdown?.split("\n") ?? page?.body ?? []);
  const bodyHtml = renderBlocksToHtml(blocks);
  const stickerHtml = isCover ? renderCoverStickerHtml(themeClass) : "";

  const quote = page?.quote || t("runtime.defaultQuote");
  const now = new Date();
  const defaultDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
  const displayDate = page?.date || defaultDate;

  if (isTopLeft || isTopRight) {
    const headerNode = document.createElement("div");
    headerNode.className = "poster-header z-10 flex items-center justify-between text-xs font-semibold px-1 pb-2 text-slate-800 dark:text-slate-100 drop-shadow-xs min-h-[24px]";
    const kickerHtml = isTopLeft ? `<span class="inline-flex items-center rounded-md bg-black/10 dark:bg-white/15 px-2 py-0.5 text-[11px] font-bold backdrop-blur-xs tracking-wide">${page?.kicker || "@MarkCard"}</span>` : "";
    const pageNumStr = `${String(pageNum).padStart(2, "0")} / ${String(totalPages || 1).padStart(2, "0")}`;
    const pageNumHtml = isTopRight ? `<div class="text-[11px] font-mono font-bold opacity-80">${pageNumStr}</div>` : "";
    headerNode.innerHTML = `
      <div class="flex items-center gap-1.5">${kickerHtml}</div>
      ${pageNumHtml}
    `;
    posterNode.appendChild(headerNode);
  }

  const titleHtml = (!page?.isOverflow && page?.title) ? `<h1>${page.title}</h1>` : "";

  cardNode.innerHTML = `
    <div class="leaf-shadow top"></div>
    <div class="leaf-shadow side"></div>
    ${stickerHtml}
    <div class="card-scroll-area">
      ${titleHtml}
      <div class="card-body">
        ${bodyHtml}
      </div>
    </div>
  `;
  posterNode.appendChild(cardNode);

  if (isBottomLeft || isBottomRight) {
    const footerNode = document.createElement("div");
    footerNode.className = "poster-footer z-10 flex items-center justify-between text-xs pt-2.5 px-1 text-slate-800 dark:text-slate-100 drop-shadow-xs min-h-[24px]";
    const dateHtml = isBottomLeft ? `<div class="font-mono text-[11px] opacity-85 shrink-0"><span>${displayDate}</span></div>` : "<div></div>";
    const quoteHtml = isBottomRight ? `<strong class="truncate text-right font-medium text-[11px] max-w-[70%] opacity-90">${quote}</strong>` : "";
    footerNode.innerHTML = `
      ${dateHtml}
      ${quoteHtml}
    `;
    posterNode.appendChild(footerNode);
  }
  container.appendChild(posterNode);

  try {
    await renderMermaidDiagrams(posterNode);
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const fontEmbedCSS = await rasterizeMathForExport(posterNode);
    inlineMermaidForExport(posterNode);
    // Inline images before cloning the node. html-to-image needs to fetch image
    // sources again while cloning; that second fetch is unreliable in the
    // Tauri WebView (especially for remote URLs) and can result in a blank
    // image in the exported PNG even though the preview displays it.
    await inlineImagesForExport(posterNode);
    await rasterizeCoverStickersForExport(posterNode);

    // Ensure all images (content images, stickers, math formula PNGs, mermaid diagrams)
    // are 100% loaded and decoded in bitmap memory before canvas capture
    const allImages = Array.from(posterNode.querySelectorAll("img"));
    await Promise.all(allImages.map((img) => waitForImageDecode(img)));

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
    container.remove();
    return canvas;
  } catch (err) {
    console.error("html-to-image render error:", err);
    container.remove();
    return null;
  }
}

function renderCoverStickerHtml(themeClass) {
  const stickers = getCoverStickers(themeClass);
  const images = stickers
    .map((sticker) => `<img src="${sticker.src}" alt="" class="cover-sticker cover-sticker--${sticker.position}" loading="eager" />`)
    .join("");
  return `<div class="cover-sticker-layer" aria-hidden="true">${images}</div>`;
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

/** Convert rendered Mermaid SVGs into self-contained image nodes. */
function inlineMermaidForExport(root) {
  const svgNodes = Array.from(root.querySelectorAll(".mermaid-raw-box svg"));
  for (const svgNode of svgNodes) {
    const rect = svgNode.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const width = Math.ceil(rect.width);
    const height = Math.ceil(rect.height);
    const clone = svgNode.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));

    const serialized = new XMLSerializer().serializeToString(clone);
    const image = document.createElement("img");
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
    image.alt = t("content.mermaid");
    image.className = "mermaid-export-image";
    image.width = width;
    image.height = height;
    image.style.width = `${width}px`;
    image.style.height = `${height}px`;
    svgNode.replaceWith(image);
  }
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
async function inlineImagesForExport(root) {
  const imgEls = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgEls.map(async (img) => {
      const source = img.currentSrc || img.src;
      if (!source) return;

      if (/^data:/i.test(img.src)) {
        img.srcset = "";
        return;
      }

      // First, ensure image is decoded in DOM
      await waitForImageDecode(img);

      // Attempt 1: Direct 2D canvas drawing (extracts decoded pixels from DOM element without network fetch)
      let dataUrl = null;
      if (img.complete && img.naturalWidth > 0) {
        dataUrl = convertImageElementToDataUrl(img);
      }

      // Attempt 2: If canvas extraction failed (e.g. CORS), fetch source using absolute URL
      if (!dataUrl) {
        try {
          const absoluteUrl = new URL(source, window.location.href).href;
          const response = await fetch(absoluteUrl, { mode: "cors" });
          if (response.ok) {
            const blob = await response.blob();
            dataUrl = await blobToDataUrl(blob);
          }
        } catch (error) {
          console.warn(`Failed to inline image for export: ${source}`, error);
        }
      }

      if (dataUrl) {
        img.srcset = "";
        img.src = dataUrl;
        await waitForImageDecode(img);
      }
    }),
  );
}

/** Replace cover SVG sources with PNG data before the final DOM capture. */
async function rasterizeCoverStickersForExport(root) {
  const stickers = Array.from(root.querySelectorAll("img.cover-sticker"));

  for (const sticker of stickers) {
    try {
      await waitForImageDecode(sticker);

      let dataUrl = convertImageElementToDataUrl(sticker);
      if (!dataUrl) {
        const canvas = document.createElement("canvas");
        canvas.width = 192;
        canvas.height = 192;
        const context = canvas.getContext("2d");
        if (context) {
          context.drawImage(sticker, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL("image/png");
        }
      }

      if (dataUrl) {
        sticker.srcset = "";
        sticker.src = dataUrl;
        await waitForImageDecode(sticker);
      }
    } catch (error) {
      // Keep the already-inlined SVG as a fallback for image export.
      console.warn("Failed to rasterize cover sticker for export", error);
    }
  }
}

function waitForImageDecode(img) {
  if (!img) return Promise.resolve();

  return new Promise((resolve) => {
    if (img.complete && img.naturalWidth > 0) {
      resolve();
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      img.removeEventListener("load", finish);
      img.removeEventListener("error", finish);
      resolve();
    };

    if (img.complete && img.naturalWidth > 0) {
      finish();
    } else {
      img.addEventListener("load", finish);
      img.addEventListener("error", finish);
      setTimeout(finish, 800);
    }
  }).then(() => {
    if (typeof img.decode === "function") {
      return img.decode().catch(() => undefined);
    }
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
