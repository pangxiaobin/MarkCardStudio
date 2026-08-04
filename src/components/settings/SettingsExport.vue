<script setup>
import { invoke } from "@tauri-apps/api/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "../AppIcon.vue";

const props = defineProps({
  exportFormats: {
    type: Array,
    required: true,
  },
  exportMessage: {
    type: String,
    required: true,
  },
  pagesLength: {
    type: Number,
    required: true,
  },
  scale: {
    type: Number,
    required: true,
  },
  selectedFormat: {
    type: String,
    required: true,
  },
  exportPath: {
    type: String,
    default: "",
  },
});

const emit = defineEmits([
  "export",
  "select-format",
  "set-scale",
  "set-export-path",
]);

const isCollapsed = ref(false);
const { t } = useI18n();
const qualityOptions = computed(() => [
  [1, t("publish.low")],
  [2, t("publish.standard")],
  [3, t("publish.high")],
]);

const mainButtonText = computed(() => {
  if (props.selectedFormat === "长图(PNG)") {
    return t("publish.exportLong", { count: props.pagesLength });
  }
  if (props.selectedFormat === "PDF") {
    return t("publish.exportPdf", { count: props.pagesLength });
  }
  return t("publish.exportAll", { format: t(`formats.${props.selectedFormat}`), count: props.pagesLength });
});

async function handleSelectFolder() {
  try {
    const selected = await invoke("pick_export_folder");
    if (selected) {
      emit("set-export-path", selected);
      return;
    }
  } catch {
    // fallback if not running in Tauri
  }
  const nextPath = prompt(t("publish.pathPrompt"), props.exportPath);
  if (nextPath && nextPath.trim()) {
    emit("set-export-path", nextPath.trim());
  }
}
async function handleOpenExportFolder() {
  try {
    await invoke("open_export_folder", { path: props.exportPath });
  } catch {
    // ignore
  }
}
</script>

<template>
  <section class="relative bg-white/95 backdrop-blur-xs select-none dark:bg-slate-900/95">
    <!-- Header Bar with Collapsible Accordion Trigger -->
    <div
      class="flex h-8.5 items-center justify-between px-3.5 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
      @click="isCollapsed = !isCollapsed"
    >
      <div class="flex items-center gap-1.5 min-w-0">
        <div class="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
          <AppIcon name="download" :size="12" />
        </div>
        <h2 class="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight whitespace-nowrap">{{ t("publish.exportSettings") }}</h2>

        <!-- Collapsed Summary Chip -->
        <span
          v-if="isCollapsed"
          class="ml-1.5 inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate whitespace-nowrap"
        >
          {{ t(`formats.${selectedFormat}`) }} · {{ t("common.pages", { count: pagesLength }) }}
        </span>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <!-- Quick Export Mini Button when collapsed -->
        <button
          v-if="isCollapsed"
          type="button"
          class="mr-1 inline-flex h-6.5 items-center gap-1 rounded-md !bg-blue-600 hover:!bg-blue-700 px-2.5 text-[11px] font-semibold !text-white shadow-2xs active:scale-95 transition whitespace-nowrap"
          @click.stop="$emit('export')"
        >
          <AppIcon name="download" :size="11" />
          {{ t("toolbar.export") }}
        </button>

        <button
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition"
          :aria-expanded="!isCollapsed"
          :title="isCollapsed ? t('publish.expandExport') : t('publish.collapseExport')"
        >
          <AppIcon
            name="chevron-down"
            :size="14"
            class="transition-transform duration-300"
            :class="isCollapsed ? 'rotate-0' : 'rotate-180'"
          />
        </button>
      </div>
    </div>

    <!-- Collapsible Content -->
    <div
      class="grid transition-all duration-300 ease-in-out"
      :class="isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'"
    >
      <div class="overflow-hidden">
        <div class="space-y-2.5 p-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">

          <!-- 格式 Selection -->
          <div>
            <label class="mb-1.5 block text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{{ t("publish.format") }}</label>
            <div class="flex items-center gap-2">
              <button
                v-for="format in exportFormats"
                :key="format"
                type="button"
                class="h-8 rounded-lg text-xs transition-all duration-150 whitespace-nowrap px-2.5 flex items-center justify-center font-medium"
                :class="
                  format === selectedFormat
                    ? '!bg-blue-600 !text-white font-semibold shadow-xs'
                    : '!bg-slate-100 dark:!bg-slate-800 !text-slate-700 dark:!text-slate-300 hover:!bg-slate-200/80 dark:hover:!bg-slate-700'
                "
                @click="$emit('select-format', format)"
              >
                {{ t(`formats.${format}`) }}
              </button>
            </div>
          </div>

          <!-- 画质 Quality Selection -->
          <div>
            <label class="mb-1.5 block text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
              {{ t("publish.quality") }}
              <span class="ml-1 font-normal text-slate-400 dark:text-slate-500 text-[11px]">({{ t("publish.qualityHint") }})</span>
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="[value, label] in qualityOptions"
                :key="value"
                type="button"
                class="h-8 rounded-lg text-xs transition-all duration-150 whitespace-nowrap flex items-center justify-center font-medium"
                :class="
                  value === scale
                    ? '!border !border-blue-500 !bg-blue-50 dark:!bg-blue-950/60 !text-blue-600 dark:!text-blue-400 font-semibold shadow-xs'
                    : '!bg-slate-100 dark:!bg-slate-800 !text-slate-700 dark:!text-slate-300 hover:!bg-slate-200/80 dark:hover:!bg-slate-700'
                "
                @click="$emit('set-scale', value)"
              >
                {{ label }}
              </button>
            </div>
          </div>

          <!-- 导出路径 -->
          <div>
            <label class="mb-1 block text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{{ t("publish.exportPath") }}</label>
            <div
              class="flex h-7.5 items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-[11px] text-slate-600 dark:text-slate-300 shadow-2xs cursor-pointer hover:border-blue-500 transition"
              @click="handleSelectFolder"
            >
              <input
                type="text"
                class="w-full bg-transparent text-slate-700 dark:text-slate-200 outline-none truncate font-mono text-[11px] whitespace-nowrap cursor-pointer"
                :value="exportPath"
                :placeholder="t('publish.pathPlaceholder')"
                readonly
              />
              <button
                type="button"
                class="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
                :title="t('publish.chooseFolder')"
                @click.stop="handleSelectFolder"
              >
                <AppIcon name="folder-open" :size="13" />
              </button>
            </div>
          </div>

          <!-- 导出按钮 (Main Export Button) -->
          <div class="pt-0.5">
            <button
              type="button"
              class="group relative inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg !bg-blue-600 hover:!bg-blue-700 !text-white text-xs font-bold shadow-[0_4px_14px_rgba(37,99,235,0.35)] active:scale-[0.99] transition-all duration-200 whitespace-nowrap"
              @click="$emit('export')"
            >
              <AppIcon name="download" :size="15" class="transition-transform group-hover:-translate-y-0.5 shrink-0" />
              <span class="whitespace-nowrap">{{ mainButtonText }}</span>
            </button>
          </div>

          <!-- Export Message Toast with Open Directory Button -->
          <div
            v-if="exportMessage"
            class="text-center text-[11px] text-blue-600 dark:text-blue-400 font-medium flex flex-col items-center justify-center gap-1 pt-0.5"
          >
            <div class="flex items-center gap-1 truncate max-w-full">
              <AppIcon name="check-circle" :size="11" class="shrink-0" />
              <span class="truncate font-mono">{{ exportMessage }}</span>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline transition cursor-pointer"
              @click="handleOpenExportFolder"
            >
              <AppIcon name="folder-open" :size="11" />
              {{ t("publish.openFolder") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
