<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "../AppIcon.vue";
import { parseBlocks, renderBlocksToHtml, renderMermaidDiagrams } from "../../composables/useContentParser.js";
import { getCoverStickers } from "../../config/coverStickers.js";

const props = defineProps({
  activePage: { type: Object, required: true },
  activePageIndex: { type: Number, default: 0 },
  pagesLength: { type: Number, default: 1 },
  canvasRatio: { type: String, required: true },
  selectedPlatform: {
    type: Object,
    default: () => ({ width: 1080, height: 1440, name: "小红书", ratio: "3:4" }),
  },
  selectedThemeClass: { type: String, required: true },
  zoom: { type: Number, required: true },
  transparentBackground: { type: Boolean, default: false },
  backgroundColor: { type: String, default: "#69eacb" },
  backgroundType: { type: String, default: "gradient" },
  backgroundValue: { type: String, default: "linear-gradient(135deg, #69eacb 0%, #eaccf8 48%, #6654f1 100%)" },
  showPageNumber: { type: Boolean, default: true },
  showTopLeft: { type: Boolean, default: true },
  showTopRight: { type: Boolean, default: true },
  showBottomLeft: { type: Boolean, default: true },
  showBottomRight: { type: Boolean, default: true },
});

const emit = defineEmits(["fullscreen", "copy"]);
const canvasElement = ref(null);
const { t } = useI18n();

defineExpose({ getCanvasElement: () => canvasElement.value });

// Outer frame style (background / dimensions)
const outerFrameStyle = computed(() => {
  const width = props.selectedPlatform?.width || 1080;
  const height = props.selectedPlatform?.height || 1440;
  const zoomFactor = props.zoom / 74;

  const isLandscape = width > height;
  let dims = {};

  if (isLandscape) {
    const maxW = Math.min(680, Math.round(540 * zoomFactor));
    const calcH = Math.round(maxW * (height / width));
    dims = { width: `${maxW}px`, height: `${calcH}px`, aspectRatio: `${width} / ${height}`, "--preview-zoom": `${zoomFactor}` };
  } else {
    const maxH = Math.min(620, Math.round(540 * zoomFactor));
    const calcW = Math.round(maxH * (width / height));
    dims = { width: `${calcW}px`, height: `${maxH}px`, aspectRatio: `${width} / ${height}`, "--preview-zoom": `${zoomFactor}` };
  }

  if (props.transparentBackground) {
    return { ...dims, background: "transparent", backgroundColor: "transparent", backgroundImage: "none" };
  }
  if (props.backgroundType === "solid") {
    const bg = props.backgroundValue || props.backgroundColor || "#fff7e9";
    return { ...dims, background: bg, backgroundColor: bg, backgroundImage: "none" };
  }
  if (props.backgroundType === "gradient" || props.backgroundType === "pattern") {
    return { ...dims, background: props.backgroundValue, backgroundImage: props.backgroundValue };
  }
  if (props.backgroundType === "image" || props.backgroundType === "wallpaper") {
    if (props.backgroundValue?.startsWith("data:") || props.backgroundValue?.startsWith("http") || props.backgroundValue?.startsWith("blob:") || props.backgroundValue?.startsWith("/")) {
      return { ...dims, backgroundImage: `url('${props.backgroundValue}')`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" };
    }
    return { ...dims, background: props.backgroundValue, backgroundImage: props.backgroundValue };
  }
  return { ...dims, backgroundColor: props.backgroundColor || "#fff7e9" };
});

// Render blocks to HTML — use pre-parsed blocks if available, otherwise parse on-the-fly
const renderedBody = computed(() => {
  const blocks = props.activePage?.blocks
    ?? parseBlocks(props.activePage?.bodyMarkdown?.split("\n") ?? props.activePage?.body ?? []);
  return renderBlocksToHtml(blocks);
});

const coverStickers = computed(() => (
  props.activePage?.cover ? getCoverStickers(props.selectedThemeClass) : []
));

async function triggerMermaid() {
  await nextTick();
  if (canvasElement.value) {
    await renderMermaidDiagrams(canvasElement.value);
  }
}

watch(() => props.activePage, triggerMermaid, { immediate: true, deep: true });
onMounted(triggerMermaid);

const defaultDateString = computed(() => {
  const now = new Date();
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
});
</script>

<template>
  <!-- Outer Poster Canvas Frame -->
  <div
    ref="canvasElement"
    class="poster-canvas-frame relative flex flex-col justify-between p-4 sm:p-5 overflow-hidden rounded-2xl shadow-xl transition-all duration-200 select-none"
    :style="outerFrameStyle"
  >
    <!-- Top Header (on outer background) -->
    <div
      v-if="showTopLeft || showTopRight"
      class="poster-header z-10 flex items-center justify-between text-xs font-semibold px-1 pb-2 text-slate-800 dark:text-slate-100 drop-shadow-xs min-h-[24px]"
    >
      <div class="flex items-center gap-1.5">
        <span v-if="showTopLeft" class="inline-flex items-center rounded-md bg-black/10 dark:bg-white/15 px-2 py-0.5 text-[11px] font-bold backdrop-blur-xs tracking-wide">
          {{ activePage.kicker || "@MarkCard" }}
        </span>
      </div>
      <div v-if="showTopRight && showPageNumber" class="text-[11px] font-mono font-bold opacity-80">
        {{ String(activePageIndex + 1).padStart(2, "0") }} / {{ String(pagesLength || 1).padStart(2, "0") }}
      </div>
    </div>

    <!-- Inner Card Canvas (theme-controlled) -->
    <article
      class="card-canvas group/card relative flex-1 flex flex-col h-full w-full rounded-xl overflow-hidden shadow-md border border-black/5 dark:border-white/10"
      :class="[selectedThemeClass, { 'is-cover': activePage.cover }]"
    >
      <div class="leaf-shadow top"></div>
      <div class="leaf-shadow side"></div>

      <div v-if="coverStickers.length" class="cover-sticker-layer" aria-hidden="true">
        <img
          v-for="sticker in coverStickers"
          :key="sticker.position"
          :src="sticker.src"
          alt=""
          class="cover-sticker"
          :class="`cover-sticker--${sticker.position}`"
          loading="eager"
          draggable="false"
        />
      </div>

      <!-- Hover Action Bar -->
      <div class="absolute right-3.5 top-3.5 z-20 flex items-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 pointer-events-auto">
        <button
          type="button"
          class="inline-flex h-6.5 items-center gap-1 rounded-full bg-slate-900/80 px-2.5 text-[10px] font-medium text-white shadow-md backdrop-blur-xs hover:bg-slate-900 transition cursor-pointer"
          :title="t('preview.fullscreen')"
          @click.stop="emit('fullscreen')"
        >
          <AppIcon name="maximize" :size="11" />
          {{ t("preview.fullscreenShort") }}
        </button>
      </div>

      <!-- Scrollable Content Area -->
      <div class="card-scroll-area">
        <!-- Card Title -->
        <h1 v-if="!activePage.isOverflow && activePage.title">{{ activePage.title }}</h1>

        <!-- Block-rendered body content -->
        <div class="card-body" v-html="renderedBody"></div>
      </div>
    </article>

    <!-- Bottom Footer (on outer background) -->
    <div
      v-if="showBottomLeft || showBottomRight"
      class="poster-footer z-10 flex items-center justify-between text-xs pt-2.5 px-1 text-slate-800 dark:text-slate-100 drop-shadow-xs min-h-[24px]"
    >
      <div v-if="showBottomLeft" class="font-mono text-[11px] opacity-85 shrink-0">
        <span>{{ activePage.date || defaultDateString }}</span>
      </div>
      <div v-else></div>

      <strong v-if="showBottomRight" class="truncate text-right font-medium text-[11px] max-w-[70%] opacity-90">
        {{ activePage.quote || t("runtime.defaultQuote") }}
      </strong>
    </div>
  </div>
</template>
