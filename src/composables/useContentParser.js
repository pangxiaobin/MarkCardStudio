/**
 * useContentParser.js
 * Block-level Markdown parser for MarkCard Studio
 * Supports: paragraph, heading2, heading3, code-block, mermaid, table,
 *           blockquote, list, ordered-list, task-list, image, divider
 */

import hljs from "highlight.js/lib/core";
import langJavascript from "highlight.js/lib/languages/javascript";
import langTypeScript from "highlight.js/lib/languages/typescript";
import langPython from "highlight.js/lib/languages/python";
import langCss from "highlight.js/lib/languages/css";
import langXml from "highlight.js/lib/languages/xml";
import langBash from "highlight.js/lib/languages/bash";
import langJson from "highlight.js/lib/languages/json";
import langJava from "highlight.js/lib/languages/java";
import langRust from "highlight.js/lib/languages/rust";
import langSql from "highlight.js/lib/languages/sql";
import langMarkdown from "highlight.js/lib/languages/markdown";
import langGo from "highlight.js/lib/languages/go";
import langCpp from "highlight.js/lib/languages/cpp";
import katex from "katex";
import "katex/dist/katex.min.css";
import mermaid from "mermaid";
import { i18n } from "../i18n/index.js";

function t(key) {
  return i18n.global.t(key);
}

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "sans-serif",
  flowchart: {
    useMaxWidth: true,
    htmlLabels: false,
  },
});

hljs.registerLanguage("javascript", langJavascript);
hljs.registerLanguage("js", langJavascript);
hljs.registerLanguage("typescript", langTypeScript);
hljs.registerLanguage("ts", langTypeScript);
hljs.registerLanguage("python", langPython);
hljs.registerLanguage("py", langPython);
hljs.registerLanguage("css", langCss);
hljs.registerLanguage("html", langXml);
hljs.registerLanguage("xml", langXml);
hljs.registerLanguage("bash", langBash);
hljs.registerLanguage("sh", langBash);
hljs.registerLanguage("json", langJson);
hljs.registerLanguage("java", langJava);
hljs.registerLanguage("rust", langRust);
hljs.registerLanguage("rs", langRust);
hljs.registerLanguage("sql", langSql);
hljs.registerLanguage("markdown", langMarkdown);
hljs.registerLanguage("md", langMarkdown);
hljs.registerLanguage("go", langGo);
hljs.registerLanguage("cpp", langCpp);
hljs.registerLanguage("c", langCpp);

// ─── Height estimation constants ─────────────────────────────────────────────
const DEFAULT_CONTENT_WIDTH = 366;
const CODE_LINE_HEIGHT = 20;
const CODE_BLOCK_VERTICAL_SPACE = 40;
const LAYOUT_PROFILES = {
  landscape: {
    className: "card-layout-landscape",
    designWidth: 640,
    verticalReserve: 148,
    minContentHeight: 96,
    bodyGap: 8,
    paragraphLineHeight: 22,
    paragraphExtra: 6,
    listLineHeight: 21,
    listItemGap: 5,
    heading2Height: 36,
    heading3Height: 30,
    imageHeight: 156,
    mermaidHeight: 156,
    titleUnitWidth: 28,
  },
  square: {
    className: "card-layout-square",
    designWidth: 450,
    verticalReserve: 154,
    minContentHeight: 180,
    bodyGap: 8,
    paragraphLineHeight: 23,
    paragraphExtra: 6,
    listLineHeight: 22,
    listItemGap: 5,
    heading2Height: 40,
    heading3Height: 32,
    imageHeight: 196,
    mermaidHeight: 188,
    titleUnitWidth: 23,
  },
  portrait: {
    className: "card-layout-portrait",
    designWidth: 450,
    verticalReserve: 158,
    minContentHeight: 180,
    bodyGap: 10,
    paragraphLineHeight: 24,
    paragraphExtra: 8,
    listLineHeight: 22,
    listItemGap: 6,
    heading2Height: 46,
    heading3Height: 36,
    imageHeight: 236,
    mermaidHeight: 218,
    titleUnitWidth: 23,
  },
  tall: {
    className: "card-layout-tall",
    designWidth: 450,
    verticalReserve: 164,
    minContentHeight: 220,
    bodyGap: 10,
    paragraphLineHeight: 24,
    paragraphExtra: 8,
    listLineHeight: 22,
    listItemGap: 6,
    heading2Height: 46,
    heading3Height: 36,
    imageHeight: 236,
    mermaidHeight: 218,
    titleUnitWidth: 23,
  },
};

function resolveLayoutMetrics(layout = DEFAULT_CONTENT_WIDTH) {
  if (layout && typeof layout === "object" && Number.isFinite(layout.contentWidth)) {
    return layout;
  }

  const contentWidth = Number(layout) || DEFAULT_CONTENT_WIDTH;
  return {
    ...LAYOUT_PROFILES.portrait,
    contentWidth,
    textUnitsPerLine: Math.max(12, contentWidth / 14.08),
  };
}

function getVisualLength(text, latinWeight = 0.55) {
  return Array.from(String(text ?? "")).reduce(
    (length, char) => length + (/[⺀-鿿豈-﫿]/.test(char) ? 1.0 : latinWeight),
    0,
  );
}

function hasBalancedInlineMarkup(text) {
  const source = String(text ?? "").replace(/\\./g, "");
  const pairedMarkers = ["`", "**", "~~", "==", "$", "*", "_"];

  for (const marker of pairedMarkers) {
    const matches = source.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
    if ((matches?.length || 0) % 2 !== 0) return false;
  }

  return (source.match(/\[/g)?.length || 0) === (source.match(/\]/g)?.length || 0)
    && (source.match(/\(/g)?.length || 0) === (source.match(/\)/g)?.length || 0)
    && (source.match(/</g)?.length || 0) === (source.match(/>/g)?.length || 0);
}

function estimateTextLines(text, layout = DEFAULT_CONTENT_WIDTH) {
  if (!text) return 1;
  const metrics = resolveLayoutMetrics(layout);
  const visualLength = getVisualLength(text);
  return Math.max(1, Math.ceil(visualLength / metrics.textUnitsPerLine));
}

function getCodeColumnCapacity(contentWidth = DEFAULT_CONTENT_WIDTH) {
  const availableWidth = Math.max(80, contentWidth - 28);
  return Math.max(12, Math.floor(availableWidth / 7.5));
}

function estimateCodeLineCount(line, contentWidth = DEFAULT_CONTENT_WIDTH) {
  const columns = getCodeColumnCapacity(contentWidth);
  const expanded = String(line ?? "").replace(/\t/g, "  ");
  const units = Array.from(expanded).reduce(
    (length, char) => length + (/[⺀-鿿豈-﫿]/.test(char) ? 2 : 1),
    0,
  );
  return Math.max(1, Math.ceil(units / columns));
}

function splitCodeLineAtVisualUnits(line, maxUnits) {
  const chars = Array.from(String(line ?? ""));
  let usedUnits = 0;
  let splitIndex = 0;

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    const charUnits = char === "\t" ? 2 : /[⺀-鿿豈-﫿]/.test(char) ? 2 : 1;
    if (splitIndex > 0 && usedUnits + charUnits > maxUnits) break;
    usedUnits += charUnits;
    splitIndex = index + 1;
  }

  return [chars.slice(0, splitIndex).join(""), chars.slice(splitIndex).join("")];
}

function getTableMetrics(columnCount) {
  if (columnCount >= 7) {
    return { fontSize: 11, horizontalPadding: 8, lineHeight: 15, verticalPadding: 10, minHeight: 25 };
  }
  if (columnCount >= 5) {
    return { fontSize: 12, horizontalPadding: 14, lineHeight: 17, verticalPadding: 12, minHeight: 30 };
  }
  return { fontSize: 13.6, horizontalPadding: 24, lineHeight: 20, verticalPadding: 16, minHeight: 38 };
}

function estimateTableRowHeight(cells, columnCount, contentWidth = DEFAULT_CONTENT_WIDTH) {
  const metrics = getTableMetrics(columnCount);
  const cellWidth = Math.max(24, contentWidth / Math.max(1, columnCount));
  const visualUnitsPerLine = Math.max(
    2,
    (cellWidth - metrics.horizontalPadding) / metrics.fontSize,
  );
  const lines = Math.max(
    1,
    ...(cells || []).map((cell) => Math.ceil(getVisualLength(cell) / visualUnitsPerLine)),
  );
  return Math.max(metrics.minHeight, lines * metrics.lineHeight + metrics.verticalPadding);
}

export function estimateTitleHeight(title, layout = DEFAULT_CONTENT_WIDTH) {
  if (!title || !title.trim()) return 0;
  const metrics = resolveLayoutMetrics(layout);
  const visualLength = getVisualLength(title.trim());
  const unitsPerLine = Math.max(14, metrics.contentWidth / metrics.titleUnitWidth);
  const lines = Math.max(1, Math.ceil(visualLength / unitsPerLine));
  return lines * 32 + 24;
}

export function estimateBlockHeight(block, layout = DEFAULT_CONTENT_WIDTH) {
  const metrics = resolveLayoutMetrics(layout);
  const contentWidth = metrics.contentWidth;

  switch (block.type) {
    case "heading2": return metrics.heading2Height;
    case "heading3": return metrics.heading3Height;
    case "paragraph": return estimateTextLines(block.content, metrics) * metrics.paragraphLineHeight + metrics.paragraphExtra;
    case "blockquote":
      return (block.lines || []).reduce((h, line) => h + estimateTextLines(line, metrics) * metrics.paragraphLineHeight, 0) + 20;
    case "list": {
      const itemsH = (block.items || []).reduce(
        (height, item) => height + estimateTextLines(typeof item === "string" ? item : (item?.text || ""), metrics) * metrics.listLineHeight + metrics.listItemGap,
        0,
      );
      return Math.max(28, itemsH + 10);
    }
    case "ordered-list": {
      const itemsH = (block.items || []).reduce(
        (height, item) => height + estimateTextLines(typeof item === "string" ? item : (item?.text || ""), metrics) * metrics.listLineHeight + metrics.listItemGap,
        0,
      );
      return Math.max(28, itemsH + 10);
    }
    case "task-list": {
      const itemsH = (block.items || []).reduce(
        (height, item) => height + estimateTextLines(item?.text || "", metrics) * metrics.listLineHeight + metrics.listItemGap,
        0,
      );
      return Math.max(28, itemsH + 10);
    }
    case "code-block": {
      const lines = block.lines?.length ? block.lines : [""];
      const visualLines = lines.reduce(
        (total, line) => total + estimateCodeLineCount(line, contentWidth),
        0,
      );
      return visualLines * CODE_LINE_HEIGHT + CODE_BLOCK_VERTICAL_SPACE;
    }
    // Mermaid is fitted into a 180px-high static viewport plus wrapper space.
    case "mermaid": return metrics.mermaidHeight;
    case "table": {
      const columnCount = Math.max(
        1,
        block.headers?.length || 0,
        ...(block.rows || []).map((row) => row?.length || 0),
      );
      const headerHeight = estimateTableRowHeight(block.headers || [], columnCount, contentWidth);
      const rowsHeight = (block.rows || []).reduce(
        (height, row) => height + estimateTableRowHeight(row, columnCount, contentWidth),
        0,
      );
      return headerHeight + rowsHeight + 18;
    }
    // Includes the image wrapper's vertical margins and its 200px max-height.
    case "image": return metrics.imageHeight;
    case "divider": return 24;
    case "callout": return estimateTextLines((block.title || "") + (block.content || ""), metrics) * metrics.listLineHeight + 28;
    default: return 28;
  }
}

/**
 * Max estimated usable content height in px (at 450px base portrait width).
 */
export const CARD_CONTENT_HEIGHT = 360;

export function getCardLayoutMetrics(platformWidth, platformHeight) {
  const width = Number(platformWidth) || 1080;
  const height = Number(platformHeight) || 1440;
  const aspectRatio = width / height;
  const kind = aspectRatio > 1
    ? "landscape"
    : aspectRatio >= 0.9
      ? "square"
      : aspectRatio >= 0.68
        ? "portrait"
        : "tall";
  const profile = LAYOUT_PROFILES[kind];
  const designHeight = Math.round(profile.designWidth * (height / width));
  const contentWidth = Math.max(220, profile.designWidth - 88);

  return {
    ...profile,
    kind,
    designHeight,
    contentWidth,
    contentHeight: Math.max(profile.minContentHeight, designHeight - profile.verticalReserve),
    textUnitsPerLine: Math.max(12, contentWidth / 14.08),
  };
}

export function getCardLayoutClass(platformWidth, platformHeight) {
  return getCardLayoutMetrics(platformWidth, platformHeight).className;
}

/**
 * Calculate usable body height for the selected platform at the same design
 * viewport used by preview/export. Each aspect-ratio profile reserves the
 * exact poster chrome and card padding used by both render paths.
 */
export function getCardContentHeight(platformWidth, platformHeight) {
  return getCardLayoutMetrics(platformWidth, platformHeight).contentHeight;
}

export function getCardContentWidth(platformWidth, platformHeight) {
  return getCardLayoutMetrics(platformWidth, platformHeight).contentWidth;
}

/**
 * Split block array into pages such that each page's estimated height ≤ maxHeight.
 * Supports partial list splitting to eliminate large blank spaces, and binds intro prompts to lists.
 */
function splitParagraphContent(text, availableHeight, layout) {
  const metrics = resolveLayoutMetrics(layout);
  const maxLines = Math.floor(
    (availableHeight - metrics.paragraphExtra) / metrics.paragraphLineHeight,
  );
  const totalLines = estimateTextLines(text, metrics);
  if (!text || maxLines < 2 || totalLines <= maxLines) {
    return { part1: text, part2: "" };
  }
  const maxVisualUnits = maxLines * metrics.textUnitsPerLine;

  const chars = Array.from(text);
  let units = 0;
  let splitIndex = 0;

  for (let i = 0; i < chars.length; i++) {
    const charUnit = /[⺀-鿿豈-﫿]/.test(chars[i]) ? 1.0 : 0.55;
    if (units + charUnit > maxVisualUnits) {
      break;
    }
    units += charUnit;
    splitIndex = i + 1;
  }

  if (splitIndex <= 0 || splitIndex >= chars.length) {
    return { part1: text, part2: "" };
  }

  const puncRegex = /[。！？；，、.!?;,\s]/;
  let bestSplit = 0;
  const earliestSplit = Math.max(0, splitIndex - Math.ceil(metrics.textUnitsPerLine));
  for (let k = splitIndex - 1; k >= earliestSplit; k--) {
    if (puncRegex.test(chars[k] || "")) {
      const candidate = k + 1;
      if (!hasBalancedInlineMarkup(chars.slice(0, candidate).join(""))) continue;
      if (!hasBalancedInlineMarkup(chars.slice(candidate).join(""))) continue;
      bestSplit = candidate;
      break;
    }
  }

  if (!bestSplit) {
    const hasInlineSyntax = /[`*_[\]()~=$<>]/.test(text);
    if (hasInlineSyntax) return { part1: text, part2: "" };
    bestSplit = splitIndex;
  }

  const part1 = chars.slice(0, bestSplit).join("").trim();
  const part2 = chars.slice(bestSplit).join("").trim();

  if (part1 && part2) {
    return { part1, part2 };
  }
  return { part1: text, part2: "" };
}

/**
 * Split block array into pages such that each page's estimated height ≤ maxHeight.
 * Preserves 100% strict sequential order of all blocks in the document.
 */
function splitCodeBlockForHeight(block, availableHeight, contentWidth) {
  const sourceLines = block.lines?.length ? block.lines : [""];
  let usedHeight = CODE_BLOCK_VERTICAL_SPACE;
  let splitIndex = 0;

  for (let index = 0; index < sourceLines.length; index += 1) {
    const lineHeight = estimateCodeLineCount(sourceLines[index], contentWidth) * CODE_LINE_HEIGHT;
    if (splitIndex > 0 && usedHeight + lineHeight > availableHeight) break;
    if (splitIndex === 0 && usedHeight + lineHeight > availableHeight) {
      const availableLines = Math.floor(
        (availableHeight - CODE_BLOCK_VERTICAL_SPACE) / CODE_LINE_HEIGHT,
      );
      if (availableLines < 1) return null;

      const [headLine, tailLine] = splitCodeLineAtVisualUnits(
        sourceLines[index],
        availableLines * getCodeColumnCapacity(contentWidth),
      );
      if (!headLine || !tailLine) return null;

      return {
        head: { ...block, lines: [headLine], raw: headLine },
        tail: {
          ...block,
          lines: [tailLine, ...sourceLines.slice(index + 1)],
          raw: [tailLine, ...sourceLines.slice(index + 1)].join("\n"),
        },
      };
    }
    usedHeight += lineHeight;
    splitIndex = index + 1;
  }

  if (splitIndex <= 0) return null;
  if (splitIndex >= sourceLines.length) return { head: block, tail: null };

  const headLines = sourceLines.slice(0, splitIndex);
  const tailLines = sourceLines.slice(splitIndex);
  return {
    head: { ...block, lines: headLines, raw: headLines.join("\n") },
    tail: { ...block, lines: tailLines, raw: tailLines.join("\n") },
  };
}

function splitTableForHeight(block, availableHeight, contentWidth) {
  const rows = block.rows || [];
  if (!rows.length) return null;

  const columnCount = Math.max(
    1,
    block.headers?.length || 0,
    ...rows.map((row) => row?.length || 0),
  );
  let usedHeight = estimateTableRowHeight(block.headers || [], columnCount, contentWidth) + 18;
  let splitIndex = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const rowHeight = estimateTableRowHeight(rows[index], columnCount, contentWidth);
    if (splitIndex > 0 && usedHeight + rowHeight > availableHeight) break;
    if (splitIndex === 0 && usedHeight + rowHeight > availableHeight) return null;
    usedHeight += rowHeight;
    splitIndex = index + 1;
  }

  if (splitIndex <= 0) return null;
  if (splitIndex >= rows.length) return { head: block, tail: null };

  return {
    head: { ...block, rows: rows.slice(0, splitIndex) },
    tail: { ...block, rows: rows.slice(splitIndex) },
  };
}

function splitStaticBlockForHeight(block, availableHeight, contentWidth) {
  if (block.type === "code-block") {
    return splitCodeBlockForHeight(block, availableHeight, contentWidth);
  }
  if (block.type === "table") {
    return splitTableForHeight(block, availableHeight, contentWidth);
  }
  return null;
}

export function splitBlocksIntoPages(
  blocks,
  firstPageMaxHeight = CARD_CONTENT_HEIGHT,
  overflowMaxHeight = CARD_CONTENT_HEIGHT,
  layout = DEFAULT_CONTENT_WIDTH,
) {
  if (!blocks || !blocks.length) return [[]];
  const metrics = resolveLayoutMetrics(layout);
  const contentWidth = metrics.contentWidth;
  const pages = [];
  const queue = [...blocks];
  let current = [];
  let currentHeight = 0;

  while (queue.length) {
    const block = queue.shift();
    const isFirstPage = pages.length === 0;
    const maxHeight = isFirstPage ? firstPageMaxHeight : overflowMaxHeight;
    const bh = estimateBlockHeight(block, metrics);
    const blockGap = current.length ? metrics.bodyGap : 0;

    // If block fits on current page
    if (currentHeight + blockGap + bh <= maxHeight) {
      current.push(block);
      currentHeight += blockGap + bh;
      continue;
    }

    // Block does not fit on current page.
    const remainingSpace = maxHeight - currentHeight - blockGap;

    // A title can leave less room on the first page than subsequent pages.
    // Preserve a title-only first page when the whole first block fits normally
    // on an overflow page instead of clipping or needlessly fragmenting it.
    if (
      isFirstPage &&
      current.length === 0 &&
      firstPageMaxHeight < overflowMaxHeight &&
      bh <= overflowMaxHeight
    ) {
      pages.push([]);
      queue.unshift(block);
      continue;
    }

    // Static cards cannot scroll. Use the current page's remaining space first,
    // then repeat the language badge or table header on continuation pages.
    if (block.type === "code-block" || block.type === "table") {
      const split = splitStaticBlockForHeight(block, remainingSpace, contentWidth);
      if (split?.head) {
        current.push(split.head);
        currentHeight += blockGap + estimateBlockHeight(split.head, metrics);
        if (split.tail) {
          pages.push(current);
          current = [];
          currentHeight = 0;
          queue.unshift(split.tail);
        }
        continue;
      }
    }

    if (block.type === "paragraph") {
      const { part1, part2 } = splitParagraphContent(block.content, remainingSpace, metrics);
      if (part1 && part2) {
        current.push({ ...block, content: part1 });
        pages.push(current);
        current = [];
        currentHeight = 0;
        queue.unshift({ ...block, content: part2 });
        continue;
      }
    }

    // Strategy 1: Try splitting multi-item list if current page has remaining space for at least 1 item
    if (
      (block.type === "ordered-list" || block.type === "list" || block.type === "task-list") &&
      Array.isArray(block.items) &&
      block.items.length > 1 &&
      remainingSpace >= 28
    ) {
      const subList1Items = [];
      let itemsH = 10;

      for (let itemIndex = 0; itemIndex < block.items.length; itemIndex += 1) {
        const item = block.items[itemIndex];
        const itemText = typeof item === "string" ? item : (item?.text || "");
        const itemHeight = estimateTextLines(itemText, metrics) * metrics.listLineHeight + metrics.listItemGap;
        if (itemsH + itemHeight <= remainingSpace) {
          subList1Items.push(item);
          itemsH += itemHeight;
        } else {
          break;
        }
      }

      const subList2Items = block.items.slice(subList1Items.length);

      if (subList1Items.length > 0 && subList2Items.length > 0) {
        const startIdx = block.startIndex || 0;
        current.push({ ...block, items: subList1Items, startIndex: startIdx });
        pages.push(current);
        current = [];
        currentHeight = 0;

        const remainingBlock = {
          ...block,
          items: subList2Items,
          startIndex: startIdx + subList1Items.length,
        };
        queue.unshift(remainingBlock);
        continue;
      }
    }

    // Strategy 2: If no list items fit on current page, check if last block on current page is an intro prompt (ending with ":" or "：")
    if (current.length > 1) {
      const lastBlock = current[current.length - 1];
      if (
        lastBlock &&
        (lastBlock.type === "paragraph" || lastBlock.type.startsWith("heading")) &&
        typeof lastBlock.content === "string" &&
        /[：:]\s*$/.test(lastBlock.content.trim())
      ) {
        current.pop();
        pages.push(current);

        current = [lastBlock];
        currentHeight = estimateBlockHeight(lastBlock, metrics);
        queue.unshift(block);
        continue;
      }
    }

    // Default: Close current page and start next page with this block
    if (current.length) {
      pages.push(current);
      current = [];
      currentHeight = 0;
      queue.unshift(block);
      continue;
    }

    // A single unbreakable row or source line can still exceed a card. Keep it
    // visible and let CSS wrap it instead of entering a pagination loop.
    current.push(block);
    currentHeight = bh;
  }

  if (current.length) pages.push(current);
  return pages;
}

// ─── HTML escape ──────────────────────────────────────────────────────────────
function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Inline formatting with KaTeX & Rich Syntaxes ──────────────────────────────
export function formatInline(text) {
  if (!text) return "";

  // Replace block math $$...$$
  let html = text.replace(/\$\$(.*?)\$\$/g, (_, expr) => {
    try {
      return `<div class="katex-display-block my-2 overflow-hidden py-1 text-center">${katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false, output: "html" })}</div>`;
    } catch (_) {
      return `<div class="math-fallback font-mono text-center my-1">${escapeHtml(expr)}</div>`;
    }
  });

  // Replace inline math $...$
  html = html.replace(/\$([^\$]+)\$/g, (_, expr) => {
    try {
      return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false, output: "html" });
    } catch (_) {
      return `<code class="math-inline font-mono">${escapeHtml(expr)}</code>`;
    }
  });

  html = escapeHtmlExceptKatex(html);

  // Footnotes superscript [^1]
  html = html.replace(/\[\^(\d+)\]/g, `<sup class="card-footnote-sup">[$1]</sup>`);

  // Subscript ~sub~ & Superscript ^sup^
  html = html.replace(/\^([^\^]+)\^/g, "<sup>$1</sup>");
  html = html.replace(/~([^~]+)~/g, "<sub>$1</sub>");

  // Keyboard <kbd>Key</kbd>
  html = html.replace(/&lt;kbd&gt;(.*?)&lt;\/kbd&gt;/gi, "<kbd class='card-kbd'>$1</kbd>");

  // Markdown Links [Text](URL)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="card-inline-link">$1 ↗</a>');

  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code class='inline-code'>$1</code>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/==([^=]+)==/g, "<mark>$1</mark>");
  html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return html;
}

function escapeHtmlExceptKatex(html) {
  if (html.includes("class=\"katex\"") || html.includes("class=\"katex-display-block\"")) {
    return html;
  }
  return escapeHtml(html);
}

// ─── Syntax highlighting ──────────────────────────────────────────────────────
function highlightCode(code, lang) {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    } catch (_) { /* fall through */ }
  }
  try {
    return hljs.highlightAuto(code).value;
  } catch (_) {
    return escapeHtml(code);
  }
}

// ─── Block parser ─────────────────────────────────────────────────────────────
export function parseBlocks(input) {
  let lines;
  if (Array.isArray(input)) {
    lines = input;
  } else {
    lines = String(input ?? "").split("\n");
  }

  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const trimmed = raw.trim();

    if (!trimmed) { i++; continue; }

    // ── Code block & Mermaid ────────────────────────────────────────────────
    if (/^```/.test(trimmed)) {
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test((lines[i] ?? "").trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      if (lang.toLowerCase() === "mermaid" || lang.toLowerCase() === "diagram") {
        blocks.push({ type: "mermaid", raw: codeLines.join("\n") });
      } else {
        blocks.push({ type: "code-block", lang, lines: codeLines, raw: codeLines.join("\n") });
      }
      continue;
    }

    // ── Callout Box (::: tip / ::: warning) ──────────────────────────────────
    if (/^:::\s*(tip|warning|info|danger|note)\b/i.test(trimmed)) {
      const match = trimmed.match(/^:::\s*(tip|warning|info|danger|note)\s*(.*)$/i);
      const kind = (match[1] || "tip").toLowerCase();
      const title = match[2] || t(`content.${["tip", "warning", "danger"].includes(kind) ? kind : "info"}`);
      const contentLines = [];
      i++;
      while (i < lines.length && !/^:::\s*$/.test((lines[i] ?? "").trim())) {
        contentLines.push(lines[i]);
        i++;
      }
      i++; // skip closing :::
      blocks.push({ type: "callout", kind, title, content: contentLines.join(" ") });
      continue;
    }

    // ── Table ───────────────────────────────────────────────────────────────
    if (trimmed.startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("|")) {
        tableLines.push((lines[i] ?? "").trim());
        i++;
      }
      const dataRows = tableLines.filter((l) => !/^\|[-:\s|]+\|$/.test(l));
      const rows = dataRows.map((l) =>
        l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
      );
      if (rows.length >= 1) {
        blocks.push({ type: "table", headers: rows[0], rows: rows.slice(1) });
      }
      continue;
    }

    // ── Blockquote ──────────────────────────────────────────────────────────
    if (/^>\s*/.test(trimmed)) {
      const quoteLines = [];
      while (i < lines.length && /^>\s*/.test((lines[i] ?? "").trim())) {
        quoteLines.push((lines[i] ?? "").trim().replace(/^>\s*/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", content: quoteLines.join(" "), lines: quoteLines });
      continue;
    }

    // ── Heading 3 ───────────────────────────────────────────────────────────
    if (/^###\s+/.test(trimmed)) {
      blocks.push({ type: "heading3", content: trimmed.replace(/^###\s+/, "") });
      i++; continue;
    }

    // ── Heading 2 ───────────────────────────────────────────────────────────
    if (/^##\s+/.test(trimmed)) {
      blocks.push({ type: "heading2", content: trimmed.replace(/^##\s+/, "") });
      i++; continue;
    }

    // ── Task list (- [x] or - [ ]) ──────────────────────────────────────────
    if (/^[-*]\s+\[([ xX])\]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+\[([ xX])\]\s+/.test((lines[i] ?? "").trim())) {
        const lineStr = (lines[i] ?? "").trim();
        const match = lineStr.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
        if (match) {
          items.push({ checked: match[1].toLowerCase() === "x", text: match[2] });
        }
        i++;
      }
      blocks.push({ type: "task-list", items });
      continue;
    }

    // ── Unordered list ──────────────────────────────────────────────────────
    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test((lines[i] ?? "").trim()) && !/^[-*]\s+\[([ xX])\]\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      if (items.length > 0) {
        blocks.push({ type: "list", items });
      }
      continue;
    }

    // ── Ordered list ────────────────────────────────────────────────────────
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    // ── Standalone image ────────────────────────────────────────────────────
    if (/^!\[([^\]]*)\]\(([^)]+)\)/.test(trimmed)) {
      const match = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      blocks.push({ type: "image", alt: match[1], src: match[2] });
      i++; continue;
    }

    // ── Divider ─────────────────────────────────────────────────────────────
    if (/^---+$|^\*\*\*+$/.test(trimmed)) {
      blocks.push({ type: "divider" });
      i++; continue;
    }

    // ── Paragraph ───────────────────────────────────────────────────────────
    blocks.push({ type: "paragraph", content: trimmed });
    i++;
  }

  return blocks;
}

export function blocksToPreviewText(blocks) {
  return (blocks || [])
    .slice(0, 4)
    .map((b) => {
      if (b.type === "paragraph") return b.content;
      if (b.type === "heading2" || b.type === "heading3") return b.content;
      if (b.type === "list") return b.items?.slice(0, 2).join(" · ");
      if (b.type === "task-list") return b.items?.slice(0, 2).map(i => i.text).join(" · ");
      if (b.type === "ordered-list") return b.items?.slice(0, 2).join(" · ");
      if (b.type === "blockquote") return b.content;
      if (b.type === "code-block") return `[${b.lang || t("content.code")}]`;
      if (b.type === "mermaid") return `[${t("content.flowchart")}]`;
      if (b.type === "table") return `[${t("content.table")}]`;
      if (b.type === "image") return `[${t("content.image")}]`;
      return "";
    })
    .filter(Boolean);
}

// ─── Block → HTML ─────────────────────────────────────────────────────────────
export function renderBlockToHtml(block) {
  switch (block.type) {
    case "heading2":
      return `<h2 class="card-h2">${formatInline(block.content)}</h2>`;

    case "heading3":
      return `<h3 class="card-h3">${formatInline(block.content)}</h3>`;

    case "code-block": {
      const highlighted = highlightCode(block.raw, block.lang);
      const badge = block.lang
        ? `<span class="code-lang-badge">${escapeHtml(block.lang)}</span>`
        : "";
      return `<div class="card-code-block">${badge}<pre class="hljs"><code>${highlighted}</code></pre></div>`;
    }

    case "mermaid": {
      return `<div class="mermaid-raw-box my-2.5 flex justify-center items-center overflow-hidden p-2 bg-slate-50/70 dark:bg-slate-900/70 rounded-xl border border-slate-200/80 dark:border-slate-800"><div class="mermaid-raw" data-code="${escapeHtml(block.raw)}">${escapeHtml(block.raw)}</div></div>`;
    }

    case "callout": {
      const icon = block.kind === "tip" ? "💡" : block.kind === "warning" ? "⚠️" : block.kind === "danger" ? "🚨" : "ℹ️";
      return `<div class="card-callout callout-${block.kind} my-2.5 p-3 rounded-xl border flex flex-col gap-1"><div class="flex items-center gap-1.5 font-bold text-xs"><span>${icon}</span><span>${formatInline(block.title)}</span></div><div class="text-xs leading-relaxed opacity-90">${formatInline(block.content)}</div></div>`;
    }

    case "table": {
      const columnCount = Math.max(
        block.headers?.length || 0,
        ...(block.rows || []).map((row) => row?.length || 0),
      );
      const densityClass = columnCount >= 7
        ? " card-table--compact"
        : columnCount >= 5
          ? " card-table--dense"
          : "";
      const headers = (block.headers || []).map((h) => `<th>${formatInline(h)}</th>`).join("");
      const bodyRows = (block.rows || [])
        .map((row) => `<tr>${(row || []).map((c) => `<td>${formatInline(c)}</td>`).join("")}</tr>`)
        .join("");
      return `<div class="card-table-wrap"><table class="card-table${densityClass}"><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
    }

    case "blockquote": {
      const inner = (block.lines || [block.content || ""])
        .map((l) => `<p>${formatInline(l)}</p>`)
        .join("");
      return `<blockquote class="card-blockquote">${inner}</blockquote>`;
    }

    case "task-list": {
      const items = (block.items || [])
        .map((item) => {
          const icon = item.checked ? `<span class="task-badge checked">✓</span>` : `<span class="task-badge unchecked"></span>`;
          const textStyle = item.checked ? `line-through opacity-70` : ``;
          return `<li class="card-task-item flex items-center gap-2 py-0.5"><span class="task-check-box">${icon}</span><span class="${textStyle}">${formatInline(item.text)}</span></li>`;
        })
        .join("");
      return `<ul class="card-task-list my-2 flex flex-col gap-1.5">${items}</ul>`;
    }

    case "list": {
      const items = (block.items || [])
        .map((item) => `<li><span class="list-dot"></span><span>${formatInline(item)}</span></li>`)
        .join("");
      return `<ul class="card-list">${items}</ul>`;
    }

    case "ordered-list": {
      const startIdx = block.startIndex || 0;
      const items = (block.items || [])
        .map((item, idx) => {
          const numStr = String(startIdx + idx + 1).padStart(2, "0");
          return `<li class="card-ordered-item flex items-start gap-2.5 py-0.5"><span class="list-num-badge shrink-0">${numStr}</span><span class="flex-1 min-w-0">${formatInline(item)}</span></li>`;
        })
        .join("");
      return `<ol class="card-ordered-list my-2 flex flex-col gap-2">${items}</ol>`;
    }

    case "image":
      return `<div class="card-image-wrap"><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" class="card-image" loading="eager" /></div>`;

    case "divider":
      return `<hr class="card-divider" />`;

    case "paragraph":
    default:
      return `<p class="card-paragraph">${formatInline(block.content ?? "")}</p>`;
  }
}

export function renderBlocksToHtml(blocks) {
  return (blocks || []).map(renderBlockToHtml).join("\n");
}

/**
 * Asynchronous Mermaid SVG renderer for DOM containers
 */
export async function renderMermaidDiagrams(container) {
  if (!container) return;
  const rawNodes = Array.from(container.querySelectorAll(".mermaid-raw"));
  for (const node of rawNodes) {
    const rawCode = node.getAttribute("data-code") || node.textContent;
    if (!rawCode || node.getAttribute("data-processed") === "true") continue;
    try {
      node.setAttribute("data-processed", "true");
      const id = `mermaid-svg-${Math.random().toString(36).slice(2, 9)}`;
      const { svg } = await mermaid.render(id, rawCode.trim());
      const wrapper = node.closest(".mermaid-raw-box");
      if (wrapper) {
        wrapper.innerHTML = svg;
        fitMermaidSvg(wrapper);
      } else {
        node.outerHTML = svg;
      }
    } catch (err) {
      console.warn("Mermaid render error:", err);
    }
  }
}

function fitMermaidSvg(wrapper) {
  const svg = wrapper.querySelector("svg");
  if (!svg) return;

  const viewBox = svg.viewBox?.baseVal;
  const sourceWidth = viewBox?.width || Number.parseFloat(svg.getAttribute("width")) || 1;
  const sourceHeight = viewBox?.height || Number.parseFloat(svg.getAttribute("height")) || 1;
  const availableWidth = Math.max(1, wrapper.clientWidth - 16);
  const maxHeight = 180;
  const scale = Math.min(availableWidth / sourceWidth, maxHeight / sourceHeight);
  const displayWidth = Math.max(1, Math.round(sourceWidth * scale));
  const displayHeight = Math.max(1, Math.round(sourceHeight * scale));

  svg.setAttribute("width", String(displayWidth));
  svg.setAttribute("height", String(displayHeight));
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.classList.add("mermaid-diagram");
  svg.style.width = `${displayWidth}px`;
  svg.style.height = "auto";
  svg.style.aspectRatio = `${sourceWidth} / ${sourceHeight}`;
  svg.style.maxWidth = "100%";
  svg.style.maxHeight = `${maxHeight}px`;
  svg.style.display = "block";
  wrapper.style.overflow = "hidden";
}
