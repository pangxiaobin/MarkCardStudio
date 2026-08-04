import { computed, watch } from "vue";
import { defaultMarkdown } from "./useStudioDocument";

export { defaultMarkdown };

const imageClasses = [
  "hero-mountain",
  "hero-books",
  "hero-bedroom",
  "hero-run",
  "hero-journal",
  "hero-sunset",
];

export function useMarkdownPages(markdown, activePageIndex) {
  const markdownLines = computed(() =>
    markdown.value.split("\n").map((text, index) => ({
      no: index + 1,
      text,
      type: getLineType(text),
    })),
  );

  const wordCount = computed(() => markdown.value.replace(/\s/g, "").length);

  const parsedPages = computed(() => {
    const sections = parseMarkdown(markdown.value);
    return sections.map((section, index) => ({
      ...section,
      label: index === 0 ? "封面" : String(index),
      kicker: "@MarkCard",
      imageClass: imageClasses[index % imageClasses.length],
    }));
  });

  const pages = computed(() => (parsedPages.value.length > 0 ? parsedPages.value : [createEmptyPage()]));
  const activePage = computed(() => pages.value[activePageIndex.value] ?? pages.value[0]);
  const canGoPrevious = computed(() => activePageIndex.value > 0);
  const canGoNext = computed(() => activePageIndex.value < pages.value.length - 1);

  watch(
    () => pages.value.length,
    (pageCount) => {
      if (activePageIndex.value > pageCount - 1) {
        activePageIndex.value = Math.max(0, pageCount - 1);
      }
    },
  );

  return {
    markdownLines,
    wordCount,
    pages,
    activePage,
    canGoPrevious,
    canGoNext,
  };
}

function getLineType(text) {
  if (/^#{1,6}\s+/.test(text)) return "heading";
  if (/^>\s?/.test(text)) return "quote";
  if (/^[-*]\s+/.test(text)) return "list";
  return "";
}

function extractDocumentTitle(lines) {
  const h1 = lines.find((line) => /^#\s+/.test(line));
  if (h1) return cleanMarkdownText(h1);

  const h2 = lines.find((line) => /^##\s+/.test(line));
  if (h2) return cleanMarkdownText(h2);

  const h3 = lines.find((line) => /^###\s+/.test(line));
  if (h3) return cleanMarkdownText(h3);

  const firstText = lines.find((line) => {
    const t = line.trim();
    return Boolean(t) && !t.startsWith("---") && !t.startsWith("***") && !t.startsWith("<!--");
  });
  if (firstText) return cleanMarkdownText(firstText);

  return "我的灵感笔记";
}

function parseMarkdown(source) {
  const lines = source.split("\n");
  const documentTitle = extractDocumentTitle(lines);
  const introLines = [];
  const sections = [];
  let currentSection = null;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      continue;
    }

    if (line.startsWith("## ")) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        title: cleanMarkdownText(line),
        body: [],
        quote: "",
      };
      continue;
    }

    if (currentSection) {
      if (line.startsWith(">")) {
        currentSection.quote = cleanMarkdownText(line);
      } else if (line.trim()) {
        currentSection.body.push(cleanMarkdownText(line));
      }
    } else if (line.trim()) {
      introLines.push(cleanMarkdownText(line));
    }
  }

  if (currentSection) sections.push(currentSection);

  const cover = {
    title: documentTitle,
    body: introLines.length ? introLines : ["把想法写下来，让内容自动变成一组可发布的图文卡片。"],
    quote: "用 Markdown 创作，用图片表达。",
    cover: true,
  };

  const contentPages = sections.length
    ? sections
    : [
        {
          title: "开始创作",
          body: ["在左侧输入 Markdown。", "使用二级标题拆分页面。", "预览会跟随内容实时刷新。"],
          quote: "每个二级标题会生成一张内容卡。",
        },
      ];

  return [cover, ...contentPages].slice(0, 12);
}

function cleanMarkdownText(text) {
  return text
    .replace(/^#{1,6}\s+/, "")
    .replace(/^>\s?/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function createEmptyPage() {
  return {
    label: "封面",
    title: "我的灵感笔记",
    kicker: "@MarkCard",
    body: ["在左侧输入 Markdown 内容。"],
    quote: "内容会在这里生成预览。",
    imageClass: "hero-mountain",
  };
}
