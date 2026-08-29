<script setup>
import { EditorState } from "@codemirror/state";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "./AppIcon.vue";
import MarkdownEditorToolbar from "./MarkdownEditorToolbar.vue";

const props = defineProps({
  documentPath: {
    type: String,
    default: "",
  },
  lineCount: {
    type: Number,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  modelValue: {
    type: String,
    required: true,
  },
  wordCount: {
    type: Number,
    required: true,
  },
  isDirty: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "open-markdown",
  "open-markdown-content",
  "save-markdown",
  "update:modelValue",
  "undo",
  "redo",
]);
const editorElement = ref(null);
const fileInputRef = ref(null);
const editorView = shallowRef(null);
const isDraggingOver = ref(false);
const { t } = useI18n();

let isInternalChange = false;

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    color: "#475569",
    backgroundColor: "transparent",
    fontSize: "15px",
  },
  ".cm-scroller": {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    lineHeight: "27px",
    overflow: "auto",
  },
  ".cm-content": {
    minHeight: "100%",
    padding: "12px 16px 12px 8px",
    caretColor: "#4f46e5",
  },
  ".cm-line": {
    padding: "0 2px",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "0",
    color: "#94a3b8",
  },
  ".cm-lineNumbers": {
    minWidth: "48px",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 10px 0 0",
    textAlign: "right",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(99, 102, 241, 0.06)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(99, 102, 241, 0.06)",
    color: "#4f46e5",
  },
  "&.cm-focused": {
    outline: "none",
  },
});

function createEditor() {
  if (!editorElement.value) return;

  editorView.value = new EditorView({
    parent: editorElement.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        lineNumbers(),
        markdown(),
        keymap.of([
          indentWithTab,
          ...defaultKeymap,
          {
            key: "Mod-z",
            run: () => {
              emit("undo");
              return true;
            },
          },
          {
            key: "Mod-Shift-z",
            run: () => {
              emit("redo");
              return true;
            },
          },
          {
            key: "Mod-y",
            run: () => {
              emit("redo");
              return true;
            },
          },
          {
            key: "Mod-s",
            run: () => {
              emit("save-markdown");
              return true;
            },
          },
          {
            key: "Mod-o",
            run: () => {
              emit("open-markdown");
              return true;
            },
          },
          {
            key: "Mod-b",
            run: () => {
              applyFormat({ type: "bold" });
              return true;
            },
          },
          {
            key: "Mod-i",
            run: () => {
              applyFormat({ type: "italic" });
              return true;
            },
          },
        ]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isInternalChange) {
            emit("update:modelValue", update.state.doc.toString());
          }
        }),
        editorTheme,
      ],
    }),
  });
}

function applyFormat({ type, payload }) {
  const view = editorView.value;
  if (!view) return;

  const { from, to } = view.state.selection.main;
  const isCollapsed = from === to;
  const selectedText = view.state.sliceDoc(from, to);

  let replacement = "";
  let selOffsetFrom = from;
  let selOffsetTo = to;

  switch (type) {
    case "heading":
    case "h1": {
      const level = Number(payload) || 1;
      const prefix = "#".repeat(level);
      const titleMap = {
        1: "一级标题",
        2: "二级标题",
        3: "三级标题",
        4: "四级标题",
      };
      const placeholder = titleMap[level] || `${level}级标题`;
      if (isCollapsed) {
        replacement = `\n${prefix} ${placeholder}\n`;
        selOffsetFrom = from + prefix.length + 2;
        selOffsetTo = selOffsetFrom + placeholder.length;
      } else {
        replacement = `\n${prefix} ${selectedText}\n`;
        selOffsetFrom = from + prefix.length + 2;
        selOffsetTo = from + prefix.length + 2 + selectedText.length;
      }
      break;
    }
    case "paragraph": {
      if (selectedText) {
        replacement = selectedText.replace(/^#{1,6}\s+/, "");
        selOffsetFrom = from;
        selOffsetTo = from + replacement.length;
      }
      break;
    }
    case "bold": {
      if (isCollapsed) {
        replacement = "**加粗文本**";
        selOffsetFrom = from + 2;
        selOffsetTo = from + 6;
      } else if (selectedText.startsWith("**") && selectedText.endsWith("**") && selectedText.length >= 4) {
        replacement = selectedText.slice(2, -2);
        selOffsetFrom = from;
        selOffsetTo = from + replacement.length;
      } else {
        replacement = `**${selectedText}**`;
        selOffsetFrom = from + 2;
        selOffsetTo = from + 2 + selectedText.length;
      }
      break;
    }
    case "italic": {
      if (isCollapsed) {
        replacement = "*斜体文本*";
        selOffsetFrom = from + 1;
        selOffsetTo = from + 5;
      } else if (selectedText.startsWith("*") && selectedText.endsWith("*") && !selectedText.startsWith("**") && selectedText.length >= 2) {
        replacement = selectedText.slice(1, -1);
        selOffsetFrom = from;
        selOffsetTo = from + replacement.length;
      } else {
        replacement = `*${selectedText}*`;
        selOffsetFrom = from + 1;
        selOffsetTo = from + 1 + selectedText.length;
      }
      break;
    }
    case "strikethrough": {
      if (isCollapsed) {
        replacement = "~~删除线文本~~";
        selOffsetFrom = from + 2;
        selOffsetTo = from + 7;
      } else if (selectedText.startsWith("~~") && selectedText.endsWith("~~") && selectedText.length >= 4) {
        replacement = selectedText.slice(2, -2);
        selOffsetFrom = from;
        selOffsetTo = from + replacement.length;
      } else {
        replacement = `~~${selectedText}~~`;
        selOffsetFrom = from + 2;
        selOffsetTo = from + 2 + selectedText.length;
      }
      break;
    }
    case "underline": {
      if (isCollapsed) {
        replacement = "<u>下划线文本</u>";
        selOffsetFrom = from + 3;
        selOffsetTo = from + 8;
      } else if (selectedText.startsWith("<u>") && selectedText.endsWith("</u>") && selectedText.length >= 7) {
        replacement = selectedText.slice(3, -4);
        selOffsetFrom = from;
        selOffsetTo = from + replacement.length;
      } else {
        replacement = `<u>${selectedText}</u>`;
        selOffsetFrom = from + 3;
        selOffsetTo = from + 3 + selectedText.length;
      }
      break;
    }
    case "highlight": {
      if (isCollapsed) {
        replacement = "==高亮文本==";
        selOffsetFrom = from + 2;
        selOffsetTo = from + 6;
      } else if (selectedText.startsWith("==") && selectedText.endsWith("==") && selectedText.length >= 4) {
        replacement = selectedText.slice(2, -2);
        selOffsetFrom = from;
        selOffsetTo = from + replacement.length;
      } else {
        replacement = `==${selectedText}==`;
        selOffsetFrom = from + 2;
        selOffsetTo = from + 2 + selectedText.length;
      }
      break;
    }
    case "link": {
      if (isCollapsed) {
        replacement = "[链接文字](https://)";
        selOffsetFrom = from + 1;
        selOffsetTo = from + 5;
      } else {
        replacement = `[${selectedText}](https://)`;
        selOffsetFrom = from + selectedText.length + 3;
        selOffsetTo = from + replacement.length - 1;
      }
      break;
    }
    case "image": {
      if (isCollapsed) {
        replacement = "![图片描述](https://)";
        selOffsetFrom = from + 2;
        selOffsetTo = from + 6;
      } else {
        replacement = `![${selectedText}](https://)`;
        selOffsetFrom = from + selectedText.length + 4;
        selOffsetTo = from + replacement.length - 1;
      }
      break;
    }
    case "code": {
      if (isCollapsed) {
        replacement = "`行内代码`";
        selOffsetFrom = from + 1;
        selOffsetTo = from + 5;
      } else if (selectedText.startsWith("`") && selectedText.endsWith("`") && selectedText.length >= 2) {
        replacement = selectedText.slice(1, -1);
        selOffsetFrom = from;
        selOffsetTo = from + replacement.length;
      } else {
        replacement = `\`${selectedText}\``;
        selOffsetFrom = from + 1;
        selOffsetTo = from + 1 + selectedText.length;
      }
      break;
    }
    case "code-block": {
      if (isCollapsed) {
        replacement = "\n```javascript\n// 代码\n```\n";
        const placeholder = "// 代码";
        const start = replacement.indexOf(placeholder);
        selOffsetFrom = from + start;
        selOffsetTo = selOffsetFrom + placeholder.length;
      } else {
        replacement = `\n\`\`\`\n${selectedText}\n\`\`\`\n`;
        selOffsetFrom = from + 4;
        selOffsetTo = from + 4 + selectedText.length;
      }
      break;
    }
    case "math": {
      if (isCollapsed) {
        replacement = "$公式$";
        selOffsetFrom = from + 1;
        selOffsetTo = from + 3;
      } else if (selectedText.startsWith("$") && selectedText.endsWith("$") && selectedText.length >= 2) {
        replacement = selectedText.slice(1, -1);
        selOffsetFrom = from;
        selOffsetTo = from + replacement.length;
      } else {
        replacement = `$${selectedText}$`;
        selOffsetFrom = from + 1;
        selOffsetTo = from + 1 + selectedText.length;
      }
      break;
    }
    case "quote": {
      if (isCollapsed) {
        replacement = "\n> 引用内容\n";
        selOffsetFrom = from + 3;
        selOffsetTo = from + 7;
      } else {
        const lines = selectedText.split("\n");
        const allQuoted = lines.every((line) => !line.trim() || line.startsWith("> "));
        if (allQuoted) {
          replacement = lines.map((line) => {
            if (line.startsWith("> ")) return line.slice(2);
            if (line.startsWith(">")) return line.slice(1);
            return line;
          }).join("\n");
        } else {
          replacement = lines.map((line) => (line.length ? `> ${line}` : line)).join("\n");
        }
        selOffsetFrom = from;
        selOffsetTo = from + replacement.length;
      }
      break;
    }
    case "list": {
      if (isCollapsed) {
        replacement = "\n- 列表项\n";
        selOffsetFrom = from + 3;
        selOffsetTo = from + 6;
      } else {
        const lines = selectedText.split("\n");
        replacement = lines.map((l) => (l.trim().startsWith("- ") ? l.trim().slice(2) : `- ${l}`)).join("\n");
        selOffsetFrom = from;
        selOffsetTo = from + replacement.length;
      }
      break;
    }
    case "list-ordered": {
      if (isCollapsed) {
        replacement = "\n1. 列表项\n";
        selOffsetFrom = from + 4;
        selOffsetTo = from + 7;
      } else {
        const lines = selectedText.split("\n");
        replacement = lines.map((l, idx) => `${idx + 1}. ${l}`).join("\n");
        selOffsetFrom = from;
        selOffsetTo = from + replacement.length;
      }
      break;
    }
    case "table": {
      replacement = "\n| 列 1 | 列 2 |\n| :--- | :--- |\n| 内容 1 | 内容 2 |\n";
      selOffsetFrom = from + replacement.length;
      selOffsetTo = selOffsetFrom;
      break;
    }
    case "divider": {
      replacement = isCollapsed ? "\n\n---\n\n" : `${selectedText}\n\n---\n\n`;
      selOffsetFrom = from + replacement.length;
      selOffsetTo = selOffsetFrom;
      break;
    }
    case "task": {
      if (isCollapsed) {
        replacement = "\n- [ ] 待办事项\n";
        selOffsetFrom = from + 7;
        selOffsetTo = from + 11;
      } else {
        const lines = selectedText.split("\n");
        replacement = lines.map((l) => (l.trim().startsWith("- [ ] ") ? l.trim().slice(6) : `- [ ] ${l}`)).join("\n");
        selOffsetFrom = from;
        selOffsetTo = from + replacement.length;
      }
      break;
    }
    case "callout": {
      const kind = payload || "tip";
      const titleMap = {
        tip: t("editor.floatingToolbar.calloutTip"),
        warning: t("editor.floatingToolbar.calloutWarning"),
        danger: t("editor.floatingToolbar.calloutDanger"),
        note: t("editor.floatingToolbar.calloutNote"),
      };
      const title = titleMap[kind] || "提示";
      if (isCollapsed) {
        const placeholder = "在此输入提示内容...";
        replacement = `\n::: ${kind} ${title}\n${placeholder}\n:::\n`;
        const start = replacement.indexOf(placeholder);
        selOffsetFrom = from + start;
        selOffsetTo = selOffsetFrom + placeholder.length;
      } else {
        const cleanContent = selectedText.trim() || "内容";
        replacement = `\n::: ${kind} ${title}\n${cleanContent}\n:::\n`;
        selOffsetFrom = from + replacement.length;
        selOffsetTo = selOffsetFrom;
      }
      break;
    }
    case "chart": {
      const chartType = payload || "bar";
      let chartCode = "";
      if (chartType === "line") {
        chartCode = `\`\`\`echarts 240
// 💡 支持标准 ECharts 配置，首行数字（如 240）可自定义图表高度
{
  "title": { "text": "数据趋势走向" },
  "xAxis": {
    "data": ["1月", "2月", "3月", "4月", "5月", "6月"]
  },
  "yAxis": { "type": "value" },
  "series": [{
    "type": "line",
    "smooth": true,
    "data": [120, 200, 150, 260, 210, 310]
  }]
}
\`\`\`\n`;
      } else if (chartType === "pie") {
        chartCode = `\`\`\`echarts 230
// 💡 支持标准 ECharts 配置，首行数字（如 230）可自定义图表高度
{
  "title": { "text": "渠道来源统计", "left": "center" },
  "series": [{
    "name": "渠道",
    "type": "pie",
    "data": [
      { "value": 1048, "name": "搜索引擎" },
      { "value": 735, "name": "直接访问" },
      { "value": 580, "name": "推荐渠道" },
      { "value": 300, "name": "社交媒体" }
    ]
  }]
}
\`\`\`\n`;
      } else {
        chartCode = `\`\`\`echarts 240
// 💡 支持标准 ECharts 配置，首行数字（如 240）可自定义图表高度
{
  "title": { "text": "数据统计对比" },
  "xAxis": {
    "data": ["第一季度", "第二季度", "第三季度", "第四季度"]
  },
  "yAxis": { "type": "value" },
  "series": [{
    "type": "bar",
    "data": [320, 500, 680, 890]
  }]
}
\`\`\`\n`;
      }

      replacement = `\n${chartCode}`;
      selOffsetFrom = from + replacement.length;
      selOffsetTo = selOffsetFrom;
      break;
    }
    case "emoji": {
      const emojiChar = payload || "💡";
      replacement = emojiChar;
      selOffsetFrom = from + emojiChar.length;
      selOffsetTo = selOffsetFrom;
      break;
    }
    default:
      return;
  }

  view.dispatch({
    changes: { from, to, insert: replacement },
    selection: { anchor: selOffsetFrom, head: selOffsetTo },
  });

  view.focus();
}

watch(
  () => props.modelValue,
  (nextValue) => {
    const view = editorView.value;
    if (!view || nextValue === view.state.doc.toString()) return;

    isInternalChange = true;
    const currentSelection = view.state.selection;
    const head = Math.min(currentSelection.main.head, nextValue.length);
    const anchor = Math.min(currentSelection.main.anchor, nextValue.length);

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: nextValue,
      },
      selection: { anchor, head },
    });
    isInternalChange = false;
  },
);

function handleImportClick() {
  fileInputRef.value?.click();
}

function handleDragOver(e) {
  e.preventDefault();
  isDraggingOver.value = true;
}

function handleDragLeave(e) {
  e.preventDefault();
  isDraggingOver.value = false;
}

function handleDrop(e) {
  e.preventDefault();
  isDraggingOver.value = false;

  const files = e.dataTransfer?.files;
  if (!files || !files.length) return;

  const file = files[0];
  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target?.result;
    if (typeof content === "string") {
      emit("open-markdown-content", {
        content,
        path: "",
        name: file.name,
        imported: true,
      });
    }
  };
  reader.readAsText(file);
}

function handleFileChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target?.result;
    if (typeof content === "string") {
      emit("open-markdown-content", {
        content,
        path: "",
        name: file.name,
        imported: true,
      });
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

onMounted(createEditor);

onBeforeUnmount(() => {
  editorView.value?.destroy();
  editorView.value = null;
});
</script>

<template>
  <aside
    class="panel-surface relative grid min-h-0 min-w-0 grid-rows-[58px_auto_minmax(0,1fr)_48px] overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
    @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop">
    <!-- Hidden HTML File Input for Fallback -->
    <input ref="fileInputRef" type="file" accept=".md,.markdown,.mdown,.mkd,.txt" class="hidden"
      @change="handleFileChange" />

    <!-- Drag & Drop Dropzone Overlay -->
    <div v-if="isDraggingOver"
      class="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-blue-600/90 text-white backdrop-blur-xs transition-opacity duration-150">
      <AppIcon name="file-text" :size="38" />
      <span class="text-base font-bold">{{ t("editor.dropTitle") }}</span>
      <span class="text-xs text-blue-100">{{ t("editor.dropDescription") }}</span>
    </div>

    <!-- Header Toolbar -->
    <div class="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 px-5">
      <div class="flex items-center gap-2">
        <strong class="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{{ t("editor.title") }}</strong>
        <span v-if="isDirty || !documentPath"
          class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
          {{ isDirty ? t("editor.unsaved") : t("editor.unlinked") }}
        </span>
      </div>
      <div class="inline-flex items-center gap-2.5">
        <button
          class="inline-flex h-8.5 items-center gap-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 px-3 text-xs font-semibold text-slate-700 transition cursor-pointer"
          type="button" :title="t('editor.importTitle')" @click="handleImportClick">
          <AppIcon name="file-text" :size="15" />
          {{ t("editor.import") }}
        </button>
      </div>
    </div>

    <!-- Persistent Formatting Toolbar -->
    <MarkdownEditorToolbar @format="applyFormat" />

    <!-- CodeMirror Container -->
    <div class="relative min-h-0 overflow-hidden bg-white dark:bg-slate-900">
      <div ref="editorElement" class="h-full min-h-0" :aria-label="t('editor.documentAria')"></div>
    </div>

    <!-- Footer Stats -->
    <footer
      class="flex items-center gap-4 border-t border-slate-200/80 dark:border-slate-800 px-5 text-xs text-slate-500 dark:text-slate-400">
      <span>{{ t("editor.wordCount") }}: <strong class="font-medium text-slate-700 dark:text-slate-300">{{ wordCount }}</strong></span>
      <span>{{ t("editor.lineCount") }}: <strong class="font-medium text-slate-700 dark:text-slate-300">{{ lineCount }}</strong></span>
      <span class="truncate max-w-[180px]"
        :class="loading ? 'text-blue-600 dark:text-blue-400 font-semibold animate-pulse' : 'text-slate-500 dark:text-slate-400'"
        :title="documentPath || t('editor.filePathHint')">
        {{ loading ? t("editor.parsing") : documentPath || t("editor.unlinked") }}
      </span>
      <div class="group relative ml-auto flex items-center">
        <button
          class="grid h-5 w-5 place-items-center rounded-full border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          type="button"
          :aria-label="t('editor.help')"
        >
          <AppIcon name="circle-help" :size="13" />
        </button>

        <div
          class="pointer-events-none absolute bottom-full right-0 mb-2.5 w-max max-w-xs rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 dark:bg-slate-100 dark:text-slate-900 font-medium leading-relaxed"
        >
          <span>{{ t("editor.help") }}</span>
          <div class="absolute top-full right-1.5 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100"></div>
        </div>
      </div>
    </footer>
  </aside>
</template>
