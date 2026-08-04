<script setup>
import { useI18n } from "vue-i18n";
import AppIcon from "../AppIcon.vue";

const { t } = useI18n();

const props = defineProps({
  paginationMode: {
    type: String,
    default: "h2",
  },
  customDelimiter: {
    type: String,
    default: "---",
  },
  maxPageLength: {
    type: Number,
    default: 300,
  },
  pagesLength: {
    type: Number,
    required: true,
  },
  activePageIndex: {
    type: Number,
    required: true,
  },
});

defineEmits(["set-pagination-mode", "set-custom-delimiter", "set-max-page-length"]);

const modes = [
  {
    id: "h2",
    icon: "heading-2",
  },
  {
    id: "h3",
    icon: "heading-3",
  },
  {
    id: "delimiter",
    icon: "split",
  },
  {
    id: "length",
    icon: "align-left",
  },
  {
    id: "smart",
    icon: "sparkles",
  },
];

const presetDelimiters = ["---", "***", "<!-- page -->", "==="];
const presetLengths = [150, 250, 350, 500];
</script>

<template>
  <div class="space-y-3.5">
    <!-- Top Summary Banner: Current Split Stats -->
    <section class="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 p-3.5 shadow-2xs">
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-2">
          <span class="grid h-6 w-6 place-items-center rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
            <AppIcon name="layers" :size="13" />
          </span>
          <span class="font-medium text-slate-600 dark:text-slate-300">{{ t("publish.paginationSummary") }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{{ t("common.pages", { count: pagesLength }) }}</span>
          <span class="mx-1 text-slate-200 dark:text-slate-700">|</span>
          <span class="text-slate-500 dark:text-slate-400 font-medium">{{ t("publish.currentPage", { current: activePageIndex + 1 }) }}</span>
        </div>
      </div>
    </section>

    <!-- Pagination Mode Selector Cards with Inline Expanded Controls -->
    <section class="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 p-3.5">
      <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">{{ t("publish.strategy") }}</h3>
      <div class="grid gap-2">
        <div
          v-for="mode in modes"
          :key="mode.id"
          class="rounded-xl border transition group"
          :class="
            paginationMode === mode.id
              ? 'border-blue-500/90 bg-blue-50/50 dark:bg-blue-950/30 shadow-2xs'
              : 'border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/50'
          "
        >
          <!-- Card Header Button -->
          <button
            type="button"
            class="flex w-full items-start gap-2.5 p-2.5 text-left cursor-pointer"
            @click="$emit('set-pagination-mode', mode.id)"
          >
            <span
              class="mt-0.5 grid h-6.5 w-6.5 shrink-0 place-items-center rounded-lg border transition"
              :class="
                paginationMode === mode.id
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:border-slate-300'
              "
            >
              <AppIcon :name="mode.icon" :size="14" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between">
                <span
                  class="text-xs font-bold transition-colors"
                  :class="paginationMode === mode.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-100'"
                >
                  {{ t(`publish.paginationModes.${mode.id}.title`) }}
                </span>
                <span v-if="paginationMode === mode.id" class="text-[11px] font-bold text-blue-600 dark:text-blue-400">{{ t("publish.selected") }}</span>
              </div>
              <p class="mt-0.5 text-[11px] leading-normal text-slate-500 dark:text-slate-400 font-normal">
                {{ t(`publish.paginationModes.${mode.id}.description`) }}
              </p>
            </div>
          </button>

          <!-- INLINE EXTENDED CONTROLS FOR 'delimiter' MODE -->
          <div
            v-if="mode.id === 'delimiter' && paginationMode === 'delimiter'"
            class="border-t border-blue-200/80 dark:border-blue-900/60 px-3 py-2.5 space-y-2.5 bg-white/70 dark:bg-slate-900/40 rounded-b-xl animate-in fade-in duration-150"
          >
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{{ t("publish.matchDelimiter") }}</label>
              <input
                type="text"
                :value="customDelimiter"
                :placeholder="t('publish.delimiterPlaceholder')"
                class="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-100 font-mono focus:border-blue-500 focus:outline-none transition shadow-2xs"
                @input="$emit('set-custom-delimiter', $event.target.value)"
              />
            </div>
            <div>
              <span class="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">{{ t("publish.quickPresets") }}:</span>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="item in presetDelimiters"
                  :key="item"
                  type="button"
                  class="rounded-md border px-2 py-0.5 font-mono text-[11px] transition cursor-pointer"
                  :class="
                    customDelimiter === item
                      ? 'border-blue-500 bg-blue-600 text-white font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  "
                  @click="$emit('set-custom-delimiter', item)"
                >
                  {{ item }}
                </button>
              </div>
            </div>
          </div>

          <!-- INLINE EXTENDED CONTROLS FOR 'length' OR 'smart' MODES -->
          <div
            v-if="(mode.id === 'length' || mode.id === 'smart') && paginationMode === mode.id"
            class="border-t border-blue-200/80 dark:border-blue-900/60 px-3 py-2.5 space-y-2.5 bg-white/70 dark:bg-slate-900/40 rounded-b-xl animate-in fade-in duration-150"
          >
            <div class="flex items-center justify-between">
              <label class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{{ t("publish.maxCharacterLimit") }}</label>
              <span class="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{{ t("publish.charactersPerPage", { count: maxPageLength }) }}</span>
            </div>
            <div>
              <input
                type="range"
                min="100"
                max="800"
                step="10"
                :value="maxPageLength"
                class="w-full accent-blue-600 cursor-pointer h-1.5"
                @input="$emit('set-max-page-length', parseInt($event.target.value, 10))"
              />
              <div class="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>{{ t("publish.compactCharacters") }}</span>
                <span>{{ t("publish.fitCharacters") }}</span>
                <span>{{ t("publish.longCharacters") }}</span>
              </div>
            </div>
            <div>
              <span class="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">{{ t("publish.quickPresets") }}:</span>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="len in presetLengths"
                  :key="len"
                  type="button"
                  class="rounded-md border px-2.5 py-0.5 text-[11px] transition cursor-pointer"
                  :class="
                    maxPageLength === len
                      ? 'border-blue-500 bg-blue-600 text-white font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  "
                  @click="$emit('set-max-page-length', len)"
                >
                  {{ t("publish.characters", { count: len }) }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
