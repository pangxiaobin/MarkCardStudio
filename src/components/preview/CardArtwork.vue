<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  getCardLayoutClass,
  parseBlocks,
  renderBlocksToHtml,
  renderMermaidDiagrams,
  renderEChartsDiagrams,
  disposeEChartsDiagrams,
} from "../../composables/useContentParser.js";
import { getCoverStickers } from "../../config/coverStickers.js";

const props = defineProps({
  page: { type: Object, required: true },
  pageIndex: { type: Number, default: 0 },
  pagesLength: { type: Number, default: 1 },
  selectedPlatform: {
    type: Object,
    default: () => ({ width: 1080, height: 1440, name: "小红书", ratio: "3:4" }),
  },
  selectedThemeClass: { type: String, required: true },
  transparentBackground: { type: Boolean, default: false },
  backgroundColor: { type: String, default: "#69eacb" },
  backgroundType: { type: String, default: "gradient" },
  backgroundValue: {
    type: String,
    default: "linear-gradient(135deg, #69eacb 0%, #eaccf8 48%, #6654f1 100%)",
  },
  showPageNumber: { type: Boolean, default: true },
  showTopLeft: { type: Boolean, default: true },
  showTopRight: { type: Boolean, default: true },
  showBottomLeft: { type: Boolean, default: true },
  showBottomRight: { type: Boolean, default: true },
  customFontFamily: { type: String, default: "" },
  autoPrepare: { type: Boolean, default: true },
});

const { t } = useI18n();
const canvasElement = ref(null);
const scrollAreaElement = ref(null);
const detectedOverflow = ref(false);
let prepareVersion = 0;

const geometry = computed(() => {
  const width = Number(props.selectedPlatform?.width) || 1080;
  const height = Number(props.selectedPlatform?.height) || 1440;
  const designWidth = width > height ? 640 : 450;
  return {
    width: designWidth,
    height: Math.max(1, Math.round(designWidth * (height / width))),
  };
});

const cardLayoutClass = computed(() => getCardLayoutClass(
  props.selectedPlatform?.width,
  props.selectedPlatform?.height,
));

const posterCanvasStyle = computed(() => {
  const dimensions = {
    width: `${geometry.value.width}px`,
    height: `${geometry.value.height}px`,
  };
  const typography = props.customFontFamily
    ? { "--markcard-custom-font": `"${props.customFontFamily}", sans-serif` }
    : {};

  if (props.transparentBackground) {
    return {
      ...dimensions,
      ...typography,
      background: "transparent",
      backgroundColor: "transparent",
      backgroundImage: "none",
    };
  }

  if (props.backgroundType === "solid") {
    const background = props.backgroundValue || props.backgroundColor || "#fff7e9";
    return {
      ...dimensions,
      ...typography,
      background,
      backgroundColor: background,
      backgroundImage: "none",
    };
  }

  if (props.backgroundType === "gradient" || props.backgroundType === "pattern") {
    return {
      ...dimensions,
      ...typography,
      background: props.backgroundValue,
      backgroundImage: props.backgroundValue,
    };
  }

  if (props.backgroundType === "image" || props.backgroundType === "wallpaper") {
    if (/^(data:|https?:|blob:|\/)/i.test(props.backgroundValue || "")) {
      return {
        ...dimensions,
        ...typography,
        backgroundImage: `url('${props.backgroundValue}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };
    }
    return {
      ...dimensions,
      ...typography,
      background: props.backgroundValue,
      backgroundImage: props.backgroundValue,
    };
  }

  return {
    ...dimensions,
    ...typography,
    backgroundColor: props.backgroundColor || "#fff7e9",
  };
});

const renderedBody = computed(() => {
  const blocks = props.page?.blocks
    ?? parseBlocks(props.page?.bodyMarkdown ?? props.page?.body ?? "");
  return renderBlocksToHtml(blocks);
});

const coverStickers = computed(() => (
  props.page?.cover ? getCoverStickers(props.selectedThemeClass) : []
));
const hasOversizeBlock = computed(() => (
  props.page?.blocks?.some((block) => block?.oversize) || false
));

const defaultDateString = computed(() => {
  const now = new Date();
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
});

function waitForImage(image) {
  if (image.complete) return image.decode?.().catch(() => undefined) ?? Promise.resolve();
  return new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  }).then(() => image.decode?.().catch(() => undefined));
}

async function prepareContent() {
  const version = ++prepareVersion;
  await nextTick();
  if (!canvasElement.value || version !== prepareVersion) return;
  await renderMermaidDiagrams(canvasElement.value);
  await renderEChartsDiagrams(canvasElement.value);
  if (document.fonts?.ready) await document.fonts.ready;
  await Promise.all(Array.from(canvasElement.value.querySelectorAll("img")).map(waitForImage));
  if (version !== prepareVersion) return;
  replaceBrokenContentImages();
  await nextTick();
  detectedOverflow.value = hasOverflow();
}

function replaceBrokenContentImages() {
  for (const image of canvasElement.value?.querySelectorAll("img.card-image, img.card-inline-image") || []) {
    if (image.complete && image.naturalWidth > 0) continue;
    const isInline = image.classList.contains("card-inline-image");
    const fallback = document.createElement(isInline ? "span" : "p");
    if (!isInline) fallback.className = "card-paragraph";
    fallback.textContent = image.getAttribute("data-original-markdown")
      || `![${image.alt || ""}](${image.getAttribute("src") || ""})`;
    const wrapper = image.closest(".card-image-wrap, .card-inline-image-wrap");
    (wrapper || image).replaceWith(fallback);
  }
}

function hasOverflow() {
  const area = scrollAreaElement.value;
  return Boolean(area && area.scrollHeight > area.clientHeight + 1);
}

watch(
  () => [props.page, props.selectedThemeClass, props.selectedPlatform?.width, props.selectedPlatform?.height, props.customFontFamily],
  () => {
    detectedOverflow.value = false;
    if (props.autoPrepare) prepareContent();
  },
  { immediate: true, deep: true },
);

onBeforeUnmount(() => {
  disposeEChartsDiagrams(canvasElement.value);
});

defineExpose({
  getCanvasElement: () => canvasElement.value,
  getScrollAreaElement: () => scrollAreaElement.value,
  hasOverflow,
  prepareContent,
});
</script>

<template>
  <div
    ref="canvasElement"
    class="poster-canvas-frame flex flex-col justify-between overflow-hidden p-5 select-none"
    :class="{ 'has-custom-font': customFontFamily }"
    :style="posterCanvasStyle"
  >
    <div
      v-if="showTopLeft || showTopRight"
      class="poster-header z-10 flex min-h-[24px] items-center justify-between px-1 pb-2 text-xs font-semibold text-slate-800 drop-shadow-xs dark:text-slate-100"
    >
      <div class="flex items-center gap-1.5">
        <span
          v-if="showTopLeft"
          class="inline-flex items-center rounded-md bg-black/10 px-2 py-0.5 text-[11px] font-bold tracking-wide backdrop-blur-xs dark:bg-white/15"
        >
          {{ page.kicker || "@MarkCard" }}
        </span>
      </div>
      <div v-if="showTopRight && showPageNumber" class="font-mono text-[11px] font-bold opacity-80">
        {{ String(pageIndex + 1).padStart(2, "0") }} / {{ String(pagesLength || 1).padStart(2, "0") }}
      </div>
    </div>

    <article
      class="card-canvas group/card relative flex h-full w-full flex-1 flex-col overflow-hidden rounded-xl border border-black/5 shadow-md dark:border-white/10"
      :class="[selectedThemeClass, cardLayoutClass, { 'is-cover': page.cover }]"
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

      <div ref="scrollAreaElement" class="card-scroll-area">
        <h1 v-if="!page.isOverflow && page.title">{{ page.title }}</h1>
        <div class="card-body" v-html="renderedBody"></div>
      </div>

      <div
        v-if="hasOversizeBlock || detectedOverflow"
        class="absolute inset-x-3 bottom-3 z-30 rounded-md bg-red-600 px-2 py-1 text-center text-[10px] font-semibold text-white shadow-md"
      >
        {{ t("content.overflowWarning") }}
      </div>
    </article>

    <div
      v-if="showBottomLeft || showBottomRight"
      class="poster-footer z-10 flex min-h-[24px] items-center justify-between px-1 pt-2.5 text-xs text-slate-800 drop-shadow-xs dark:text-slate-100"
    >
      <div v-if="showBottomLeft" class="shrink-0 font-mono text-[11px] opacity-85">
        <span>{{ page.date || defaultDateString }}</span>
      </div>
      <div v-else></div>
      <strong v-if="showBottomRight" class="max-w-[70%] truncate text-right text-[11px] font-medium opacity-90">
        {{ page.quote || t("runtime.defaultQuote") }}
      </strong>
    </div>
  </div>
</template>
