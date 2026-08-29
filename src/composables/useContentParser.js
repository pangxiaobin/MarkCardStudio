/**
 * useContentParser.js
 * Block-level Markdown parser for MarkCard Studio
 * Supports: paragraph, heading2, heading3, code-block, mermaid, table,
 *           blockquote, list, ordered-list, task-list, image, html, divider
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
import * as echarts from "echarts";
import MarkdownIt from "markdown-it";
import markdownItContainer from "markdown-it-container";
import markdownItFootnote from "markdown-it-footnote";
import markdownItTaskLists from "markdown-it-task-lists";
import { i18n } from "../i18n/index.js";

function t(key) {
  return i18n.global.t(key);
}

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "strict",
  fontFamily: "sans-serif",
  flowchart: {
    useMaxWidth: true,
    htmlLabels: false,
  },
});

const markdownParser = MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
});

markdownParser
  .use(markdownItFootnote)
  .use(markdownItTaskLists);

for (const kind of ["tip", "warning", "info", "danger", "note"]) {
  markdownParser.use(markdownItContainer, kind);
}

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

export function getCardLayoutClass(platformWidth, platformHeight) {
  const width = Number(platformWidth) || 1080;
  const height = Number(platformHeight) || 1440;
  const aspectRatio = width / height;
  if (aspectRatio > 1) return "card-layout-landscape";
  if (aspectRatio >= 0.9) return "card-layout-square";
  if (aspectRatio >= 0.68) return "card-layout-portrait";
  return "card-layout-tall";
}

// ─── HTML escape ──────────────────────────────────────────────────────────────
function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SAFE_HTML_TAGS = new Set([
  "a", "abbr", "b", "blockquote", "br", "code", "del", "div", "em", "i", "img",
  "li", "mark", "ol", "p", "pre", "q", "s", "small", "span", "strong", "sub", "sup",
  "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul",
]);
const SAFE_HTML_ATTRIBUTES = new Set([
  "alt", "align", "class", "colspan", "height", "href", "name", "rel", "rowspan",
  "src", "target", "title", "width",
]);
const VOID_HTML_TAGS = new Set(["br", "img"]);

function sanitizeHtmlUrl(value, allowDataImage = false) {
  const normalized = String(value || "").trim().replace(/&amp;/g, "&");
  if (!normalized) return "";
  if (/^(#|\/|https?:|mailto:)/i.test(normalized)) return normalized;
  if (allowDataImage && /^data:image\/(gif|png|jpe?g|webp);base64,/i.test(normalized)) return normalized;
  return "";
}

function sanitizeHtmlTag(tagSource) {
  const match = String(tagSource || "").match(/^<\s*(\/?)\s*([a-z][\w:-]*)([\s\S]*?)>$/i);
  if (!match) return "";
  const closing = Boolean(match[1]);
  const tagName = match[2].toLowerCase();
  if (!SAFE_HTML_TAGS.has(tagName)) return "";
  if (closing) return `</${tagName}>`;

  const attributes = [];
  const rawAttributes = match[3].replace(/\/\s*$/, "");
  const attributePattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let attributeMatch;
  while ((attributeMatch = attributePattern.exec(rawAttributes))) {
    const name = attributeMatch[1].toLowerCase();
    if (!SAFE_HTML_ATTRIBUTES.has(name)) continue;
    const value = attributeMatch[2] ?? attributeMatch[3] ?? attributeMatch[4];
    if (value === undefined) {
      if (["name"].includes(name)) attributes.push(name);
      continue;
    }
    if (name === "href" || name === "src") {
      const safeUrl = sanitizeHtmlUrl(value, name === "src");
      if (!safeUrl) continue;
      attributes.push(`${name}="${escapeHtml(safeUrl)}"`);
      continue;
    }
    attributes.push(`${name}="${escapeHtml(value)}"`);
  }

  const suffix = VOID_HTML_TAGS.has(tagName) ? " /" : "";
  return `<${tagName}${attributes.length ? ` ${attributes.join(" ")}` : ""}${suffix}>`;
}

function sanitizeHtmlFragment(source) {
  return String(source || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?[a-z][\w:-]*[\s\S]*?>/gi, (tag) => sanitizeHtmlTag(tag) || escapeHtml(tag));
}

// ─── Inline formatting with KaTeX & Rich Syntaxes ──────────────────────────────
export function formatInline(text) {
  if (!text) return "";
  const mathFragments = [];
  const htmlFragments = [];
  const storeMath = (expr, displayMode) => {
    let rendered;
    try {
      const katexHtml = katex.renderToString(expr.trim(), {
        displayMode,
        throwOnError: false,
        output: "html",
      });
      rendered = displayMode
        ? `<div class="katex-display-block my-2 overflow-hidden py-1 text-center">${katexHtml}</div>`
        : katexHtml;
    } catch (_) {
      rendered = displayMode
        ? `<div class="math-fallback my-1 text-center font-mono">${escapeHtml(expr)}</div>`
        : `<code class="math-inline font-mono">${escapeHtml(expr)}</code>`;
    }
    const token = `MCARDMATHTOKEN${mathFragments.length}END`;
    mathFragments.push(rendered);
    return token;
  };

  let html = String(text)
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, expr) => storeMath(expr, true))
    .replace(/\$([^\n$]+)\$/g, (_, expr) => storeMath(expr, false));

  html = html.replace(/<\/?[a-z][\w:-]*[\s\S]*?>/gi, (tag) => {
    const sanitized = sanitizeHtmlTag(tag);
    if (!sanitized) return tag;
    const token = `MCARDHTMLTOKEN${htmlFragments.length}END`;
    htmlFragments.push(sanitized);
    return token;
  });

  html = escapeHtml(html);

  // Footnotes superscript [^1]
  html = html.replace(/\[\^(\d+)\]/g, `<sup class="card-footnote-sup">[$1]</sup>`);

  // Subscript ~sub~ & Superscript ^sup^
  html = html.replace(/\^([^\^]+)\^/g, "<sup>$1</sup>");
  html = html.replace(/~([^~]+)~/g, "<sub>$1</sub>");

  // Keyboard <kbd>Key</kbd>
  html = html.replace(/&lt;kbd&gt;(.*?)&lt;\/kbd&gt;/gi, "<kbd class='card-kbd'>$1</kbd>");

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const safeHref = sanitizeLinkHref(href);
    return safeHref
      ? `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="card-inline-link">${label} ↗</a>`
      : label;
  });

  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code class='inline-code'>$1</code>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/==([^=]+)==/g, "<mark>$1</mark>");
  html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  mathFragments.forEach((fragment, index) => {
    html = html.replace(`MCARDMATHTOKEN${index}END`, fragment);
  });
  htmlFragments.forEach((fragment, index) => {
    html = html.replaceAll(`MCARDHTMLTOKEN${index}END`, fragment);
  });
  return html;
}

function sanitizeLinkHref(href) {
  const value = String(href || "").trim().replace(/&amp;/g, "&");
  if (!value) return "";
  if (/^(#|\/)/.test(value)) return escapeHtml(value);
  try {
    const url = new URL(value);
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) return "";
    return escapeHtml(url.href);
  } catch (_) {
    return "";
  }
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
function inlineTokenText(token) {
  if (!token) return "";
  return String(token.content || "").trim();
}

function findClosingToken(tokens, startIndex, openType, closeType) {
  let depth = 0;
  for (let index = startIndex; index < tokens.length; index += 1) {
    if (tokens[index].type === openType) depth += 1;
    if (tokens[index].type === closeType) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return tokens.length - 1;
}

function parseListTokens(tokens, startIndex) {
  const openToken = tokens[startIndex];
  const closeType = openToken.type.replace("_open", "_close");
  const endIndex = findClosingToken(tokens, startIndex, openToken.type, closeType);
  const items = [];
  const images = [];
  let imageOffset = 0;

  for (let index = startIndex + 1; index < endIndex; index += 1) {
    if (tokens[index].type !== "list_item_open") continue;
    const itemEnd = findClosingToken(tokens, index, "list_item_open", "list_item_close");
    const inlineTokens = tokens.slice(index + 1, itemEnd).filter((token) => token.type === "inline");
    const parsed = collectInlineParts(inlineTokens, imageOffset);
    const text = parsed.text;
    images.push(...parsed.images);
    imageOffset += parsed.images.length;
    const taskInput = inlineTokens
      .flatMap((token) => token.children || [])
      .find((child) => child.type === "html_inline" && child.content.includes("task-list-item-checkbox"));
    items.push({
      text,
      images: parsed.images,
      isTask: Boolean(taskInput),
      checked: Boolean(taskInput?.content.includes("checked")),
    });
    index = itemEnd;
  }

  const isTaskList = items.length > 0 && items.every((item) => item.isTask);
  if (isTaskList) {
    return {
      block: {
        type: "task-list",
        items: items.map((item) => ({ checked: item.checked, text: item.text, images: item.images })),
        images,
      },
      endIndex,
    };
  }

  const ordered = openToken.type === "ordered_list_open";
  const start = Number.parseInt(openToken.attrGet("start") || "1", 10);
  return {
    block: {
      type: ordered ? "ordered-list" : "list",
      items: items.map((item) => ({ text: item.text, images: item.images })),
      images,
      ...(ordered ? { startIndex: Math.max(0, start - 1) } : {}),
    },
    endIndex,
  };
}

function parseTableTokens(tokens, startIndex) {
  const endIndex = findClosingToken(tokens, startIndex, "table_open", "table_close");
  const headers = [];
  const rows = [];
  let currentRow = null;
  let inHeader = false;
  const images = [];
  let imageOffset = 0;

  for (let index = startIndex + 1; index < endIndex; index += 1) {
    const token = tokens[index];
    if (token.type === "thead_open") inHeader = true;
    if (token.type === "thead_close") inHeader = false;
    if (token.type === "tr_open") currentRow = [];
    if ((token.type === "th_open" || token.type === "td_open") && tokens[index + 1]?.type === "inline") {
      const parsed = parseInlineToken(tokens[index + 1], imageOffset);
      currentRow?.push({ text: parsed.text, images: parsed.images });
      images.push(...parsed.images);
      imageOffset += parsed.images.length;
    }
    if (token.type === "tr_close" && currentRow) {
      if (inHeader && headers.length === 0) headers.push(...currentRow);
      else rows.push(currentRow);
      currentRow = null;
    }
  }

  return { block: { type: "table", headers, rows, images }, endIndex };
}

function parseImageToken(token) {
  const images = (token.children || []).filter((child) => child.type === "image");
  const nonImageContent = (token.children || [])
    .filter((child) => !["image", "softbreak", "hardbreak"].includes(child.type))
    .some((child) => child.content?.trim());
  if (!images.length || nonImageContent) return [];
  return images.map((image) => createImageBlock(image));
}

function createImageBlock(image) {
  const alt = image.content || "";
  const src = image.attrGet("src") || "";
  const title = image.attrGet("title") || "";
  let displaySrc = src;
  try {
    displaySrc = decodeURIComponent(src);
  } catch {
    // Keep malformed percent-encoded paths readable instead of dropping them.
  }
  const titleSuffix = title ? ` "${title}"` : "";
  return {
    type: "image",
    alt,
    src,
    title,
    original: `![${alt}](${displaySrc}${titleSuffix})`,
  };
}

function findImageMarkdownRange(source, image, fromIndex = 0) {
  const prefix = `![${image.content || ""}]`;
  const start = source.indexOf(prefix, fromIndex);
  if (start < 0) return null;
  const openParen = source.indexOf("(", start + prefix.length);
  if (openParen < 0) return null;

  let depth = 0;
  let escaped = false;
  for (let index = openParen; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return { start, end: index + 1 };
    }
  }
  return null;
}

function parseMixedImageParagraph(token, images) {
  const parsed = parseInlineToken(token, 0, images);
  if (!parsed.images.length) return null;
  return {
    type: "paragraph",
    content: parsed.text,
    textContent: token.content || "",
    images: parsed.images,
    imageOnly: parsed.imageOnly,
  };
}

function parseInlineToken(token, imageOffset = 0, knownImages = null) {
  const source = token.content || "";
  const images = knownImages || (token.children || []).filter((child) => child.type === "image");
  const htmlImageRanges = findHtmlImageRanges(source, imageOffset + images.length);
  const ranges = [];
  let markdownImageIndex = 0;
  for (const image of images) {
    const range = findImageMarkdownRange(source, image, markdownImageIndex);
    if (!range) continue;
    const imageBlock = createImageBlock(image);
    imageBlock.original = source.slice(range.start, range.end);
    ranges.push({ ...range, image: imageBlock });
    markdownImageIndex = range.end;
  }
  ranges.push(...htmlImageRanges);
  ranges.sort((left, right) => left.start - right.start);
  if (!images.length && !htmlImageRanges.length) return { text: source.trim(), images: [] };
  const parts = [];
  const imageBlocks = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) parts.push(source.slice(cursor, range.start));
    range.image.marker = `MCARDIMGTOKEN${imageOffset + imageBlocks.length}END`;
    imageBlocks.push(range.image);
    parts.push(range.image.marker);
    cursor = range.end;
  }

  if (!imageBlocks.length) return { text: source.trim(), images: [] };
  if (cursor < source.length) parts.push(source.slice(cursor));
  return {
    text: parts.join(""),
    images: imageBlocks,
    imageOnly: parts.every((part) => /^MCARDIMGTOKEN\d+END$/.test(part) || !part.trim()),
  };
}

function collectInlineParts(tokens, imageOffset = 0) {
  const parts = [];
  const images = [];
  let offset = imageOffset;
  for (const token of tokens || []) {
    const parsed = parseInlineToken(token, offset);
    parts.push(parsed.text);
    images.push(...parsed.images);
    offset += parsed.images.length;
  }
  return { text: parts.filter(Boolean).join(" "), images };
}

function readHtmlAttribute(tag, name) {
  const match = String(tag || "").match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function createHtmlImageBlock(content) {
  const src = readHtmlAttribute(content, "src");
  if (!src) return null;
  return {
    type: "image",
    src,
    alt: readHtmlAttribute(content, "alt"),
    title: readHtmlAttribute(content, "title"),
    original: String(content || "").trim(),
  };
}

function parseHtmlImage(content) {
  const source = String(content || "").trim();
  return /^<img\b[\s\S]*>$/i.test(source) ? createHtmlImageBlock(source) : null;
}

function findHtmlImageRanges(source, imageOffset = 0) {
  const ranges = [];
  const pattern = /<img\b[^>]*>/gi;
  let match;
  while ((match = pattern.exec(source))) {
    const image = createHtmlImageBlock(match[0]);
    if (!image) continue;
    image.marker = `MCARDIMGTOKEN${imageOffset + ranges.length}END`;
    ranges.push({ start: match.index, end: pattern.lastIndex, image });
  }
  return ranges;
}

function parseHtmlBlockContent(source) {
  const ranges = findHtmlImageRanges(source);
  if (!ranges.length) return { type: "html", content: source };
  const parts = [];
  const images = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) parts.push(source.slice(cursor, range.start));
    const image = range.image;
    image.marker = `MCARDIMGTOKEN${images.length}END`;
    images.push(image);
    parts.push(image.marker);
    cursor = range.end;
  }
  if (cursor < source.length) parts.push(source.slice(cursor));
  return { type: "html", content: parts.join(""), images };
}

/**
 * Extracts custom height specified on the first line (fence info or raw code)
 */
export function extractEChartsCustomHeight(info, raw) {
  if (info) {
    // Matches: height=350, height:350, h=350, h:350
    const explicitMatch = info.match(/\b(?:height|h)\s*[=:]\s*(\d+)/i);
    if (explicitMatch) return Number.parseInt(explicitMatch[1], 10);

    // Matches: ```echarts 350, ```echarts:350, ```echarts 350px, ```echarts-350
    const standaloneMatch = info.match(/^echarts?[:=\-_]?\s*(\d{2,4})(?:px)?\b/i);
    if (standaloneMatch) return Number.parseInt(standaloneMatch[1], 10);
  }

  if (raw) {
    // Matches first line inside the code block: // height: 350, height: 350, # height: 350
    const firstLine = raw.trim().split("\n")[0] || "";
    const firstLineMatch = firstLine.match(/^(?:\/\/\s*|#\s*|\/\*\s*)?(?:height|h)\s*[=:]\s*(\d+)/i);
    if (firstLineMatch) return Number.parseInt(firstLineMatch[1], 10);

    // Matches JSON config: "height": 350
    const jsonMatch = raw.match(/"height"\s*:\s*(\d+)/);
    if (jsonMatch) return Number.parseInt(jsonMatch[1], 10);
  }

  return null;
}

export function parseBlocks(input) {
  const source = Array.isArray(input) ? input.join("\n") : String(input ?? "");
  const tokens = markdownParser.parse(source, {});
  const blocks = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === "fence" || token.type === "code_block") {
      const info = (token.info || "").trim();
      const firstWord = info.split(/\s+/)[0]?.toLowerCase() || "";
      const raw = token.content.replace(/\n$/, "");

      if (["mermaid", "diagram"].includes(firstWord)) {
        blocks.push({ type: "mermaid", raw });
      } else if (
        ["echarts", "echart"].includes(firstWord)
        || /^echarts?[:=\-_]/i.test(firstWord)
      ) {
        const customHeight = extractEChartsCustomHeight(info, raw);
        blocks.push({ type: "echarts", raw, customHeight });
      } else {
        blocks.push({ type: "code-block", lang: firstWord, lines: raw.split("\n"), raw });
      }
      continue;
    }

    if (token.type === "heading_open") {
      const parsed = parseInlineToken(tokens[index + 1]);
      blocks.push({ type: token.tag === "h2" ? "heading2" : "heading3", content: parsed.text, images: parsed.images });
      index += 2;
      continue;
    }

    if (token.type === "paragraph_open" && tokens[index + 1]?.type === "inline") {
      const inlineToken = tokens[index + 1];
      const images = parseImageToken(inlineToken);
      if (images.length) blocks.push(...images);
      else {
        const inlineImages = (inlineToken.children || []).filter((child) => child.type === "image");
        const hasHtmlImage = /<img\b/i.test(inlineToken.content || "");
        const mixedParagraph = inlineImages.length || hasHtmlImage
          ? parseMixedImageParagraph(inlineToken, inlineImages)
          : null;
        const htmlImage = parseHtmlImage(inlineToken.content);
        if (mixedParagraph?.imageOnly) blocks.push(...mixedParagraph.images);
        else blocks.push(mixedParagraph || htmlImage || { type: "paragraph", content: inlineToken.content.trim() });
      }
      index += 2;
      continue;
    }

    if (token.type === "bullet_list_open" || token.type === "ordered_list_open") {
      const parsed = parseListTokens(tokens, index);
      if (parsed.block.items.length) blocks.push(parsed.block);
      index = parsed.endIndex;
      continue;
    }

    if (token.type === "table_open") {
      const parsed = parseTableTokens(tokens, index);
      blocks.push(parsed.block);
      index = parsed.endIndex;
      continue;
    }

    if (token.type === "blockquote_open") {
      const endIndex = findClosingToken(tokens, index, "blockquote_open", "blockquote_close");
      const inlineTokens = tokens.slice(index + 1, endIndex).filter((nestedToken) => nestedToken.type === "inline");
      const parsedLines = [];
      const images = [];
      let imageOffset = 0;
      for (const inline of inlineTokens) {
        const parsed = parseInlineToken(inline, imageOffset);
        if (parsed.text) parsedLines.push(parsed.text);
        images.push(...parsed.images);
        imageOffset += parsed.images.length;
      }
      blocks.push({ type: "blockquote", content: parsedLines.join(" "), lines: parsedLines, images });
      index = endIndex;
      continue;
    }

    if (/^container_(tip|warning|info|danger|note)_open$/.test(token.type)) {
      const kind = token.type.match(/^container_(.+)_open$/)?.[1] || "info";
      const closeType = `container_${kind}_close`;
      const endIndex = findClosingToken(tokens, index, token.type, closeType);
      const title = token.info.trim().replace(new RegExp(`^${kind}\\s*`, "i"), "")
        || t(`content.${["tip", "warning", "danger"].includes(kind) ? kind : "info"}`);
      const parsed = collectInlineParts(
        tokens.slice(index + 1, endIndex).filter((nestedToken) => nestedToken.type === "inline"),
      );
      blocks.push({ type: "callout", kind, title, content: parsed.text, images: parsed.images });
      index = endIndex;
      continue;
    }

    if (token.type === "hr") {
      blocks.push({ type: "divider" });
      continue;
    }

    if (token.type === "html_block") {
      const image = parseHtmlImage(token.content);
      if (image) blocks.push(image);
      else if (token.content?.trim()) blocks.push(parseHtmlBlockContent(token.content));
      continue;
    }

    if (token.type === "footnote_block_open") {
      const blockEnd = findClosingToken(tokens, index, "footnote_block_open", "footnote_block_close");
      for (let footnoteIndex = index + 1; footnoteIndex < blockEnd; footnoteIndex += 1) {
        const footnoteToken = tokens[footnoteIndex];
        if (footnoteToken.type !== "footnote_open") continue;
        const footnoteEnd = findClosingToken(tokens, footnoteIndex, "footnote_open", "footnote_close");
        const parsed = collectInlineParts(
          tokens.slice(footnoteIndex + 1, footnoteEnd).filter((nestedToken) => nestedToken.type === "inline"),
        );
        blocks.push({
          type: "footnote",
          label: String(footnoteToken.meta?.label || footnoteToken.meta?.id + 1 || ""),
          content: parsed.text,
          images: parsed.images,
        });
        footnoteIndex = footnoteEnd;
      }
      index = blockEnd;
    }
  }

  return blocks;
}

export function blocksToPreviewText(blocks) {
  return (blocks || [])
    .slice(0, 4)
    .map((b) => {
      if (b.type === "paragraph") return b.textContent || b.content;
      if (b.type === "heading2" || b.type === "heading3") return b.content;
      if (b.type === "list") return b.items?.slice(0, 2).map((i) => typeof i === "string" ? i : i?.text).join(" · ");
      if (b.type === "task-list") return b.items?.slice(0, 2).map(i => i.text).join(" · ");
      if (b.type === "ordered-list") return b.items?.slice(0, 2).map((i) => typeof i === "string" ? i : i?.text).join(" · ");
      if (b.type === "blockquote") return b.content;
      if (b.type === "code-block") return `[${b.lang || t("content.code")}]`;
      if (b.type === "mermaid") return `[${t("content.flowchart")}]`;
      if (b.type === "echarts") return `[${t("content.echarts") || "ECharts 图表"}]`;
      if (b.type === "table") return `[${t("content.table")}]`;
      if (b.type === "image") return `[${t("content.image")}]`;
      if (b.type === "html") return String(b.content || "").replace(/<[^>]+>/g, "").trim();
      return "";
    })
    .filter(Boolean);
}

// ─── Block → HTML ─────────────────────────────────────────────────────────────
/**
 * Intelligently infer optimal chart height based on chart type, data volume, and layout
 */
export function inferEChartsHeight(option, customHeight = null) {
  if (customHeight && Number.isFinite(customHeight) && customHeight > 0) {
    return Math.max(120, Math.min(600, customHeight));
  }

  if (!option || typeof option !== "object") return 200;

  if (option.height && Number.isFinite(Number(option.height))) {
    return Math.max(120, Math.min(600, Number(option.height)));
  }

  const series = Array.isArray(option.series) ? option.series : option.series ? [option.series] : [];
  const hasTitle = Boolean(option.title && (option.title.text || typeof option.title === "string"));
  const hasSubtitle = Boolean(option.title && option.title.subtext);
  const hasLegend = Boolean(option.legend && (Array.isArray(option.legend) || option.legend.data || Object.keys(option.legend).length > 0));
  const isVerticalLegend = option.legend?.orient === "vertical";

  // 1. Horizontal Bar Chart (yAxis has categories)
  const yAxis = Array.isArray(option.yAxis) ? option.yAxis[0] : option.yAxis;
  const isHorizontalBar = yAxis?.type === "category" || Array.isArray(yAxis?.data);
  if (isHorizontalBar) {
    const categoryCount = yAxis?.data?.length || series[0]?.data?.length || 5;
    const calculated = categoryCount * 26 + (hasTitle ? (hasSubtitle ? 85 : 70) : 45);
    return Math.max(180, Math.min(480, calculated));
  }

  // 2. Radar, Sankey, Heatmap, Graph, Treemap (Need deep area)
  const isDeepChart = Boolean(
    option.radar
    || series.some((s) => ["radar", "sankey", "heatmap", "graph", "treemap", "sunburst"].includes(s?.type))
  );
  if (isDeepChart) {
    return hasTitle ? (hasSubtitle ? 320 : 290) : 260;
  }

  // 3. Pie / Donut Chart
  const isPie = series.some((s) => s?.type === "pie");
  if (isPie) {
    const sliceCount = series[0]?.data?.length || 0;
    if (isVerticalLegend || sliceCount >= 8) {
      return hasTitle ? 290 : 260;
    }
    if (sliceCount >= 5 || hasTitle) {
      return hasTitle ? 240 : 210;
    }
    return 180;
  }

  // 4. Cartesian (Line, Column/Vertical Bar, Area, Scatter)
  const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis;
  const xCount = xAxis?.data?.length || series[0]?.data?.length || 0;
  const isMultiSeries = series.length >= 3;

  if (xCount > 15 || isMultiSeries || option.dataZoom) {
    return hasTitle ? 270 : 230;
  }
  if (hasTitle && (hasSubtitle || hasLegend)) {
    return 260;
  }
  if (hasTitle) {
    return 230;
  }
  if (hasLegend || xCount > 8) {
    return 190;
  }

  // 5. Minimal simple line/bar chart (e.g. 5-7 day trend, no title, no legend)
  return 160;
}

export function renderBlockToHtml(block) {
  switch (block.type) {
    case "heading2":
      return `<h2 class="card-h2">${renderInlineContent(block.content, block.images)}</h2>`;

    case "heading3":
      return `<h3 class="card-h3">${renderInlineContent(block.content, block.images)}</h3>`;

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

    case "echarts": {
      let option = null;
      try {
        option = parseEChartsOption(block.raw);
      } catch (_) {}
      const height = inferEChartsHeight(option, block.customHeight);
      return `<div class="echarts-raw-box w-full flex flex-col justify-center items-center overflow-hidden" style="margin: 0;"><div class="echarts-render-container w-full" style="width: 100%; height: ${height}px;" data-height="${height}" data-code="${escapeHtml(block.raw)}"></div></div>`;
    }

    case "html": {
      let html = sanitizeHtmlFragment(block.content);
      for (const image of block.images || []) {
        if (image.marker) html = html.replaceAll(image.marker, renderInlineImageToHtml(image));
      }
      return html;
    }

    case "callout": {
      const icon = block.kind === "tip" ? "💡" : block.kind === "warning" ? "⚠️" : block.kind === "danger" ? "🚨" : "ℹ️";
      return `<div class="card-callout callout-${block.kind} my-2.5 p-3 rounded-xl border flex flex-col gap-1"><div class="flex items-center gap-1.5 font-bold text-xs"><span>${icon}</span><span>${formatInline(block.title)}</span></div><div class="text-xs leading-relaxed opacity-90">${renderInlineContent(block.content, block.images)}</div></div>`;
    }

    case "table": {
      const columnCount = Math.max(
        block.headers?.length || 0,
        ...(block.rows || []).map((row) => row?.length || 0),
      );
      const densityClass = columnCount >= 7
        ? " card-table--compact"
        : columnCount >= 4
          ? " card-table--dense"
          : "";
      const headers = (block.headers || []).map((h) => `<th>${renderInlineCell(h, block.images)}</th>`).join("");
      const bodyRows = (block.rows || [])
        .map((row) => `<tr>${(row || []).map((c) => `<td>${renderInlineCell(c, block.images)}</td>`).join("")}</tr>`)
        .join("");
      return `<div class="card-table-wrap"><table class="card-table${densityClass}"><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
    }

    case "blockquote": {
      const inner = (block.lines || [block.content || ""])
        .map((l) => `<p>${renderInlineContent(typeof l === "string" ? l : l?.text, block.images || l?.images)}</p>`)
        .join("");
      return `<blockquote class="card-blockquote">${inner}</blockquote>`;
    }

    case "task-list": {
      const items = (block.items || [])
        .map((item) => {
          const icon = item.checked ? `<span class="task-badge checked">✓</span>` : `<span class="task-badge unchecked"></span>`;
          const textStyle = item.checked ? `line-through opacity-70` : ``;
          return `<li class="card-task-item flex items-center gap-2 py-0.5"><span class="task-check-box">${icon}</span><span class="${textStyle}">${renderInlineContent(item.text, item.images || block.images)}</span></li>`;
        })
        .join("");
      return `<ul class="card-task-list my-2 flex flex-col gap-1.5">${items}</ul>`;
    }

    case "list": {
      const items = (block.items || [])
        .map((item) => `<li><span class="list-dot"></span><span>${renderInlineContent(typeof item === "string" ? item : item?.text, item?.images || block.images)}</span></li>`)
        .join("");
      return `<ul class="card-list">${items}</ul>`;
    }

    case "ordered-list": {
      const startIdx = block.startIndex || 0;
      const items = (block.items || [])
        .map((item, idx) => {
          const numStr = String(startIdx + idx + 1).padStart(2, "0");
          return `<li class="card-ordered-item flex items-start gap-2.5 py-0.5"><span class="list-num-badge shrink-0">${numStr}</span><span class="flex-1 min-w-0">${renderInlineContent(typeof item === "string" ? item : item?.text, item?.images || block.images)}</span></li>`;
        })
        .join("");
      return `<ol class="card-ordered-list my-2 flex flex-col gap-2">${items}</ol>`;
    }

    case "image":
      return renderImageBlockToHtml(block);

    case "divider":
      return `<hr class="card-divider" />`;

    case "footnote":
      return `<div class="card-footnote"><sup>[${escapeHtml(block.label)}]</sup><span>${renderInlineContent(block.content, block.images)}</span></div>`;

    case "paragraph": {
      if (block.images?.length) {
        const html = renderInlineContent(block.content ?? "", block.images);
        return `<p class="card-paragraph">${html}</p>`;
      }
      return `<p class="card-paragraph">${formatInline(block.content ?? "")}</p>`;
    }

    default:
      return `<p class="card-paragraph">${formatInline(block.content ?? "")}</p>`;
  }
}

function renderImageBlockToHtml(block) {
  if (block.missing || !block.src) {
    return `<p class="card-paragraph">${escapeHtml(block.original || `![${block.alt || ""}](${block.src || ""})`)}</p>`;
  }
  return `<div class="card-image-wrap"><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" data-original-markdown="${escapeHtml(block.original || `![${block.alt || ""}](${block.src || ""})`)}" class="card-image" loading="eager" /></div>`;
}

function renderInlineImageToHtml(image) {
  if (image.missing || !image.src) {
    return `<span>${escapeHtml(image.original || "")}</span>`;
  }
  return `<span class="card-inline-image-wrap"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" data-original-markdown="${escapeHtml(image.original || "")}" class="card-inline-image" loading="eager" /></span>`;
}

function renderInlineContent(text, images = []) {
  let html = formatInline(text ?? "");
  for (const image of images || []) {
    if (image?.marker) html = html.replaceAll(image.marker, renderInlineImageToHtml(image));
  }
  return html;
}

function renderInlineCell(cell, images) {
  if (typeof cell === "string") return renderInlineContent(cell, images);
  return renderInlineContent(cell?.text || "", cell?.images || images);
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

/**
 * Parses ECharts configuration safely supporting standard JSON and relaxed JS object literal
 */
export function parseEChartsOption(code) {
  if (!code || !code.trim()) return null;
  let trimmed = code.trim();
  // Strip leading single-line comment if present (e.g. "// height: 350")
  trimmed = trimmed.replace(/^(?:\/\/[^\n]*|\#[^\n]*|\/\*[\s\S]*?\*\/)\s*/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    try {
      const fn = new Function(`"use strict"; return (${trimmed});`);
      const result = fn();
      if (result && typeof result === "object") return result;
    } catch (evalErr) {
      throw new Error(`配置语法解析错误: ${e.message || evalErr.message}`);
    }
  }
  return null;
}

/**
 * Optimizes ECharts options to eliminate wasteful canvas margins and fit card typography
 */
function applyDefaultEChartsOption(option, fontFamily = "") {
  if (!option || typeof option !== "object") return option;

  const hasCartesian = Boolean(
    option.xAxis
    || option.yAxis
    || (Array.isArray(option.series) && option.series.some((s) => ["line", "bar", "scatter", "candlestick"].includes(s?.type)))
  );

  const hasTitle = Boolean(
    option.title && (option.title.text || typeof option.title === "string")
  );
  const hasSubtitle = Boolean(option.title && option.title.subtext);
  const hasLegend = Boolean(
    option.legend && (Array.isArray(option.legend) || option.legend.data || Object.keys(option.legend).length > 0)
  );
  const series = Array.isArray(option.series) ? option.series : option.series ? [option.series] : [];
  const isPie = series.some((s) => s?.type === "pie");
  const isVerticalLegend = option.legend?.orient === "vertical";

  let gridTop = 10;
  if (hasTitle && (hasSubtitle || hasLegend)) {
    gridTop = 68;
  } else if (hasTitle) {
    gridTop = 52;
  } else if (hasLegend) {
    gridTop = 32;
  }

  const merged = {
    backgroundColor: "transparent",
    animation: false,
    ...option,
  };

  if (fontFamily) {
    merged.textStyle = {
      fontFamily,
      ...(option.textStyle || {}),
    };
  }

  // If chart is a Pie chart, optimize label lines and radius while keeping it strictly horizontally centered
  if (isPie) {
    merged.series = series.map((s) => {
      if (s?.type !== "pie") return s;
      const updated = { ...s };

      // 1. Shorten labelLine lengths to prevent labels from overflowing the card container
      updated.labelLine = {
        length: 5,
        length2: 6,
        smooth: true,
        ...s.labelLine,
      };

      // 2. Ensure labels use tight margins
      updated.label = {
        bleedMargin: 4,
        alignTo: "none",
        fontSize: 11,
        ...s.label,
      };

      // 3. Keep pie strictly horizontally centered at 50%
      const currentCenter = Array.isArray(s.center) ? [...s.center] : ["50%", "50%"];
      currentCenter[0] = "50%";
      updated.center = currentCenter;

      // 4. If outside labels are used, scale radius to 38% so it stays completely centered without clipping
      const labelPos = s.label?.position || "outside";
      if (labelPos !== "inside" && labelPos !== "inner") {
        if (typeof s.radius === "string") {
          const radVal = Number.parseFloat(s.radius);
          if (radVal >= 45) updated.radius = "38%";
        } else if (Array.isArray(s.radius) && typeof s.radius[1] === "string") {
          const outerVal = Number.parseFloat(s.radius[1]);
          if (outerVal >= 45) updated.radius = [s.radius[0], "38%"];
        }
      }

      return updated;
    });
  }

  // If chart uses Cartesian grid and user did not customize grid, provide tight, label-aware bounds
  if (hasCartesian && !option.grid) {
    merged.grid = {
      top: gridTop,
      bottom: 8,
      left: 8,
      right: 12,
      containLabel: true,
    };
  } else if (option.grid && typeof option.grid === "object") {
    merged.grid = {
      containLabel: true,
      ...option.grid,
    };
  }

  return merged;
}

/**
 * Asynchronous ECharts renderer for DOM containers
 */
export async function renderEChartsDiagrams(container) {
  if (!container) return;
  const rawNodes = Array.from(container.querySelectorAll(".echarts-render-container"));
  if (!rawNodes.length) return;

  // Canvas text metrics are fixed when setOption() runs. Wait for web fonts
  // first so CJK labels use the same glyph widths in preview and export.
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  for (const node of rawNodes) {
    const rawCode = node.getAttribute("data-code");
    if (!rawCode || node.getAttribute("data-rendered") === "true") continue;

    try {
      const option = parseEChartsOption(rawCode);
      if (!option) continue;

      let chart = echarts.getInstanceByDom(node);

      const parentWidth = node.clientWidth || node.parentElement?.clientWidth || container?.clientWidth || 360;
      const width = Math.max(200, parentWidth > 40 ? parentWidth - 16 : parentWidth);
      const height = Number.parseInt(node.getAttribute("data-height") || "160", 10) || 160;

      if (!chart) {
        chart = echarts.init(node, null, {
          renderer: "canvas",
          width,
          height,
        });
        node._echartsInstance = chart;
      } else {
        chart.resize({ width, height });
      }

      const fontFamily = getComputedStyle(node).fontFamily;
      const finalOption = applyDefaultEChartsOption(option, fontFamily);
      chart.setOption(finalOption, true);

      // Force synchronous flush to paint canvas immediately
      chart.getZr?.()?.flush?.();

      node.setAttribute("data-rendered", "true");
    } catch (err) {
      console.warn("ECharts render error:", err);
      node.innerHTML = `<div class="p-3 text-xs text-rose-500 bg-rose-50/80 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-900/50 w-full text-center">ECharts 语法解析错误: ${escapeHtml(err.message)}</div>`;
      node.style.height = "auto";
      node.setAttribute("data-rendered", "error");
    }
  }
}

/**
 * Dispose all ECharts instances in a container to avoid leaks
 */
export function disposeEChartsDiagrams(container) {
  if (!container) return;
  const rawNodes = Array.from(container.querySelectorAll(".echarts-render-container"));
  for (const node of rawNodes) {
    const chart = echarts.getInstanceByDom(node) || node._echartsInstance;
    if (chart && !chart.isDisposed()) {
      chart.dispose();
    }
    node._echartsInstance = null;
  }
}
