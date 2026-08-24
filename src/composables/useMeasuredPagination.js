import { createApp, h, nextTick, reactive } from "vue";
import CardArtwork from "../components/preview/CardArtwork.vue";
import { i18n } from "../i18n/index.js";
import { renderMermaidDiagrams } from "./useContentParser.js";

const MAX_MEASUREMENT_CACHE_ENTRIES = 600;
const measurementCache = new Map();
const blockSignatureCache = new WeakMap();

function createAbortError() {
  return new DOMException("Pagination measurement cancelled", "AbortError");
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw createAbortError();
}

function raceWithAbort(promise, signal) {
  if (!signal) return promise;
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const abort = () => reject(createAbortError());
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

function hashString(value) {
  const source = String(value || "");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function blockSignature(block) {
  if (!block || typeof block !== "object") return hashString(block);
  const cached = blockSignatureCache.get(block);
  if (cached) return cached;
  const signature = hashString(JSON.stringify({
    ...block,
    src: block.src ? hashString(block.src) : undefined,
  }));
  blockSignatureCache.set(block, signature);
  return signature;
}

function getCachedMeasurement(key) {
  if (!measurementCache.has(key)) return undefined;
  const value = measurementCache.get(key);
  measurementCache.delete(key);
  measurementCache.set(key, value);
  return value;
}

function setCachedMeasurement(key, value) {
  measurementCache.delete(key);
  measurementCache.set(key, value);
  if (measurementCache.size > MAX_MEASUREMENT_CACHE_ENTRIES) {
    measurementCache.delete(measurementCache.keys().next().value);
  }
}

function blockTextLength(block) {
  if (!block) return 0;
  if (typeof block.content === "string") return block.content.replace(/\s/g, "").length;
  if (Array.isArray(block.lines)) return block.lines.join("").replace(/\s/g, "").length;
  if (Array.isArray(block.items)) {
    return block.items.reduce(
      (total, item) => total + String(typeof item === "string" ? item : item?.text || "").replace(/\s/g, "").length,
      0,
    );
  }
  if (block.type === "table") {
    const cells = [...(block.headers || []), ...(block.rows || []).flat()];
    return cells
      .map((cell) => typeof cell === "string" ? cell : cell?.text || "")
      .join("")
      .replace(/\s/g, "").length;
  }
  return String(block.raw || "").replace(/\s/g, "").length;
}

function blocksTextLength(blocks) {
  return (blocks || []).reduce((total, block) => total + blockTextLength(block), 0);
}

async function waitForImage(image, signal, timeout = 1200) {
  throwIfAborted(signal);
  if (image.complete) {
    if (typeof image.decode === "function" && image.naturalWidth > 0) {
      await raceWithAbort(image.decode().catch(() => undefined), signal);
    }
    return true;
  }

  const settled = await new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      image.removeEventListener("load", loaded);
      image.removeEventListener("error", failed);
      signal?.removeEventListener("abort", aborted);
    };
    const finish = (value) => {
      cleanup();
      resolve(value);
    };
    const loaded = () => finish(true);
    const failed = () => finish(true);
    const aborted = () => {
      cleanup();
      reject(createAbortError());
    };
    const timer = setTimeout(() => finish(false), timeout);
    image.addEventListener("load", loaded, { once: true });
    image.addEventListener("error", failed, { once: true });
    signal?.addEventListener("abort", aborted, { once: true });
  });

  if (settled && typeof image.decode === "function" && image.naturalWidth > 0) {
    await raceWithAbort(image.decode().catch(() => undefined), signal);
  }
  return settled;
}

function createMeasurementHost(options) {
  const width = Number(options.platform?.width) || 1080;
  const height = Number(options.platform?.height) || 1440;
  const designWidth = width > height ? 640 : 450;
  const designHeight = Math.max(1, Math.round(designWidth * (height / width)));
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${designWidth}px`,
    height: `${designHeight}px`,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: "-10000",
  });
  document.body.appendChild(host);

  const state = reactive({
    page: { title: "", blocks: [], cover: false, isOverflow: false },
  });
  const Wrapper = {
    setup() {
      return () => h(CardArtwork, {
        page: state.page,
        pageIndex: 0,
        pagesLength: 1,
        selectedPlatform: options.platform,
        selectedThemeClass: options.themeClass,
        transparentBackground: false,
        backgroundColor: "#ffffff",
        backgroundType: "solid",
        backgroundValue: "#ffffff",
        showPageNumber: options.showTopRight,
        showTopLeft: options.showTopLeft,
        showTopRight: options.showTopRight,
        showBottomLeft: options.showBottomLeft,
        showBottomRight: options.showBottomRight,
        customFontFamily: options.customFontFamily,
        autoPrepare: false,
      });
    },
  };
  const app = createApp(Wrapper);
  app.use(i18n);
  app.mount(host);

  const cachePrefix = JSON.stringify({
    width,
    height,
    themeClass: options.themeClass,
    showTopLeft: options.showTopLeft,
    showTopRight: options.showTopRight,
    showBottomLeft: options.showBottomLeft,
    showBottomRight: options.showBottomRight,
    customFontFingerprint: options.customFontFingerprint || "theme-default",
    dark: document.documentElement.classList.contains("dark"),
  });

  async function fits(blocks, pageOptions = {}, maxPageLength = null) {
    throwIfAborted(options.signal);
    if (
      Number.isFinite(maxPageLength)
      && maxPageLength > 0
      && blocksTextLength(blocks) > maxPageLength
    ) {
      return false;
    }

    const cacheKey = `${cachePrefix}:${hashString(pageOptions.title)}:${Boolean(pageOptions.cover)}:${Boolean(pageOptions.isOverflow)}:${maxPageLength || 0}:${blocks.map(blockSignature).join(".")}`;
    const cached = getCachedMeasurement(cacheKey);
    if (cached !== undefined) return cached;

    state.page = {
      title: pageOptions.title || "",
      blocks,
      cover: Boolean(pageOptions.cover),
      isOverflow: Boolean(pageOptions.isOverflow),
    };
    await nextTick();
    throwIfAborted(options.signal);

    const poster = host.querySelector(".poster-canvas-frame");
    if (!poster) return false;
    await raceWithAbort(renderMermaidDiagrams(poster), options.signal);
    if (document.fonts?.ready) await raceWithAbort(document.fonts.ready, options.signal);
    const imageResults = await Promise.all(
      Array.from(poster.querySelectorAll("img")).map((image) => waitForImage(image, options.signal)),
    );
    await nextTick();
    throwIfAborted(options.signal);

    const scrollArea = poster.querySelector(".card-scroll-area");
    const result = Boolean(
      scrollArea
      && scrollArea.clientHeight > 0
      && scrollArea.scrollHeight <= scrollArea.clientHeight + 1
    );
    if (imageResults.every(Boolean)) setCachedMeasurement(cacheKey, result);
    return result;
  }

  let destroyed = false;
  return {
    fits,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      app.unmount();
      host.remove();
    },
  };
}

function splitTextCandidates(text) {
  const source = String(text || "");
  const candidates = [];
  for (let index = 1; index < source.length; index += 1) {
    const char = source[index - 1];
    if (/\s|[。！？；，、.!?;,]/.test(char) || /[⺀-鿿豈-﫿]/.test(char)) {
      candidates.push(index);
    }
  }
  return candidates;
}

function hasBalancedInlineMarkup(text) {
  const source = String(text || "").replace(/\\./g, "");
  const markers = ["`", "**", "~~", "==", "$", "*", "_"];
  for (const marker of markers) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if ((source.match(new RegExp(escaped, "g"))?.length || 0) % 2 !== 0) return false;
  }
  return (source.match(/\[/g)?.length || 0) === (source.match(/\]/g)?.length || 0)
    && (source.match(/\(/g)?.length || 0) === (source.match(/\)/g)?.length || 0);
}

async function findLargestPrefix(items, makeHead, currentBlocks, fits, maxPrefix = items.length - 1) {
  let low = 1;
  let high = maxPrefix;
  let best = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (await fits([...currentBlocks, makeHead(middle)])) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return best;
}

async function splitBlock(block, currentBlocks, fits) {
  if (["list", "ordered-list", "task-list"].includes(block.type) && block.items?.length > 1) {
    const count = await findLargestPrefix(
      block.items,
      (length) => ({ ...block, items: block.items.slice(0, length) }),
      currentBlocks,
      fits,
    );
    if (count > 0) {
      const startIndex = block.startIndex || 0;
      return {
        head: { ...block, items: block.items.slice(0, count), startIndex },
        tail: {
          ...block,
          items: block.items.slice(count),
          startIndex: startIndex + count,
        },
      };
    }
  }

  if (block.type === "table" && block.rows?.length > 1) {
    const count = await findLargestPrefix(
      block.rows,
      (length) => ({ ...block, rows: block.rows.slice(0, length) }),
      currentBlocks,
      fits,
    );
    if (count > 0) {
      return {
        head: { ...block, rows: block.rows.slice(0, count) },
        tail: { ...block, rows: block.rows.slice(count) },
      };
    }
  }

  if (block.type === "code-block" && block.lines?.length > 1) {
    const count = await findLargestPrefix(
      block.lines,
      (length) => {
        const lines = block.lines.slice(0, length);
        return { ...block, lines, raw: lines.join("\n") };
      },
      currentBlocks,
      fits,
    );
    if (count > 0) {
      const headLines = block.lines.slice(0, count);
      const tailLines = block.lines.slice(count);
      return {
        head: { ...block, lines: headLines, raw: headLines.join("\n") },
        tail: { ...block, lines: tailLines, raw: tailLines.join("\n") },
      };
    }
  }

  if (block.type === "code-block" && block.lines?.length === 1 && block.lines[0].length > 1) {
    const source = block.lines[0];
    const indexes = Array.from({ length: source.length - 1 }, (_, index) => index + 1);
    const count = await findLargestPrefix(
      indexes,
      (length) => {
        const raw = source.slice(0, indexes[length - 1]);
        return { ...block, lines: [raw], raw };
      },
      currentBlocks,
      fits,
      indexes.length,
    );
    if (count > 0) {
      const index = indexes[count - 1];
      const headText = source.slice(0, index);
      const tailText = source.slice(index);
      return {
        head: { ...block, lines: [headText], raw: headText },
        tail: { ...block, lines: [tailText], raw: tailText },
      };
    }
  }

  if (block.type === "blockquote" && block.lines?.length > 1) {
    const count = await findLargestPrefix(
      block.lines,
      (length) => {
        const lines = block.lines.slice(0, length);
        return { ...block, lines, content: lines.join(" ") };
      },
      currentBlocks,
      fits,
    );
    if (count > 0) {
      const headLines = block.lines.slice(0, count);
      const tailLines = block.lines.slice(count);
      return {
        head: { ...block, lines: headLines, content: headLines.join(" ") },
        tail: { ...block, lines: tailLines, content: tailLines.join(" ") },
      };
    }
  }

  const textField = ["callout", "paragraph", "heading2", "heading3", "blockquote", "footnote"].includes(block.type)
    ? "content"
    : null;
  if (textField && block[textField]) {
    const source = block[textField];
    const candidates = splitTextCandidates(source).filter((index) => (
      hasBalancedInlineMarkup(source.slice(0, index))
      && hasBalancedInlineMarkup(source.slice(index))
    ));
    const count = await findLargestPrefix(
      candidates,
      (length) => ({ ...block, [textField]: source.slice(0, candidates[length - 1]).trim() }),
      currentBlocks,
      fits,
      candidates.length,
    );
    if (count > 0) {
      const index = candidates[count - 1];
      const headText = source.slice(0, index).trim();
      const tailText = source.slice(index).trim();
      if (headText && tailText) {
        const withText = (text) => block.type === "blockquote"
          ? { ...block, content: text, lines: [text] }
          : {
            ...block,
            [textField]: text,
            ...(block.type === "paragraph" ? { textContent: text } : {}),
          };
        return {
          head: withText(headText),
          tail: withText(tailText),
        };
      }
    }
  }

  return null;
}

async function paginateBlocks(blocks, options, measurer) {
  if (!blocks?.length) return [[]];
  const pages = [];
  const queue = [...blocks];
  let current = [];

  const pageOptions = () => ({
    title: options.title,
    cover: options.cover && pages.length === 0,
    isOverflow: pages.length > 0,
  });
  const fits = (candidate) => measurer.fits(
    candidate,
    pageOptions(),
    options.maxPageLength,
  );

  while (queue.length) {
    throwIfAborted(options.signal);
    const block = queue.shift();
    if (await fits([...current, block])) {
      current.push(block);
      continue;
    }

    if (current.length) {
      const split = await splitBlock(block, current, fits);
      if (split?.head) {
        current.push(split.head);
        pages.push(current);
        current = [];
        if (split.tail) queue.unshift(split.tail);
        continue;
      }
      pages.push(current);
      current = [];
      queue.unshift(block);
      continue;
    }

    if (pages.length === 0 && options.title) {
      const fitsWithoutTitle = await measurer.fits([block], {
        title: options.title,
        cover: false,
        isOverflow: true,
      }, options.maxPageLength);
      if (fitsWithoutTitle) {
        pages.push([]);
        queue.unshift(block);
        continue;
      }
    }

    const split = await splitBlock(block, [], fits);
    if (split?.head) {
      pages.push([split.head]);
      if (split.tail) queue.unshift(split.tail);
      continue;
    }

    pages.push([{ ...block, oversize: true }]);
  }

  if (current.length) pages.push(current);
  return pages.length ? pages : [[]];
}

export function createMeasuredPaginationSession(options) {
  if (typeof document === "undefined") {
    return {
      paginate: async (blocks) => [blocks || []],
      destroy() {},
    };
  }

  const measurer = createMeasurementHost(options);
  return {
    paginate(blocks, pageOptions) {
      return paginateBlocks(
        blocks,
        { ...pageOptions, signal: options.signal },
        measurer,
      );
    },
    destroy: measurer.destroy,
  };
}
