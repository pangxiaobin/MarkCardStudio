<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "../AppIcon.vue";
import AppIconButton from "../AppIconButton.vue";

const props = defineProps({
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
  pages: {
    type: Array,
    default: () => [],
  },
  pagesLength: {
    type: Number,
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
});

const emit = defineEmits([
  "next-page",
  "previous-page",
  "select-page",
  "set-view-mode",
  "set-zoom",
  "toggle-fullscreen",
]);

const isPageMenuOpen = ref(false);
const isZoomMenuOpen = ref(false);
const pageDropdownRef = ref(null);
const zoomDropdownRef = ref(null);
const { t } = useI18n();

const zoomPresets = computed(() => [
  { label: "50%", value: 50 },
  { label: `74% (${t("preview.fit")})`, value: 74 },
  { label: `100% (${t("preview.actualSize")})`, value: 100 },
]);

function handleClickOutside(event) {
  if (pageDropdownRef.value && !pageDropdownRef.value.contains(event.target)) {
    isPageMenuOpen.value = false;
  }
  if (zoomDropdownRef.value && !zoomDropdownRef.value.contains(event.target)) {
    isZoomMenuOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <header
    class="flex items-center gap-3 border-b border-slate-200/70 dark:border-slate-800 px-4 py-2.5 lg:px-5 select-none">
    <!-- Title & Page Count Badge -->
    <div class="mr-auto inline-flex items-center gap-2.5">
      <strong class="text-base font-semibold text-slate-900 dark:text-slate-100">{{ t("preview.title") }}</strong>
      <span
        class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        {{ t("common.pages", { count: pagesLength }) }}
      </span>
    </div>

    <!-- View Mode Switch: Icon-Only with Clean Edge Border Indicator -->
    <div class="inline-flex items-center gap-1.5 select-none" role="tablist" :aria-label="t('preview.title')">
      <button
        type="button"
        role="tab"
        class="flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-150 cursor-pointer"
        :class="viewMode === 'single'
          ? 'border-blue-600 bg-blue-50/80 text-blue-600 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-400 font-semibold shadow-2xs'
          : 'border-slate-200/90 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
        :aria-selected="viewMode === 'single'"
        :aria-label="t('preview.single')"
        :title="t('preview.single')"
        @click="$emit('set-view-mode', 'single')"
      >
        <AppIcon name="square" :size="15" />
      </button>

      <button
        type="button"
        role="tab"
        class="flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-150 cursor-pointer"
        :class="viewMode === 'grid'
          ? 'border-blue-600 bg-blue-50/80 text-blue-600 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-400 font-semibold shadow-2xs'
          : 'border-slate-200/90 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
        :aria-selected="viewMode === 'grid'"
        :aria-label="t('preview.overview')"
        :title="t('preview.overview')"
        @click="$emit('set-view-mode', 'grid')"
      >
        <AppIcon name="layout-grid" :size="15" />
      </button>
    </div>

    <div class="h-4.5 w-px bg-slate-200/80 dark:bg-slate-800 mx-1"></div>

    <!-- Page Navigation & Page Dropdown Selector -->
    <div class="inline-flex items-center gap-1.5">
      <AppIconButton :disabled="!canGoPrevious" :aria-label="t('preview.previous')" :title="t('preview.previous')"
        @click="$emit('previous-page')">
        <AppIcon name="chevron-left" :size="16" />
      </AppIconButton>

      <div class="relative" ref="pageDropdownRef">
        <button
          class="inline-flex h-8.5 min-w-[84px] items-center justify-between gap-1.5 rounded-lg border border-slate-200/90 bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/80 transition cursor-pointer"
          type="button" @click="isPageMenuOpen = !isPageMenuOpen">
          <span>{{ activePageIndex + 1 }} / {{ pagesLength }}</span>
          <AppIcon name="chevron-down" :size="12" class="text-slate-400 transition-transform"
            :class="isPageMenuOpen ? 'rotate-180' : ''" />
        </button>

        <!-- Page Selector Dropdown Popover -->
        <div v-if="isPageMenuOpen"
          class="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 max-h-60 w-48 overflow-y-auto rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 dark:border-slate-700/90 dark:bg-slate-800 text-slate-800 dark:text-slate-100">
          <button v-for="(page, index) in pages" :key="index" type="button"
            class="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition font-medium cursor-pointer"
            :class="index === activePageIndex ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70'"
            @click="$emit('select-page', index); isPageMenuOpen = false">
            <span class="truncate">{{ index + 1 }}. {{ page.title || page.label }}</span>
            <span class="text-[10px] text-slate-400 font-mono ml-1">{{ page.label }}</span>
          </button>
        </div>
      </div>

      <AppIconButton :disabled="!canGoNext" :aria-label="t('preview.next')" :title="t('preview.next')"
        @click="$emit('next-page')">
        <AppIcon name="chevron-right" :size="16" />
      </AppIconButton>
    </div>

    <div class="h-4.5 w-px bg-slate-200/80 dark:bg-slate-800 mx-1"></div>

    <!-- Zoom Controls Dropdown & Buttons -->
    <div
      class="relative flex items-center rounded-lg border border-slate-200/90 bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 p-0.5 shadow-2xs"
      ref="zoomDropdownRef">
      <button
        class="grid h-7 w-7 place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
        type="button" :aria-label="t('preview.zoom')" :title="t('preview.zoom')" @click="$emit('set-zoom', zoom - 5)">
        <AppIcon name="minus" :size="13" />
      </button>

      <button type="button"
        class="px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
        :title="t('preview.zoom')" @click="isZoomMenuOpen = !isZoomMenuOpen">
        {{ zoom }}%
      </button>

      <button
        class="grid h-7 w-7 place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
        type="button" :aria-label="t('preview.zoom')" :title="t('preview.zoom')" @click="$emit('set-zoom', zoom + 5)">
        <AppIcon name="plus" :size="13" />
      </button>

      <!-- Zoom Presets Dropdown Popover -->
      <div v-if="isZoomMenuOpen"
        class="absolute right-0 top-full mt-1.5 z-50 w-32 rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 dark:border-slate-700/90 dark:bg-slate-800 text-slate-800 dark:text-slate-100">
        <button v-for="preset in zoomPresets" :key="preset.value" type="button"
          class="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition font-medium cursor-pointer"
          :class="preset.value === zoom ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70'"
          @click="$emit('set-zoom', preset.value); isZoomMenuOpen = false">
          <span>{{ preset.label }}</span>
        </button>
      </div>
    </div>

    <!-- Fullscreen Button -->
    <AppIconButton type="button" :aria-label="t('preview.fullscreen')" :title="t('preview.fullscreen')"
      @click="$emit('toggle-fullscreen')">
      <AppIcon name="maximize" :size="15" />
    </AppIconButton>
  </header>
</template>
