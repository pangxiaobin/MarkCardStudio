<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "./AppIcon.vue";
import AppIconButton from "./AppIconButton.vue";
import AppToolbarButton from "./AppToolbarButton.vue";

const props = defineProps({
  selectedTheme: {
    type: String,
    required: true,
  },
  isDarkMode: {
    type: Boolean,
    default: false,
  },
  canUndo: {
    type: Boolean,
    default: false,
  },
  canRedo: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "export",
  "new-document",
  "open-markdown",
  "save-markdown",
  "open-settings",
  "select-theme",
  "toggle-dark-mode",
  "undo",
  "redo",
]);

import { THEME_LIST } from "../config/themes.js";

const themes = THEME_LIST;
const { t } = useI18n();
const isThemeOpen = ref(false);
const themeDropdownRef = ref(null);

function handleClickOutside(event) {
  if (themeDropdownRef.value && !themeDropdownRef.value.contains(event.target)) {
    isThemeOpen.value = false;
  }
}

function getThemeLabel(theme) {
  return t(`themes.${theme.id}.name`);
}

function getThemeDescription(theme) {
  return t(`themes.${theme.id}.description`);
}

function getSelectedThemeLabel() {
  const theme = themes.find((item) => item.name === props.selectedTheme);
  return theme ? getThemeLabel(theme) : props.selectedTheme;
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <nav
    class="relative z-30 shrink-0 border-b border-t border-slate-200/70 bg-white/88 px-4 py-2 backdrop-blur-[18px] dark:border-slate-800/80 dark:bg-slate-900/90"
    :aria-label="t('toolbar.label')">
    <div class="flex items-center justify-between gap-3">
      <!-- Left Toolbar Section: Document Actions + Undo/Redo -->
      <div class="inline-flex items-center gap-2 sm:gap-3">
        <AppToolbarButton compact @click="$emit('new-document')">
          <AppIcon name="file-plus-2" :size="16" />
          {{ t("toolbar.new") }}
        </AppToolbarButton>
        <AppToolbarButton compact :title="t('toolbar.openDocument')" :aria-label="t('toolbar.openDocument')"
          @click="$emit('open-markdown')">
          <AppIcon name="folder-open" :size="16" />
          {{ t("toolbar.open") }}
        </AppToolbarButton>
        <AppToolbarButton compact @click="$emit('save-markdown')">
          <AppIcon name="save" :size="16" />
          {{ t("toolbar.save") }}
        </AppToolbarButton>

        <div class="h-4 w-px bg-slate-200/80 dark:bg-slate-800 mx-1"></div>

        <!-- Undo & Redo -->
        <AppIconButton :disabled="!canUndo" :aria-label="t('toolbar.undo')" :title="t('toolbar.undo')"
          @click="$emit('undo')">
          <AppIcon name="undo" :size="16" />
        </AppIconButton>
        <AppIconButton :disabled="!canRedo" :aria-label="t('toolbar.redo')" :title="t('toolbar.redo')"
          @click="$emit('redo')">
          <AppIcon name="redo" :size="16" />
        </AppIconButton>
      </div>

      <!-- Right Toolbar Section: Theme Dropdown, System Dark Mode, Settings & Primary Export -->
      <div class="inline-flex items-center gap-2.5">
        <!-- Card Theme Dropdown Selector -->
        <div class="relative" ref="themeDropdownRef">
          <button type="button"
            class="flex h-8.5 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-2xs hover:bg-slate-50 transition font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80 cursor-pointer"
            @click="isThemeOpen = !isThemeOpen">
            <span class="text-slate-500 font-normal dark:text-slate-400">{{ t("toolbar.theme") }}:</span>
            <span class="font-bold text-slate-800 dark:text-slate-100">{{ getSelectedThemeLabel() }}</span>
            <AppIcon name="chevron-down" :size="13"
              class="text-slate-400 dark:text-slate-400 ml-0.5 transition-transform duration-200"
              :class="isThemeOpen ? 'rotate-180' : ''" />
          </button>

          <!-- Theme Dropdown Popover List -->
          <div v-if="isThemeOpen"
            class="absolute right-0 top-full mt-1.5 z-50 w-64 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 dark:border-slate-700/90 dark:bg-slate-800 dark:text-slate-100">
            <button v-for="themeItem in themes" :key="themeItem.id" type="button"
              :title="getThemeDescription(themeItem)"
              class="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-left transition font-medium cursor-pointer"
              :class="themeItem.name === selectedTheme ? '!bg-blue-50 !text-blue-600 dark:!bg-blue-950/60 dark:!text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70'"
              @click="emit('select-theme', themeItem.name); isThemeOpen = false">
              <!-- Theme Color Dot / Gradient Indicator -->
              <span class="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10 shadow-2xs"
                :style="{ background: themeItem.bgGradient || themeItem.color }"></span>
              <div class="flex flex-col flex-1 min-w-0">
                <span class="truncate leading-tight">{{ getThemeLabel(themeItem) }}</span>
                <span :title="getThemeDescription(themeItem)"
                  class="text-[10px] text-slate-500 dark:text-slate-400 truncate group-hover:whitespace-normal group-hover:line-clamp-none mt-0.5 font-normal leading-snug">{{
                    getThemeDescription(themeItem) }}</span>
              </div>
              <AppIcon v-if="themeItem.name === selectedTheme" name="check" :size="13"
                class="text-blue-600 dark:text-blue-400 shrink-0" />
            </button>
          </div>
        </div>

        <!-- Vertical Divider -->
        <div class="h-4.5 w-px bg-slate-200/80 dark:bg-slate-800 mx-0.5"></div>

        <!-- System Dark/Light Mode Switch Toggle -->
        <button type="button"
          class="relative flex h-7.5 w-12 items-center rounded-full p-0.5 transition-colors border border-slate-200/80 cursor-pointer"
          :class="isDarkMode ? '!bg-slate-800 !border-slate-700' : '!bg-slate-100'"
          :aria-label="t('toolbar.appearance')" :title="t('toolbar.appearance')" @click="$emit('toggle-dark-mode')">
          <div
            class="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-xs transition-transform duration-200"
            :class="isDarkMode ? 'translate-x-4.5 !bg-slate-900 !text-amber-400' : 'translate-x-0 !text-blue-600'">
            <AppIcon :name="isDarkMode ? 'moon' : 'sun'" :size="13" />
          </div>
        </button>

        <!-- Settings Button -->
        <AppIconButton :aria-label="t('toolbar.settings')" :title="t('toolbar.settings')"
          @click="$emit('open-settings')">
          <AppIcon name="settings" :size="16" />
        </AppIconButton>

        <!-- Primary Export Button (Matching Screenshot) -->
        <button type="button"
          class="inline-flex h-8.5 items-center rounded-lg !bg-blue-600 hover:!bg-blue-700 px-3 text-xs font-bold !text-white shadow-xs active:scale-98 transition group cursor-pointer"
          @click="$emit('export')">
          <AppIcon name="download" :size="15" class="mr-1.5" />
          <span>{{ t("toolbar.export") }}</span>
        </button>
      </div>
    </div>
  </nav>
</template>
