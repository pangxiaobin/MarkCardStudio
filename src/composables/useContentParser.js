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
const CHARS_PER_LINE = 34;

function estimateTextLines(text) {
  // CJK glyphs are wider than Latin glyphs at the same font size. Giving them
  // extra weight keeps pagination close to the actual
  // card layout instead of allowing a paragraph to overflow its article.
  const visualLength = Array.from(text || "").reduce(
    (length, character) => length + (/[⺀-鿿豈-﫿]/.test(character) ? 1.5 : 1),
    0,
  );
  return Math.max(1, Math.ceil(visualLength / CHARS_PER_LINE));
}

export function estimateBlockHeight(block) {
  switch (block.type) {
    case "heading2": return 46;
    case "heading3": return 36;
    case "paragraph": return estimateTextLines(block.content) * 26 + 8;
    case "blockquote":
      return (block.lines || []).reduce((h, l) => h + estimateTextLines(l) * 26, 0) + 24;
    case "list": return (block.items?.length || 1) * 30 + 8;
    case "ordered-list": return (block.items?.length || 1) * 30 + 8;
    case "task-list": return (block.items?.length || 1) * 32 + 8;
    case "code-block": return Math.min((block.lines?.length || 1) * 20 + 32, 220);
    // Mermaid is fitted into a 180px-high static viewport plus wrapper space.
    case "mermaid": return 218;
    case "table": return ((block.rows?.length || 0) + 1) * 38 + 16;
    // Includes the image wrapper's vertical margins and its 200px max-height.
    case "image": return 236;
    case "divider": return 24;
    default: return 28;
  }
}

/**
 * Max estimated usable content height in px (at 450px base portrait width).
 */
export const CARD_CONTENT_HEIGHT = 380;

/**
 * Calculate usable body height for the selected platform at the same design
 * viewport used by preview/export. Header, footer, poster padding and title
 * occupy about 220px at the 450px-wide portrait reference size.
 */
export function getCardContentHeight(platformWidth, platformHeight) {
  const width = Number(platformWidth) || 1080;
  const height = Number(platformHeight) || 1440;
  const designWidth = width > height ? 640 : 450;
  const designHeight = Math.round(designWidth * (height / width));
  const referenceDesignHeight = 600;

  return Math.max(160, CARD_CONTENT_HEIGHT + designHeight - referenceDesignHeight);
}

/**
 * Split block array into pages such that each page's estimated height ≤ maxHeight.
 */
export function splitBlocksIntoPages(blocks, maxHeight = CARD_CONTENT_HEIGHT) {
  if (!blocks.length) return [[]];
  const pages = [];
  let current = [];
  let height = 0;

  for (const block of blocks) {
    const bh = estimateBlockHeight(block);
    if (current.length > 0 && height + bh > maxHeight) {
      pages.push(current);
      current = [block];
      height = bh;
    } else {
      current.push(block);
      height += bh;
    }
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
      const headers = (block.headers || []).map((h) => `<th>${formatInline(h)}</th>`).join("");
      const bodyRows = (block.rows || [])
        .map((row) => `<tr>${(row || []).map((c) => `<td>${formatInline(c)}</td>`).join("")}</tr>`)
        .join("");
      return `<div class="card-table-wrap"><table class="card-table"><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
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
      const items = (block.items || [])
        .map((item, idx) => {
          const numStr = String(idx + 1).padStart(2, "0");
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
