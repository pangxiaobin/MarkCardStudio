<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "../AppIcon.vue";
import CardArtwork from "./CardArtwork.vue";

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
  autoFit: { type: Boolean, default: true },
  transparentBackground: { type: Boolean, default: false },
  backgroundColor: { type: String, default: "#69eacb" },
  backgroundType: { type: String, default: "gradient" },
  backgroundValue: { type: String, default: "linear-gradient(135deg, #69eacb 0%, #eaccf8 48%, #6654f1 100%)" },
  showPageNumber: { type: Boolean, default: true },
  showTopLeft: { type: Boolean, default: true },
  showTopRight: { type: Boolean, default: true },
  showBottomLeft: { type: Boolean, default: true },
  showBottomRight: { type: Boolean, default: true },
  customFontFamily: { type: String, default: "" },
});

const emit = defineEmits(["fullscreen", "copy"]);
const previewRoot = ref(null);
const artworkRef = ref(null);
const fitScale = ref(1);
let resizeObserver = null;
const { t } = useI18n();

defineExpose({ getCanvasElement: () => artworkRef.value?.getCanvasElement?.() });

const previewGeometry = computed(() => {
  const width = props.selectedPlatform?.width || 1080;
  const height = props.selectedPlatform?.height || 1440;
  const zoomFactor = Math.max(0.3, props.zoom / 74);
  const isLandscape = width > height;
  const baseWidth = isLandscape ? 640 : 450;
  const baseHeight = Math.max(1, Math.round(baseWidth * (height / width)));

  const fallbackScale = isLandscape
    ? Math.min(680 / baseWidth, 540 * zoomFactor / baseWidth)
    : Math.min(620 / baseHeight, 540 * zoomFactor / baseHeight);
  const scale = props.autoFit ? fitScale.value * zoomFactor : fallbackScale;
  return {
    baseWidth,
    baseHeight,
    displayWidth: Math.round(baseWidth * scale),
    displayHeight: Math.round(baseHeight * scale),
    scale,
  };
});

const previewFrameStyle = computed(() => ({
  width: `${previewGeometry.value.displayWidth}px`,
  height: `${previewGeometry.value.displayHeight}px`,
}));

const artworkStyle = computed(() => ({
  transform: `scale(${previewGeometry.value.scale})`,
  transformOrigin: "top left",
}));

function updateFitScale() {
  if (!props.autoFit) return;
  const stage = previewRoot.value?.parentElement;
  if (!stage) return;

  const availableWidth = Math.max(1, stage.clientWidth - 16);
  const availableHeight = Math.max(1, stage.clientHeight - 16);
  const geometry = previewGeometry.value;
  fitScale.value = Math.max(
    0.08,
    Math.min(
      availableWidth / geometry.baseWidth,
      availableHeight / geometry.baseHeight,
    ),
  );
}

onMounted(async () => {
  await nextTick();
  if (!props.autoFit) return;
  const stage = previewRoot.value?.parentElement;
  if (!stage) return;
  resizeObserver = new ResizeObserver(updateFitScale);
  resizeObserver.observe(stage);
  updateFitScale();
});

watch(
  () => [props.autoFit, props.selectedPlatform?.width, props.selectedPlatform?.height],
  async () => {
    if (!props.autoFit) return;
    await nextTick();
    updateFitScale();
  },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});
</script>

<template>
  <div
    ref="previewRoot"
    class="relative shrink-0"
    :style="previewFrameStyle"
  >
    <div class="group/card absolute left-0 top-0" :style="artworkStyle">
      <div class="overflow-hidden rounded-2xl shadow-xl">
        <CardArtwork
          ref="artworkRef"
          :page="activePage"
          :page-index="activePageIndex"
          :pages-length="pagesLength"
          :selected-platform="selectedPlatform"
          :selected-theme-class="selectedThemeClass"
          :transparent-background="transparentBackground"
          :background-color="backgroundColor"
          :background-type="backgroundType"
          :background-value="backgroundValue"
          :show-page-number="showPageNumber"
          :show-top-left="showTopLeft"
          :show-top-right="showTopRight"
          :show-bottom-left="showBottomLeft"
          :show-bottom-right="showBottomRight"
          :custom-font-family="customFontFamily"
        />
      </div>

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
    </div>
  </div>
</template>
