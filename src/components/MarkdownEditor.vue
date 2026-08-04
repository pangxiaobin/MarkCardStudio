<script setup>
import { EditorState } from "@codemirror/state";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "./AppIcon.vue";
import AppIconButton from "./AppIconButton.vue";

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
    class="panel-surface relative grid min-h-0 min-w-0 grid-rows-[58px_minmax(0,1fr)_48px] overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
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
