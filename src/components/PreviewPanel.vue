<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "./AppIcon.vue";
import AppIconButton from "./AppIconButton.vue";
import PreviewCanvas from "./preview/PreviewCanvas.vue";
import PreviewHeader from "./preview/PreviewHeader.vue";
import PreviewStrip from "./preview/PreviewStrip.vue";

const props = defineProps({
  activePage: {
    type: Object,
    required: true,
  },
  activePageIndex: {
    type: Number,
    required: true,
  },
  canGoNext: {
    type: Boolean,
    required: true,
  },
  canGoPrevious: {
    type: Boolean,
    required: true,
  },
  canvasRatio: {
    type: String,
    required: true,
  },
  selectedPlatform: {
    type: Object,
    default: () => ({ name: "小红书", width: 1080, height: 1440, ratio: "3:4" }),
  },
  pages: {
    type: Array,
    required: true,
  },
  selectedThemeClass: {
    type: String,
    required: true,
  },
  zoom: {
    type: Number,
    required: true,
  },
  transparentBackground: {
    type: Boolean,
    default: false,
  },
  backgroundColor: {
    type: String,
    default: "#69eacb",
  },
  backgroundType: {
    type: String,
    default: "gradient",
  },
  backgroundValue: {
    type: String,
    default: "linear-gradient(135deg, #69eacb 0%, #eaccf8 48%, #6654f1 100%)",
  },
  showPageNumber: {
    type: Boolean,
    default: true,
  },
  showTopLeft: {
    type: Boolean,
    default: true,
  },
  showTopRight: {
    type: Boolean,
    default: true,
  },
  showBottomLeft: {
    type: Boolean,
    default: true,
  },
  showBottomRight: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits([
  "add-page",
  "delete-page",
  "move-page",
  "next-page",
  "previous-page",
  "select-page",
  "set-zoom",
]);

const previewCanvasRef = ref(null);
const viewMode = ref("single");
const { t } = useI18n();

defineExpose({
  getCanvasElement: () => previewCanvasRef.value?.getCanvasElement?.() ?? null,
});

function updateZoom(delta) {
  emit("set-zoom", delta);
}

function handleKeydown(e) {
  const activeEl = document.activeElement;
  const isTyping = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable || activeEl.closest(".cm-editor"));
  if (isTyping) return;

  if (e.key === "ArrowLeft") {
    if (props.canGoPrevious) emit("previous-page");
  } else if (e.key === "ArrowRight") {
    if (props.canGoNext) emit("next-page");
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <section class="preview-shell grid min-h-0 min-w-0 grid-rows-[58px_minmax(0,1fr)_162px]">
    <PreviewHeader
      :active-page-index="activePageIndex"
      :can-go-next="canGoNext"
      :can-go-previous="canGoPrevious"
      :pages="pages"
      :pages-length="pages.length"
      :view-mode="viewMode"
      :zoom="zoom"
      @next-page="$emit('next-page')"
      @previous-page="$emit('previous-page')"
      @select-page="$emit('select-page', $event)"
      @set-view-mode="viewMode = $event"
      @set-zoom="updateZoom"
      @toggle-fullscreen="previewCanvasRef?.openFullscreen?.()"
    />

    <PreviewCanvas
      ref="previewCanvasRef"
      :active-page="activePage"
      :active-page-index="activePageIndex"
      :canvas-ratio="canvasRatio"
      :selected-platform="selectedPlatform"
      :pages="pages"
      :selected-theme-class="selectedThemeClass"
      :view-mode="viewMode"
      :zoom="zoom"
      :transparent-background="transparentBackground"
      :background-color="backgroundColor"
      :background-type="backgroundType"
      :background-value="backgroundValue"
      :show-page-number="showPageNumber"
      :show-top-left="showTopLeft"
      :show-top-right="showTopRight"
      :show-bottom-left="showBottomLeft"
      :show-bottom-right="showBottomRight"
      @select-page="$emit('select-page', $event)"
      @set-view-mode="viewMode = $event"
    >
      <template #nav-left>
        <AppIconButton
          class="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-[0_10px_24px_rgba(30,42,62,0.12)] border border-slate-200/80 dark:border-slate-700/80 cursor-pointer"
          :disabled="!canGoPrevious"
          :aria-label="t('preview.previous')"
          :title="t('preview.previous')"
          @click="$emit('previous-page')"
        >
          <AppIcon name="chevron-left" :size="18" />
        </AppIconButton>
      </template>
      <template #nav-right>
        <AppIconButton
          class="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-[0_10px_24px_rgba(30,42,62,0.12)] border border-slate-200/80 dark:border-slate-700/80 cursor-pointer"
          :disabled="!canGoNext"
          :aria-label="t('preview.next')"
          :title="t('preview.next')"
          @click="$emit('next-page')"
        >
          <AppIcon name="chevron-right" :size="18" />
        </AppIconButton>
      </template>
    </PreviewCanvas>

    <PreviewStrip
      :active-page-index="activePageIndex"
      :pages="pages"
      @add-page="$emit('add-page')"
      @select-page="$emit('select-page', $event)"
    />
  </section>
</template>
