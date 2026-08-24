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
  html: false,
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

// ─── Inline formatting with KaTeX & Rich Syntaxes ──────────────────────────────
export function formatInline(text) {
  if (!text) return "";
  const mathFragments = [];
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

  for (let index = startIndex + 1; index < endIndex; index += 1) {
    if (tokens[index].type !== "list_item_open") continue;
    const itemEnd = findClosingToken(tokens, index, "list_item_open", "list_item_close");
    const inlineTokens = tokens.slice(index + 1, itemEnd).filter((token) => token.type === "inline");
    const text = inlineTokens.map(inlineTokenText).filter(Boolean).join(" ");
    const taskInput = inlineTokens
      .flatMap((token) => token.children || [])
      .find((child) => child.type === "html_inline" && child.content.includes("task-list-item-checkbox"));
    items.push({
      text,
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
        items: items.map((item) => ({ checked: item.checked, text: item.text })),
      },
      endIndex,
    };
  }

  const ordered = openToken.type === "ordered_list_open";
  const start = Number.parseInt(openToken.attrGet("start") || "1", 10);
  return {
    block: {
      type: ordered ? "ordered-list" : "list",
      items: items.map((item) => item.text),
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

  for (let index = startIndex + 1; index < endIndex; index += 1) {
    const token = tokens[index];
    if (token.type === "thead_open") inHeader = true;
    if (token.type === "thead_close") inHeader = false;
    if (token.type === "tr_open") currentRow = [];
    if ((token.type === "th_open" || token.type === "td_open") && tokens[index + 1]?.type === "inline") {
      currentRow?.push(inlineTokenText(tokens[index + 1]));
    }
    if (token.type === "tr_close" && currentRow) {
      if (inHeader && headers.length === 0) headers.push(...currentRow);
      else rows.push(currentRow);
      currentRow = null;
    }
  }

  return { block: { type: "table", headers, rows }, endIndex };
}

function parseImageToken(token) {
  const images = (token.children || []).filter((child) => child.type === "image");
  const nonImageContent = (token.children || [])
    .filter((child) => !["image", "softbreak", "hardbreak"].includes(child.type))
    .some((child) => child.content?.trim());
  if (!images.length || nonImageContent) return [];
  return images.map((image) => {
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
  });
}

function parseHtmlImage(content) {
  const match = String(content || "").trim().match(
    /^<img\s+[^>]*src=["']([^"']+)["'][^>]*>$/i,
  );
  if (!match) return null;
  const altMatch = String(content).match(/\salt=["']([^"']*)["']/i);
  return {
    type: "image",
    src: match[1],
    alt: altMatch?.[1] || "",
    original: String(content || "").trim(),
  };
}

export function parseBlocks(input) {
  const source = Array.isArray(input) ? input.join("\n") : String(input ?? "");
  const tokens = markdownParser.parse(source, {});
  const blocks = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === "fence" || token.type === "code_block") {
      const lang = token.info?.trim().split(/\s+/)[0] || "";
      const raw = token.content.replace(/\n$/, "");
      blocks.push(
        ["mermaid", "diagram"].includes(lang.toLowerCase())
          ? { type: "mermaid", raw }
          : { type: "code-block", lang, lines: raw.split("\n"), raw },
      );
      continue;
    }

    if (token.type === "heading_open") {
      const content = inlineTokenText(tokens[index + 1]);
      blocks.push({ type: token.tag === "h2" ? "heading2" : "heading3", content });
      index += 2;
      continue;
    }

    if (token.type === "paragraph_open" && tokens[index + 1]?.type === "inline") {
      const inlineToken = tokens[index + 1];
      const images = parseImageToken(inlineToken);
      if (images.length) blocks.push(...images);
      else {
        const htmlImage = parseHtmlImage(inlineToken.content);
        blocks.push(htmlImage || { type: "paragraph", content: inlineToken.content.trim() });
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
      const lines = tokens.slice(index + 1, endIndex)
        .filter((nestedToken) => nestedToken.type === "inline")
        .map(inlineTokenText)
        .filter(Boolean);
      blocks.push({ type: "blockquote", content: lines.join(" "), lines });
      index = endIndex;
      continue;
    }

    if (/^container_(tip|warning|info|danger|note)_open$/.test(token.type)) {
      const kind = token.type.match(/^container_(.+)_open$/)?.[1] || "info";
      const closeType = `container_${kind}_close`;
      const endIndex = findClosingToken(tokens, index, token.type, closeType);
      const title = token.info.trim().replace(new RegExp(`^${kind}\\s*`, "i"), "")
        || t(`content.${["tip", "warning", "danger"].includes(kind) ? kind : "info"}`);
      const content = tokens.slice(index + 1, endIndex)
        .filter((nestedToken) => nestedToken.type === "inline")
        .map(inlineTokenText)
        .filter(Boolean)
        .join(" ");
      blocks.push({ type: "callout", kind, title, content });
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
      continue;
    }

    if (token.type === "footnote_block_open") {
      const blockEnd = findClosingToken(tokens, index, "footnote_block_open", "footnote_block_close");
      for (let footnoteIndex = index + 1; footnoteIndex < blockEnd; footnoteIndex += 1) {
        const footnoteToken = tokens[footnoteIndex];
        if (footnoteToken.type !== "footnote_open") continue;
        const footnoteEnd = findClosingToken(tokens, footnoteIndex, "footnote_open", "footnote_close");
        const content = tokens.slice(footnoteIndex + 1, footnoteEnd)
          .filter((nestedToken) => nestedToken.type === "inline")
          .map(inlineTokenText)
          .filter(Boolean)
          .join(" ");
        blocks.push({
          type: "footnote",
          label: String(footnoteToken.meta?.label || footnoteToken.meta?.id + 1 || ""),
          content,
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
        : columnCount >= 4
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

    case "image": {
      if (block.missing || !block.src) {
        return `<p class="card-image-fallback">${escapeHtml(block.original || `![${block.alt || ""}](${block.src || ""})`)}</p>`;
      }
      return `<div class="card-image-wrap"><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" data-original-markdown="${escapeHtml(block.original || `![${block.alt || ""}](${block.src || ""})`)}" class="card-image" loading="eager" /></div>`;
    }

    case "divider":
      return `<hr class="card-divider" />`;

    case "footnote":
      return `<div class="card-footnote"><sup>[${escapeHtml(block.label)}]</sup><span>${formatInline(block.content)}</span></div>`;

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
