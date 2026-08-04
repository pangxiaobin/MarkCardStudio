<script setup>
import { useI18n } from "vue-i18n";
import AppIcon from "../AppIcon.vue";

const { t } = useI18n();

defineProps({
  activePageIndex: {
    type: Number,
    required: true,
  },
  pages: {
    type: Array,
    required: true,
  },
});

defineEmits(["add-page", "select-page"]);
</script>

<template>
  <div class="preview-strip mx-3 mb-3 flex items-center gap-3 overflow-x-auto overflow-y-hidden rounded-xl p-3 select-none">
    <div
      v-for="(page, index) in pages"
      :key="`${page.label}-${page.title}-${index}`"
      class="group/item relative flex flex-col min-w-[100px] w-[110px] shrink-0 rounded-xl border p-1 text-left transition-all duration-200 cursor-pointer"
      :class="index === activePageIndex ? 'border-blue-500 bg-blue-50/90 dark:bg-blue-950/70 shadow-xs scale-102 ring-1 ring-blue-500/50' : 'border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:scale-101'"
      @click="$emit('select-page', index)"
    >
      <!-- Thumbnail Card Box -->
      <div class="relative h-20 w-full overflow-hidden rounded-lg bg-[#fff7e9] dark:bg-slate-800/90 p-2 shadow-inner flex flex-col justify-between">
        <div>
          <span class="text-[10px] font-bold text-amber-800 dark:text-amber-300 leading-tight block truncate">{{ page.kicker }}</span>
          <strong class="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight block truncate mt-0.5">{{ page.title }}</strong>
        </div>

        <!-- Render Image Thumbnail ONLY if real image exists -->
        <div v-if="page.imageUrl" class="mini-image relative mt-1 h-8 w-full overflow-hidden rounded border border-amber-900/10">
          <img :src="page.imageUrl" class="h-full w-full object-cover" />
        </div>
        <!-- Text snippet preview if no image -->
        <p v-else-if="page.body && page.body.length" class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
          {{ page.body[0] }}
        </p>
      </div>

      <!-- Page Label Badge -->
      <span class="grid place-items-center py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
        {{ page.label }}
      </span>
    </div>

    <!-- Add Page Button -->
    <button
      class="flex min-w-[110px] h-[106px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 transition cursor-pointer"
      type="button"
      :title="t('preview.addPage')"
      @click="$emit('add-page')"
    >
      <span class="grid h-7 w-7 place-items-center rounded-full bg-slate-100 dark:bg-slate-800">
        <AppIcon name="plus" :size="16" />
      </span>
      <span class="text-xs font-semibold">{{ t("preview.addPage") }}</span>
    </button>
  </div>
</template>
