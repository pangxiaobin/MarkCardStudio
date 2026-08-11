import { computed, onBeforeUnmount, ref, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { parseBlocks, blocksToPreviewText } from "./useContentParser.js";
import { createMeasuredPaginationSession } from "./useMeasuredPagination.js";
import { DEFAULT_THEME, THEME_LIST, getThemeByName } from "../config/themes.js";
import { i18n } from "../i18n/index.js";

function t(key, params) {
  return i18n.global.t(key, params);
}

export const defaultMarkdown = `# 欢迎使用 MarkCard Studio 🎨

> 面向独立创作者与知识分享者的 Markdown 极简卡片生成与精致排版工具。

## 💡 为什么选择 MarkCard Studio？
- **Markdown 即排版**：只需专注文字，排版、调色与多风格美化全自动完成。
- **多元化主题风格**：内置苹果备忘录、Instagram 时尚、线圈笔记本、复古报刊、暗黑极客等 8 款艺术主题。
- **全平台尺寸自适应**：一键匹配小红书 (3:4)、抖音 (9:16)、公众号、微博及自定义高宽。
- **本地隐私安全与高清导出**：所有解析均在本地完成，支持 PNG、JPG、PDF 及长图导出。

## 🔢 步骤列表与创作流程
1. **输入 Markdown 内容** —— 专注于文字输入与想法沉淀。
2. **选择目标社交画幅** —— 一键匹配小红书 (3:4) 或抖音 (9:16)。
3. **切换艺术视觉主题** —— 换上苹果备忘录、Instagram 或复古报刊。
4. **一键无损高清导出** —— 支持 PNG、JPG 及 PDF 批量保存。

## 🖼️ 图片与美图卡片展示
![独立创作工作台](https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80)

*一张图片结合精美标题与段落，自动渲染出具备艺术画框感的排版视觉。*

## 📊 数据表格与平台对比
| 社交平台 | 画幅比例 | 推荐分辨率 | 最佳排版主题 |
| :--- | :---: | :---: | :--- |
| **小红书** | 3:4 | 1080 x 1440 | 苹果备忘录 / 暖阳日记 |
| **抖音** | 9:16 | 1080 x 1920 | Instagram 时尚 / 暗黑极客 |
| **微博** | 6:7 | 1080 x 1260 | 线圈笔记本 / 复古报刊 |
| **通用方形** | 1:1 | 1080 x 1080 | 墨色简报 / 清新绿洲 |

## 🧮 数学公式与物理方程
在使用 Markdown 撰写学术卡片或知识干货时，支持流畅格式化行内与块级公式：

- 质能方程：$E = mc^2$
- 欧拉恒等式：$e^{i\pi} + 1 = 0$
- 正态分布高斯积分：
$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$

## ✅ 创作任务与 Todo 进度
- [x] 确定图文卡片排版主题与视觉调性
- [x] 撰写 Markdown 核心干货内容
- [ ] 导出高清 PNG 朋友圈/社交媒体批量发布
- [ ] 复盘数据与读者互动反馈

## 💻 丰富代码块与高亮
\`\`\`typescript
interface CardExportConfig {
  theme: 'apple-notes' | 'instagram' | 'spiral' | 'cyberpunk';
  ratio: '3:4' | '9:16' | '1:1';
  quality: number; // 0.8 ~ 1.0
  format: 'PNG' | 'JPG' | 'PDF';
}

function renderCard(config: CardExportConfig): void {
  console.log(\`Rendering card with \${config.theme} style...\`);
}
\`\`\`

## 📊 Mermaid 流程图与逻辑架构
\`\`\`mermaid
graph TD
  A[Markdown 文本输入] --> B(智能主题样式化)
  B --> C{画幅适配}
  C -->|小红书 3:4| D[高清 PNG / PDF 导出]
  C -->|全屏 9:16| D
\`\`\`

## 💡 提示与警告容器 Callout
::: tip 创作小技巧
快捷键 <kbd>⌘</kbd> + <kbd>S</kbd> 可快速保存当前 Markdown 稿件至本地文件。
:::

::: warning 注意事项
所有数据均存储在本地 [MarkCard 官网](https://github.com/markcard) [^1]，无需担心云端数据泄露。
:::

## 📝 金句随笔与全量富文本
> 真正的自由，不是随心所欲，而是拥有拒绝的权利。 -- 哲理金句

- ==马克笔高亮文本== 与 ~~删除线删除文本~~
- **加粗醒目标题** 与 *优雅斜体强调*
- 化学分子式 $H_2O$ 与 下标 $X_1$ / 上标 $X^2$
- 快捷键提示：按 <kbd>Ctrl</kbd> + <kbd>Z</kbd> 撤销编辑
- 脚注注释引用 [^1] 方便写论文与严肃干货文章`;

const defaultMarkdownEnglish = `# Welcome to MarkCard Studio

> A focused Markdown workspace for creating polished social media cards.

## Why MarkCard Studio?
- **Write in Markdown** while layout, color, and pagination happen automatically.
- **Choose a visual theme** for notes, tutorials, product updates, and editorial content.
- **Target any canvas** with presets for portrait, vertical video, square, and custom dimensions.
- **Keep work local** and export PNG, JPG, PDF, or a stitched long image.

## Creation workflow
1. Write or import Markdown content.
2. Choose a platform size and pagination strategy.
3. Select a theme, background, and card metadata.
4. Export the complete set in the format you need.

## Rich content
| Capability | Example |
| :--- | :--- |
| Code | Syntax-highlighted snippets |
| Math | $E = mc^2$ |
| Diagrams | Mermaid flowcharts |
| Structure | Tables, tasks, callouts, and footnotes |

## Tasks
- [x] Draft the main idea
- [x] Review the generated cards
- [ ] Export and publish the finished set

## Code example
\`\`\`javascript
const card = {
  format: "PNG",
  ratio: "3:4",
  quality: "high",
};
\`\`\`

## Diagram example
\`\`\`mermaid
graph LR
  A[Markdown] --> B[Pagination]
  B --> C[Theme]
  C --> D[Export]
\`\`\`

::: tip Writing tip
Use headings to create clear card boundaries.
:::

> Turn today's idea into something ready to share.`;

const pageImageClasses = [
  "hero-mountain",
  "hero-books",
  "hero-bedroom",
  "hero-run",
  "hero-journal",
  "hero-sunset",
];

const platforms = [
  { name: "小红书", size: "1080 x 1440", width: 1080, height: 1440, ratio: "3:4", color: "#ff2442", description: "小红书图文笔记，最佳 3:4 比例" },
  { name: "抖音", size: "1080 x 1920", width: 1080, height: 1920, ratio: "9:16", color: "#111827", description: "抖音全屏图文 / 挂卡短视频，9:16 比例" },
  { name: "微博", size: "1080 x 1260", width: 1080, height: 1260, ratio: "6:7", color: "#ff8a00", description: "微博九宫格配图与图文长卡片" },
  { name: "通用方形", size: "1080 x 1080", width: 1080, height: 1080, ratio: "1:1", color: "#6366f1", description: "通用社交媒体 1:1 正方形配图" },
  { name: "自定义尺寸", size: "自定义", width: 1200, height: 1600, ratio: "自定义", color: "#8b5cf6", custom: true, description: "自定义卡片宽度、高度与画幅比例" },
];
const imageCache = new Map();
const SETTINGS_KEY = "markcard_studio_settings_v1";
const EXPORT_FORMATS = ["PNG", "JPG", "PDF", "长图(PNG)"];
const PAGINATION_MODES = ["h2", "h3", "delimiter", "length", "smart"];
const BACKGROUND_TYPES = ["solid", "gradient", "pattern", "image", "wallpaper"];
const MIN_CUSTOM_ASPECT_RATIO = 0.4;
const MAX_CUSTOM_ASPECT_RATIO = 2.5;

export function useStudioDocument() {
  const initialMarkdown = i18n.global.locale.value === "zh-CN" ? defaultMarkdown : defaultMarkdownEnglish;
  const markdownSource = ref(initialMarkdown);
  const sourcePath = ref("");
  const savedContent = ref(initialMarkdown);
  const pages = ref([createFallbackPage()]);
  const activePageIndex = ref(0);
  const isLoadingDocument = ref(false);
  const exportMessage = ref("");
  const showTopLeft = ref(true);
  const showTopRight = ref(true);
  const showBottomLeft = ref(true);
  const showBottomRight = ref(true);
  const showPageNumber = showTopRight; // Alias for backwards compatibility
  const selectedTheme = ref(DEFAULT_THEME.name);
  const selectedPlatformName = ref("小红书");
  const selectedFormat = ref("PNG");
  const scale = ref(2);
  const transparentBackground = ref(false);
  const solidBackground = ref(true);
  const backgroundColor = ref("#69eacb");
  const backgroundType = ref("gradient"); // "solid" | "gradient" | "pattern" | "image"
  const backgroundValue = ref("linear-gradient(135deg, #69eacb 0%, #eaccf8 48%, #6654f1 100%)");
  const exportPath = ref("");
  const zoom = ref(74);
  const activeTab = ref("平台");
  const customWidth = ref(1200);
  const customHeight = ref(1600);

  const globalMeta = ref({
    kicker: "@MarkCard",
    date: "",
    quote: t("runtime.defaultQuote"),
  });
  const customPageMetas = ref({});

  function setBackgroundType(type) {
    backgroundType.value = type;
  }

  function setBackgroundValue(val) {
    backgroundValue.value = val;
    if (backgroundType.value === "solid" && val.startsWith("#")) {
      backgroundColor.value = val;
    }
  }

  // --- Pagination Rules State ---
  const paginationMode = ref("h2"); // "h2" | "h3" | "delimiter" | "length" | "smart"
  const customDelimiter = ref("---");
  const maxPageLength = ref(300);

  function setPaginationMode(mode) {
    paginationMode.value = mode;
  }

  function setCustomDelimiter(delimiter) {
    customDelimiter.value = delimiter;
  }

  function setMaxPageLength(len) {
    const val = parseInt(len, 10);
    if (!isNaN(val) && val >= 50) {
      maxPageLength.value = val;
    }
  }

  function restoreUserSettings() {
    try {
      const rawSettings = localStorage.getItem(SETTINGS_KEY);
      if (!rawSettings) return;

      const settings = JSON.parse(rawSettings);
      if (!settings || typeof settings !== "object") return;

      if (typeof settings.showTopLeft === "boolean") showTopLeft.value = settings.showTopLeft;
      if (typeof settings.showTopRight === "boolean") showTopRight.value = settings.showTopRight;
      if (typeof settings.showBottomLeft === "boolean") showBottomLeft.value = settings.showBottomLeft;
      if (typeof settings.showBottomRight === "boolean") showBottomRight.value = settings.showBottomRight;
      if (THEME_LIST.some((theme) => theme.name === settings.selectedTheme)) selectedTheme.value = settings.selectedTheme;
      if (platforms.some((platform) => platform.name === settings.selectedPlatformName)) selectedPlatformName.value = settings.selectedPlatformName;
      if (EXPORT_FORMATS.includes(settings.selectedFormat)) selectedFormat.value = settings.selectedFormat;
      if ([1, 2, 3].includes(settings.scale)) scale.value = settings.scale;
      if (typeof settings.transparentBackground === "boolean") transparentBackground.value = settings.transparentBackground;
      if (typeof settings.solidBackground === "boolean") solidBackground.value = settings.solidBackground;
      if (typeof settings.backgroundColor === "string") backgroundColor.value = settings.backgroundColor;
      if (BACKGROUND_TYPES.includes(settings.backgroundType)) backgroundType.value = settings.backgroundType;
      if (typeof settings.backgroundValue === "string") backgroundValue.value = settings.backgroundValue;
      if (typeof settings.exportPath === "string") exportPath.value = settings.exportPath;
      if (Number.isFinite(settings.zoom)) zoom.value = Math.min(100, Math.max(52, settings.zoom));
      if (Number.isFinite(settings.customWidth)) customWidth.value = Math.min(3840, Math.max(300, settings.customWidth));
      if (Number.isFinite(settings.customHeight)) customHeight.value = Math.min(3840, Math.max(300, settings.customHeight));
      if (PAGINATION_MODES.includes(settings.paginationMode)) paginationMode.value = settings.paginationMode;
      if (typeof settings.customDelimiter === "string") customDelimiter.value = settings.customDelimiter;
      if (Number.isFinite(settings.maxPageLength)) maxPageLength.value = Math.max(50, settings.maxPageLength);

      if (settings.globalMeta && typeof settings.globalMeta === "object") {
        if (typeof settings.globalMeta.kicker === "string") globalMeta.value.kicker = settings.globalMeta.kicker;
        if (typeof settings.globalMeta.date === "string") globalMeta.value.date = settings.globalMeta.date;
        if (typeof settings.globalMeta.quote === "string") globalMeta.value.quote = settings.globalMeta.quote;
      }
    } catch {
      // Ignore corrupted or unavailable local settings.
    }
  }

  function persistUserSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        showTopLeft: showTopLeft.value,
        showTopRight: showTopRight.value,
        showBottomLeft: showBottomLeft.value,
        showBottomRight: showBottomRight.value,
        selectedTheme: selectedTheme.value,
        selectedPlatformName: selectedPlatformName.value,
        selectedFormat: selectedFormat.value,
        scale: scale.value,
        transparentBackground: transparentBackground.value,
        solidBackground: solidBackground.value,
        backgroundColor: backgroundColor.value,
        backgroundType: backgroundType.value,
        backgroundValue: backgroundValue.value,
        exportPath: exportPath.value,
        zoom: zoom.value,
        customWidth: customWidth.value,
        customHeight: customHeight.value,
        paginationMode: paginationMode.value,
        customDelimiter: customDelimiter.value,
        maxPageLength: maxPageLength.value,
        globalMeta: globalMeta.value,
      }));
    } catch {
      // Local storage may be unavailable or full; settings remain in memory.
    }
  }

  restoreUserSettings();
  setCustomDimensions(customWidth.value, customHeight.value);

  watch(
    [
      showTopLeft,
      showTopRight,
      showBottomLeft,
      showBottomRight,
      selectedTheme,
      selectedPlatformName,
      selectedFormat,
      scale,
      transparentBackground,
      solidBackground,
      backgroundColor,
      backgroundType,
      backgroundValue,
      exportPath,
      zoom,
      customWidth,
      customHeight,
      paginationMode,
      customDelimiter,
      maxPageLength,
      globalMeta,
    ],
    persistUserSettings,
    { deep: true },
  );

  // --- History Management ---
  const undoStack = ref([]);
  const redoStack = ref([]);
  const maxHistorySize = 100;

  let lastCommittedState = initialMarkdown;
  let historyDebounceTimer = null;
  let isUndoRedoOperation = false;

  const canUndo = computed(() => undoStack.value.length > 0 || markdownSource.value !== lastCommittedState);
  const canRedo = computed(() => redoStack.value.length > 0);

  // --- Auto-Save Management ---
  const DRAFT_KEY = "markcard_studio_draft_v1";
  const autoSaveStatus = ref(t("runtime.autosaveEnabled"));
  let autoSaveTimer = null;
  let isRestoringDraft = false;

  // Restore draft from localStorage on load if available
  try {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      const parsed = JSON.parse(savedDraft);
      if (parsed && typeof parsed.content === "string" && parsed.content.trim()) {
        if (parsed.content.startsWith("# 未命名作品")) {
          localStorage.removeItem(DRAFT_KEY);
        } else {
          markdownSource.value = parsed.content;
          savedContent.value = parsed.content;
          lastCommittedState = parsed.content;
          isRestoringDraft = true;
          autoSaveStatus.value = t("runtime.draftRestored");
        }
      }
    }
  } catch {
    // Ignore localStorage parse errors
  }

  function pushUndoState(state) {
    if (undoStack.value.length > 0 && undoStack.value[undoStack.value.length - 1] === state) {
      return;
    }
    undoStack.value.push(state);
    if (undoStack.value.length > maxHistorySize) {
      undoStack.value.shift();
    }
  }

  function flushPendingHistory() {
    if (historyDebounceTimer) {
      clearTimeout(historyDebounceTimer);
      historyDebounceTimer = null;
    }
    if (markdownSource.value !== lastCommittedState) {
      pushUndoState(lastCommittedState);
      lastCommittedState = markdownSource.value;
    }
  }

  function recordDiscreteChange(newContent) {
    if (historyDebounceTimer) {
      clearTimeout(historyDebounceTimer);
      historyDebounceTimer = null;
    }
    if (markdownSource.value !== lastCommittedState) {
      pushUndoState(lastCommittedState);
    }
    pushUndoState(markdownSource.value);
    redoStack.value = [];
    isUndoRedoOperation = true;
    markdownSource.value = newContent;
    lastCommittedState = newContent;
  }

  function scheduleTypingHistory(newContent) {
    if (isUndoRedoOperation) return;

    if (historyDebounceTimer) {
      clearTimeout(historyDebounceTimer);
    }

    historyDebounceTimer = setTimeout(() => {
      if (lastCommittedState !== newContent) {
        pushUndoState(lastCommittedState);
        redoStack.value = [];
        lastCommittedState = newContent;
      }
      historyDebounceTimer = null;
    }, 450);
  }

  watch(markdownSource, (newVal) => {
    if (isUndoRedoOperation) {
      isUndoRedoOperation = false;
    } else {
      scheduleTypingHistory(newVal);
    }

    if (isRestoringDraft) {
      isRestoringDraft = false;
      return;
    }

    autoSaveStatus.value = t("runtime.editing");
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    autoSaveTimer = setTimeout(async () => {
      autoSaveStatus.value = t("runtime.saving");

      if (!sourcePath.value) {
        try {
          localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({
              content: newVal,
              updatedAt: Date.now(),
            }),
          );
          autoSaveStatus.value = t("runtime.draftBackedUp");
        } catch {
          autoSaveStatus.value = t("runtime.draftBackupFailed");
        }
      } else {
        try {
          await saveDocument(true);
          autoSaveStatus.value = t("runtime.fileAutosaved");
        } catch {
          autoSaveStatus.value = t("runtime.fileAutosaveFailed");
        }
      }
    }, 1200);
  });

  function undo() {
    flushPendingHistory();
    if (undoStack.value.length === 0) return;

    const previousState = undoStack.value.pop();
    redoStack.value.push(markdownSource.value);

    isUndoRedoOperation = true;
    markdownSource.value = previousState;
    lastCommittedState = previousState;
  }

  function redo() {
    if (redoStack.value.length === 0) return;

    flushPendingHistory();

    const nextState = redoStack.value.pop();
    pushUndoState(markdownSource.value);

    isUndoRedoOperation = true;
    markdownSource.value = nextState;
    lastCommittedState = nextState;
  }

  function resetHistory(initialContent = markdownSource.value) {
    if (historyDebounceTimer) {
      clearTimeout(historyDebounceTimer);
      historyDebounceTimer = null;
    }
    undoStack.value = [];
    redoStack.value = [];
    lastCommittedState = initialContent;
  }

  async function openExportFolderPicker() {
    try {
      const selected = await invoke("pick_export_folder");
      if (selected) {
        exportPath.value = selected;
        return selected;
      }
    } catch {
      const manual = prompt(t("publish.pathPrompt"), exportPath.value);
      if (manual && manual.trim()) {
        exportPath.value = manual.trim();
        return manual.trim();
      }
    }
    return null;
  }

  const lineCount = computed(() => markdownSource.value.split("\n").length);
  const wordCount = computed(() => markdownSource.value.replace(/\s/g, "").length);
  const isDirty = computed(() => markdownSource.value !== savedContent.value);

  const markdownLines = computed(() =>
    markdownSource.value.split("\n").map((text, index) => ({
      no: index + 1,
      text,
      type: getLineType(text),
    })),
  );
  const selectedPlatform = computed(() => {
    const found = platforms.find((platform) => platform.name === selectedPlatformName.value) ?? platforms[0];
    if (found.custom) {
      return {
        ...found,
        width: customWidth.value,
        height: customHeight.value,
        size: `${customWidth.value} x ${customHeight.value}`,
        ratio: `${customWidth.value}:${customHeight.value}`,
      };
    }
    return found;
  });
  const canvasRatio = computed(() => `${selectedPlatform.value.width} / ${selectedPlatform.value.height}`);
  const canvasSizeLabel = computed(
    () => `${selectedPlatform.value.width} x ${selectedPlatform.value.height}`,
  );
  const selectedThemeClass = computed(() => getThemeByName(selectedTheme.value).class);

  const selectedPage = computed(
    () => pages.value[activePageIndex.value] ?? pages.value[0] ?? createFallbackPage(),
  );

  const canGoPrevious = computed(() => activePageIndex.value > 0);
  const canGoNext = computed(() => activePageIndex.value < pages.value.length - 1);

  let parseVersion = 0;
  let debounceTimer = null;
  let paginationAbortController = null;

  async function updatePagesNow() {
    paginationAbortController?.abort();
    const abortController = new AbortController();
    paginationAbortController = abortController;
    const version = ++parseVersion;
    isLoadingDocument.value = true;
    let paginationSession = null;

    try {
      const parsed = parseMarkdownSections(
        markdownSource.value,
        paginationMode.value,
        customDelimiter.value,
        maxPageLength.value,
      );
      const nextPages = [];
      paginationSession = createMeasuredPaginationSession({
        platform: selectedPlatform.value,
        themeClass: selectedThemeClass.value,
        showTopLeft: showTopLeft.value,
        showTopRight: showTopRight.value,
        showBottomLeft: showBottomLeft.value,
        showBottomRight: showBottomRight.value,
        signal: abortController.signal,
      });

      for (let index = 0; index < parsed.length; index += 1) {
        const section = parsed[index];
        const allBlocks = parseBlocks(section.bodyMarkdown);
        await resolveBlockImages(allBlocks, sourcePath.value);
        if (abortController.signal.aborted) return;
        const resolvedMarkdown = section.bodyMarkdown;
        const imageUrl = allBlocks.find((block) => block.type === "image")?.src || "";
        const blockPages = await paginationSession.paginate(
          allBlocks,
          {
            title: section.title,
            cover: section.cover,
            maxPageLength: ["length", "smart"].includes(paginationMode.value)
              ? maxPageLength.value
              : null,
          },
        );
        if (version !== parseVersion) return;

        const customMeta = customPageMetas.value[index] || {};
        const baseKicker = customMeta.kicker || section.kicker || globalMeta.value.kicker || "@MarkCard";
        const baseDate = customMeta.date || section.date || globalMeta.value.date || getTodayDateString();
        const baseQuote = customMeta.quote || section.quote || globalMeta.value.quote || t("runtime.defaultQuote");

        // Main page (first block-page)
        nextPages.push({
          ...section,
          label: index === 0 ? t("runtime.cover") : String(nextPages.length),
          kicker: baseKicker,
          date: baseDate,
          quote: baseQuote,
          imageClass: pageImageClasses[index % pageImageClasses.length],
          blocks: blockPages[0] || [],
          bodyMarkdown: resolvedMarkdown,
          body: blocksToPreviewText(blockPages[0] || []),
          imageUrl,
          isOverflow: false,
        });

        // Overflow pages (additional block-pages for the same section)
        for (let subIdx = 1; subIdx < blockPages.length; subIdx++) {
          const overflowBlocks = blockPages[subIdx];
          nextPages.push({
            title: section.title,
            label: String(nextPages.length),
            kicker: baseKicker,
            date: baseDate,
            quote: baseQuote,
            imageClass: pageImageClasses[index % pageImageClasses.length],
            blocks: overflowBlocks,
            bodyMarkdown: resolvedMarkdown,
            body: blocksToPreviewText(overflowBlocks),
            imageUrl: "",
            cover: false,
            isOverflow: true,
          });
        }
      }

      if (version !== parseVersion) return;

      pages.value = nextPages.length ? nextPages : [createFallbackPage()];
      if (activePageIndex.value > pages.value.length - 1) {
        activePageIndex.value = Math.max(0, pages.value.length - 1);
      }
    } catch (error) {
      if (error?.name !== "AbortError") throw error;
    } finally {
      paginationSession?.destroy();
      if (paginationAbortController === abortController) {
        paginationAbortController = null;
      }
      if (version === parseVersion) {
        isLoadingDocument.value = false;
      }
    }
  }

  watch(
    sourcePath,
    () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      updatePagesNow();
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    paginationAbortController?.abort();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (historyDebounceTimer) clearTimeout(historyDebounceTimer);
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
  });

  watch(
    markdownSource,
    () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        updatePagesNow();
      }, 120);
    },
  );

  watch([paginationMode, customDelimiter, maxPageLength], () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    updatePagesNow();
  });

  watch([
    selectedPlatformName,
    customWidth,
    customHeight,
    selectedTheme,
    showTopLeft,
    showTopRight,
    showBottomLeft,
    showBottomRight,
  ], () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    updatePagesNow();
  });

  watch(
    () => i18n.global.locale.value,
    () => {
      const defaultQuotes = ["zh-CN", "en-US"].map(
        (locale) => i18n.global.getLocaleMessage(locale)?.runtime?.defaultQuote,
      );
      if (defaultQuotes.includes(globalMeta.value.quote)) {
        globalMeta.value.quote = t("runtime.defaultQuote");
      }
      if (["已开启", "On"].includes(autoSaveStatus.value)) {
        autoSaveStatus.value = t("runtime.autosaveEnabled");
      }
      updatePagesNow();
    },
  );

  async function loadDocumentFromContent(file) {
    if (!file || typeof file.content !== "string") return;
    markdownSource.value = file.content;
    savedContent.value = file.content;
    sourcePath.value = file.path || "";
    if (file.path) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Ignore
      }
    }
    resetHistory(file.content);
    activePageIndex.value = 0;
    const displayName = file.name || file.fileName || t("runtime.markdownDocument");
    autoSaveStatus.value = file.path ? t("runtime.fileOpened") : t("runtime.contentImported");
    if (debounceTimer) clearTimeout(debounceTimer);
    await updatePagesNow();
    exportMessage.value = file.path
      ? t("runtime.opened", { name: displayName, count: pages.value.length })
      : t("runtime.imported", { name: displayName, count: pages.value.length });
  }

  async function openDocumentFromDialog() {
    isLoadingDocument.value = true;
    try {
      const file = await invoke("open_markdown_file");
      if (!file) return null;

      await loadDocumentFromContent(file);
      return file;
    } catch (err) {
      exportMessage.value = t("runtime.openFailed", { error: err.message || err });
      return null;
    } finally {
      isLoadingDocument.value = false;
    }
  }

  async function saveDocument(isAutoSave = false) {
    try {
      if (isAutoSave && !sourcePath.value) {
        return null;
      }

      const result = await invoke("save_markdown_file", {
        path: sourcePath.value || null,
        content: markdownSource.value,
      });

      if (result?.path) {
        sourcePath.value = result.path;
        savedContent.value = markdownSource.value;
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // Ignore
        }

        if (!isAutoSave) {
          exportMessage.value = t("runtime.savedTo", { name: result.fileName || result.path });
          autoSaveStatus.value = t("runtime.fileSaved");
        } else {
          autoSaveStatus.value = t("runtime.fileAutosaved");
        }
        return result.path;
      }
      return null;
    } catch (err) {
      if (!isAutoSave) {
        exportMessage.value = t("runtime.saveFailed", { error: err.message || err });
      }
      autoSaveStatus.value = t("runtime.saveFailedShort");
      return null;
    }
  }

  function createNewDocument() {
    const newContent = `# ${t("document.title")}

> ${t("document.lead")}

## 1. ${t("document.firstPage")}
${t("document.inputHere")}`;
    markdownSource.value = newContent;
    sourcePath.value = "";
    savedContent.value = newContent;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore
    }
    resetHistory(newContent);
    activePageIndex.value = 0;
    exportMessage.value = t("runtime.newArtwork");
    autoSaveStatus.value = t("runtime.autosaveEnabled");
    if (debounceTimer) clearTimeout(debounceTimer);
    updatePagesNow();
  }

  function addPageTemplate() {
    const nextIndex = pages.value.length;
    const newContent = `${markdownSource.value.trim()}\n\n## ${nextIndex}. ${t("document.newPage")}\n${t("document.continueHere")}`;
    recordDiscreteChange(newContent);
    activePageIndex.value = Math.max(0, pages.value.length - 1);
  }

  function deletePage(index) {
    if (pages.value.length <= 1) return;
    const parsed = parseMarkdownSections(markdownSource.value);
    if (index < 0 || index >= parsed.length) return;

    parsed.splice(index, 1);

    const title = parsed[0]?.cover ? `# ${parsed[0].title}\n\n${parsed[0].bodyMarkdown}` : `# ${t("document.title")}`;
    const rest = parsed.slice(1).map((sec) => sec.title ? `## ${sec.title}\n${sec.bodyMarkdown}` : `---\n${sec.bodyMarkdown}`).join("\n\n");

    const newContent = `${title}\n\n${rest}`.trim();
    recordDiscreteChange(newContent);
    if (activePageIndex.value >= pages.value.length - 1) {
      activePageIndex.value = Math.max(0, pages.value.length - 2);
    }
  }

  function movePage({ fromIndex, toIndex }) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const parsed = parseMarkdownSections(markdownSource.value);
    if (fromIndex >= parsed.length || toIndex >= parsed.length) return;

    const [moved] = parsed.splice(fromIndex, 1);
    parsed.splice(toIndex, 0, moved);

    const title = parsed[0]?.cover ? `# ${parsed[0].title}\n\n${parsed[0].bodyMarkdown}` : `# ${t("document.title")}`;
    const rest = parsed.slice(1).map((sec) => sec.title ? `## ${sec.title}\n${sec.bodyMarkdown}` : `---\n${sec.bodyMarkdown}`).join("\n\n");

    const newContent = `${title}\n\n${rest}`.trim();
    recordDiscreteChange(newContent);
    activePageIndex.value = toIndex;
  }

  function selectPage(index) {
    activePageIndex.value = index;
  }

  function nextPage() {
    if (canGoNext.value) activePageIndex.value += 1;
  }

  function previousPage() {
    if (canGoPrevious.value) activePageIndex.value -= 1;
  }

  function setZoom(nextZoom) {
    zoom.value = Math.min(100, Math.max(52, nextZoom));
  }

  function toggleTheme() {
    const themes = THEME_LIST.map((t) => t.name);
    const index = themes.indexOf(selectedTheme.value);
    selectedTheme.value = themes[(index + 1) % themes.length];
  }

  function setCustomWidth(w) {
    const val = parseInt(w, 10);
    if (!isNaN(val) && val > 0) {
      customWidth.value = Math.min(3840, Math.max(300, val));
      const minHeight = Math.ceil(customWidth.value / MAX_CUSTOM_ASPECT_RATIO);
      const maxHeight = Math.floor(customWidth.value / MIN_CUSTOM_ASPECT_RATIO);
      customHeight.value = Math.min(3840, Math.max(300, minHeight, Math.min(customHeight.value, maxHeight)));
    }
  }

  function setCustomHeight(h) {
    const val = parseInt(h, 10);
    if (!isNaN(val) && val > 0) {
      customHeight.value = Math.min(3840, Math.max(300, val));
      const minWidth = Math.ceil(customHeight.value * MIN_CUSTOM_ASPECT_RATIO);
      const maxWidth = Math.floor(customHeight.value * MAX_CUSTOM_ASPECT_RATIO);
      customWidth.value = Math.min(3840, Math.max(300, minWidth, Math.min(customWidth.value, maxWidth)));
    }
  }

  function setCustomDimensions(w, h) {
    setCustomWidth(w);
    setCustomHeight(h);
  }

  function swapDimensions() {
    const temp = customWidth.value;
    customWidth.value = customHeight.value;
    customHeight.value = temp;
  }

  function updateGlobalMeta(meta) {
    if (meta.kicker !== undefined) globalMeta.value.kicker = meta.kicker;
    if (meta.date !== undefined) globalMeta.value.date = meta.date;
    if (meta.quote !== undefined) globalMeta.value.quote = meta.quote;

    pages.value.forEach((page, idx) => {
      if (meta.kicker !== undefined) page.kicker = meta.kicker;
      if (meta.date !== undefined) page.date = meta.date;
      if (meta.quote !== undefined) page.quote = meta.quote;
      customPageMetas.value[idx] = { ...page };
    });
  }

  return {
    markdownSource,
    sourcePath,
    savedContent,
    isDirty,
    pages,
    markdownLines,
    selectedPage,
    activePageIndex,
    isLoadingDocument,
    exportMessage,
    autoSaveStatus,
    showPageNumber,
    showTopLeft,
    showTopRight,
    showBottomLeft,
    showBottomRight,
    selectedTheme,
    selectedPlatformName,
    selectedFormat,
    scale,
    transparentBackground,
    solidBackground,
    backgroundColor,
    exportPath,
    zoom,
    activeTab,
    customWidth,
    customHeight,
    lineCount,
    wordCount,
    platforms,
    selectedPlatform,
    canvasRatio,
    canvasSizeLabel,
    selectedThemeClass,
    canGoPrevious,
    canGoNext,
    canUndo,
    canRedo,
    undo,
    redo,
    recordDiscreteChange,
    resetHistory,
    loadDocumentFromContent,
    openDocumentFromDialog,
    saveDocument,
    createNewDocument,
    addPageTemplate,
    deletePage,
    movePage,
    selectPage,
    nextPage,
    previousPage,
    setZoom,
    toggleTheme,
    backgroundType,
    backgroundValue,
    setBackgroundType,
    setBackgroundValue,
    paginationMode,
    customDelimiter,
    maxPageLength,
    setPaginationMode,
    setCustomDelimiter,
    setMaxPageLength,
    setCustomWidth,
    setCustomHeight,
    setCustomDimensions,
    swapDimensions,
    openExportFolderPicker,
    updateGlobalMeta,
  };
}

function createFallbackPage() {
  return {
    label: t("runtime.cover"),
    kicker: "@MarkCard",
    title: t("document.title"),
    bodyMarkdown: t("document.defaultBody"),
    body: [t("document.defaultBody")],
    imageClass: pageImageClasses[0],
    imageUrl: "",
    cover: true,
  };
}

function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
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

  return t("document.title");
}

function parseMarkdownSections(source, mode = "h2", delimiter = "---", maxLen = 300) {
  if (!source || !source.trim()) {
    return [createFallbackPage()];
  }

  const lines = source.split("\n");
  const documentTitle = extractDocumentTitle(lines);
  const documentTitleLineIndex = lines.findIndex((line) => /^#\s+/.test(line));

  const sections = [];
  const introLines = [];
  let currentSection = null;
  let activeFence = "";

  function isBreakLine(line) {
    const trimmed = line.trim();

    if (mode === "h2") {
      return /^##\s+/.test(line) || /^---$|^\*\*\*$|^<!--\s*page\s*-->/i.test(trimmed);
    }

    if (mode === "h3") {
      return /^#{2,3}\s+/.test(line) || /^---$|^\*\*\*$|^<!--\s*page\s*-->/i.test(trimmed);
    }

    if (mode === "delimiter") {
      if (delimiter && trimmed === delimiter.trim()) return true;
      return /^---$|^\*\*\*$|^<!--\s*page\s*-->/i.test(trimmed);
    }

    if (mode === "length") {
      return /^#{2,6}\s+/.test(line) || /^---$|^\*\*\*$|^<!--\s*page\s*-->/i.test(trimmed);
    }

    if (mode === "smart") {
      return /^#{2,3}\s+/.test(line) || /^---$|^\*\*\*$|^<!--\s*page\s*-->/i.test(trimmed);
    }

    return /^##\s+/.test(line);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);

    if (activeFence) {
      const marker = fenceMatch?.[1] || "";
      const isClosingFence = marker[0] === activeFence[0]
        && marker.length >= activeFence.length
        && marker.length === trimmed.length;
      if (isClosingFence) activeFence = "";
      if (currentSection) currentSection.bodyMarkdown += `${line}\n`;
      else introLines.push(line);
      continue;
    }

    if (fenceMatch) {
      activeFence = fenceMatch[1];
      if (currentSection) currentSection.bodyMarkdown += `${line}\n`;
      else introLines.push(line);
      continue;
    }

    if (i === documentTitleLineIndex) {
      continue;
    }

    if (isBreakLine(line)) {
      if (currentSection) {
        sections.push(currentSection);
      }
      const isExplicitBreak =
        /^---$|^\*\*\*$|^<!--\s*page\s*-->/i.test(line.trim()) ||
        (mode === "delimiter" && line.trim() === delimiter?.trim());
      currentSection = {
        title: isExplicitBreak ? "" : cleanMarkdownText(line),
        bodyMarkdown: "",
        cover: false,
      };
      continue;
    }

    if (currentSection) {
      currentSection.bodyMarkdown += `${line}\n`;
    } else {
      introLines.push(line);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  let finalSections = sections;

  if (!finalSections.length) {
    const remainingLines = lines.filter((_, index) => index !== documentTitleLineIndex);
    finalSections = [{
      title: "",
      bodyMarkdown: remainingLines.join("\n"),
      cover: false,
    }];
  }

  const validSections = finalSections.filter(
    (sec) => Boolean(sec.title && sec.title.trim()) || Boolean(sec.bodyMarkdown && sec.bodyMarkdown.trim())
  );
  const sectionsToRender = validSections.length ? validSections : finalSections;

  const coverBodyMarkdown = introLines.join("\n").trim();
  const pages = [
    {
      title: documentTitle,
      bodyMarkdown: coverBodyMarkdown,
      cover: true,
    },
    ...sectionsToRender.map((section) => ({
      title: section.title,
      bodyMarkdown: section.bodyMarkdown.trim(),
      cover: false,
    })),
  ];

  return pages.length ? pages : [createFallbackPage()];
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

function getLineType(text) {
  if (/^#{1,6}\s+/.test(text)) return "heading";
  if (/^>\s?/.test(text)) return "quote";
  if (/^[-*]\s+/.test(text)) return "list";
  return "";
}

async function resolveBlockImages(blocks, basePath) {
  for (const block of blocks || []) {
    if (block.type !== "image" || !block.src) continue;
    const replacement = await tryResolveImage(block.src, basePath);
    if (replacement) block.src = replacement;
  }
}

async function tryResolveImage(target, basePath) {
  if (!target) return "";

  let raw = target.trim().replace(/^<(.+)>$/, "$1").replace(/\s+["'].*["']$/, "");

  if (raw.startsWith("file://")) {
    raw = raw.replace(/^file:\/\//, "");
  }

  if (/^(https?:|data:|blob:)/i.test(raw)) {
    return raw;
  }

  const cacheKey = `${basePath || ""}::${raw}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }

  const promise = (async () => {
    try {
      const resolved = await invoke("resolve_local_image", {
        path: raw,
        basePath: basePath || null,
      });
      return resolved?.dataUrl || "";
    } catch {
      return "";
    }
  })();

  imageCache.set(cacheKey, promise);
  return promise;
}
