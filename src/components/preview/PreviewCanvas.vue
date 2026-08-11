<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "../AppIcon.vue";
import CardArtwork from "./CardArtwork.vue";
import PreviewArtworkCard from "./PreviewArtworkCard.vue";

const props = defineProps({
  canvasRatio: {
    type: String,
    required: true,
  },
  selectedPlatform: {
    type: Object,
    default: () => ({ name: "小红书", width: 1080, height: 1440, ratio: "3:4" }),
  },
  activePage: {
    type: Object,
    required: true,
  },
  activePageIndex: {
    type: Number,
    default: 0,
  },
  pages: {
    type: Array,
    default: () => [],
  },
  selectedThemeClass: {
    type: String,
    required: true,
  },
  viewMode: {
    type: String,
    default: "single",
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

const emit = defineEmits(["next-page", "previous-page", "select-page", "set-view-mode"]);

const artworkCardRef = ref(null);
const isFullscreen = ref(false);
const { t } = useI18n();

const overviewGeometry = computed(() => {
  const width = Number(props.selectedPlatform?.width) || 1080;
  const height = Number(props.selectedPlatform?.height) || 1440;
  const designWidth = width > height ? 640 : 450;
  const designHeight = Math.max(1, Math.round(designWidth * (height / width)));
  const displayWidth = 180;
  const scale = displayWidth / designWidth;
  return {
    displayWidth,
    displayHeight: Math.round(designHeight * scale),
    scale,
  };
});

defineExpose({
  getCanvasElement: () => artworkCardRef.value?.getCanvasElement?.(),
  openFullscreen: () => {
    isFullscreen.value = true;
  },
});
</script>

<template>
  <div class="relative min-h-0 w-full flex-1 overflow-auto px-6 py-6 lg:px-8">
    <!-- Single Card View Mode -->
    <div v-if="viewMode === 'single'" class="h-full w-full flex flex-col items-center justify-center relative gap-2">
      <slot name="nav-left" />
      <PreviewArtworkCard
        ref="artworkCardRef"
        :active-page="activePage"
        :active-page-index="activePageIndex"
        :pages-length="pages.length"
        :canvas-ratio="canvasRatio"
        :selected-platform="selectedPlatform"
        :selected-theme-class="selectedThemeClass"
        auto-fit
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
        @fullscreen="isFullscreen = true"
      />
      <slot name="nav-right" />
    </div>

    <!-- Grid Gallery View Mode (Pure Scaled Cards Only, No Extra Outer Containers) -->
    <div v-else class="h-full w-full overflow-y-auto p-4 lg:p-6 select-none">
      <div class="grid grid-cols-[repeat(auto-fill,minmax(185px,1fr))] gap-6 place-items-center pb-12">
        <div
          v-for="(page, index) in pages"
          :key="index"
          class="group/gridcard relative shrink-0 overflow-hidden rounded-xl transition-all duration-200 cursor-pointer"
          :class="index === activePageIndex ? 'ring-3 ring-blue-500 shadow-xl scale-102' : 'hover:shadow-lg hover:scale-101 border border-slate-200/60 dark:border-slate-800'"
          :style="{ width: `${overviewGeometry.displayWidth}px`, height: `${overviewGeometry.displayHeight}px` }"
          :title="t('preview.single')"
          @click="$emit('select-page', index)"
          @dblclick="$emit('select-page', index); $emit('set-view-mode', 'single')"
        >
          <div
            class="pointer-events-none absolute left-0 top-0 origin-top-left"
            :style="{ transform: `scale(${overviewGeometry.scale})` }"
          >
            <CardArtwork
              :page="page"
              :page-index="index"
              :pages-length="pages.length"
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
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Fullscreen Lightbox Modal -->
    <teleport to="body">
      <div
        v-if="isFullscreen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 animate-in fade-in duration-200 select-none"
        @click="isFullscreen = false"
      >
        <div class="relative max-h-full max-w-full grid place-items-center" @click.stop>
          <!-- Close Modal Button -->
          <button
            type="button"
            class="absolute -top-12 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition cursor-pointer"
            :aria-label="t('common.close')"
            @click="isFullscreen = false"
          >
            <AppIcon name="x" :size="20" />
          </button>

          <PreviewArtworkCard
            :active-page="activePage"
            :active-page-index="activePageIndex"
            :pages-length="pages.length"
            :canvas-ratio="canvasRatio"
            :selected-platform="selectedPlatform"
            :selected-theme-class="selectedThemeClass"
            :zoom="90"
            :auto-fit="false"
            :transparent-background="transparentBackground"
            :background-color="backgroundColor"
            :background-type="backgroundType"
            :background-value="backgroundValue"
            :show-page-number="showPageNumber"
            :show-top-left="showTopLeft"
            :show-top-right="showTopRight"
            :show-bottom-left="showBottomLeft"
            :show-bottom-right="showBottomRight"
            class="shadow-2xl"
          />
        </div>
      </div>
    </teleport>
  </div>
</template>
