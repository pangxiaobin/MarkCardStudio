<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "./AppIcon.vue";

const props = defineProps({
  canvasSizeLabel: {
    type: String,
    required: true,
  },
  pagesLength: {
    type: Number,
    required: true,
  },
  autoSaveStatus: {
    type: String,
    default: "已开启",
  },
});
const { t } = useI18n();

const statusBadgeClass = computed(() => {
  const status = props.autoSaveStatus;
  if (status.includes("编辑中") || status.includes("Editing")) return "bg-amber-500 text-white";
  if (status.includes("保存中") || status.includes("Saving")) return "bg-blue-500 text-white animate-pulse";
  if (status.includes("失败") || status.includes("错误") || /fail|error/i.test(status)) return "bg-rose-500 text-white";
  return "bg-emerald-500 text-white";
});
</script>

<template>
  <footer class="relative flex h-[52px] shrink-0 items-center justify-between border-t border-slate-200/70 dark:border-slate-800 bg-white/88 dark:bg-slate-900/90 px-5 text-sm text-slate-500 dark:text-slate-400 backdrop-blur-[18px]">
    <div class="inline-flex items-center gap-2">
      <span class="grid h-3.5 w-3.5 place-items-center rounded-full transition-colors duration-200" :class="statusBadgeClass">
        <AppIcon name="sparkles" :size="10" />
      </span>
      <span class="text-xs sm:text-sm font-medium transition-colors">{{ t("statusbar.autosave") }}: {{ autoSaveStatus }}</span>
    </div>
    <div class="absolute left-1/2 inline-flex h-10 -translate-x-1/2 items-center gap-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 px-4 shadow-2xs">
      <span>{{ t("statusbar.canvasSize") }}: {{ canvasSizeLabel }}</span>
      <span>{{ t("statusbar.estimatedExport") }}: {{ t("common.imageCount", { count: pagesLength }) }}</span>
      <div class="group relative flex items-center">
        <button
          type="button"
          class="grid h-5 w-5 place-items-center rounded-full border border-slate-400 dark:border-slate-500 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
          :aria-label="t('statusbar.exportHelp')"
        >
          <AppIcon name="circle-help" :size="12" />
        </button>

        <div
          class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-max max-w-xs rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 dark:bg-slate-100 dark:text-slate-900 font-medium leading-relaxed"
        >
          <span>{{ t("statusbar.exportHelp") }}</span>
          <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100"></div>
        </div>
      </div>
    </div>
  </footer>
</template>
