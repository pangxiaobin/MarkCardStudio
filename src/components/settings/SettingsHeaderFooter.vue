<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "../AppIcon.vue";

const props = defineProps({
  activePage: {
    type: Object,
    default: () => ({}),
  },
  activePageIndex: {
    type: Number,
    required: true,
  },
  pagesLength: {
    type: Number,
    required: true,
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
  showPageNumber: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits([
  "update-global-meta",
  "update:showTopLeft",
  "update:showTopRight",
  "update:showBottomLeft",
  "update:showBottomRight",
  "update:showPageNumber",
]);
const { t, tm } = useI18n();

// Formatted today string
const todayString = computed(() => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
});

const currentKicker = computed(() => props.activePage?.kicker ?? "@MarkCard");
const currentDate = computed(() => props.activePage?.date || todayString.value);
const currentQuote = computed(() => props.activePage?.quote || tm("publish.quotePresets")[3]);

const kickerPresets = computed(() => tm("publish.kickerPresets"));
const datePresets = [
  todayString.value,
  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
];
const quotePresets = computed(() => tm("publish.quotePresets"));

function updateKicker(val) {
  emit("update-global-meta", { kicker: val });
}

function updateDate(val) {
  emit("update-global-meta", { date: val });
}

function updateQuote(val) {
  emit("update-global-meta", { quote: val });
}
</script>

<template>
  <div class="space-y-4">
    <!-- Top-Left Header / Username -->
    <section class="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 p-3.5 space-y-3 shadow-2xs">
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
        <div class="flex items-center gap-2">
          <span class="grid h-5 w-5 place-items-center rounded bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
            <AppIcon name="heading-2" :size="12" />
          </span>
          <h3 class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ t("publish.headerKicker") }}</h3>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            :checked="showTopLeft"
            class="sr-only peer"
            @change="$emit('update:showTopLeft', $event.target.checked)"
          />
          <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div v-if="showTopLeft" class="space-y-2">
        <input
          type="text"
          :value="currentKicker"
          :placeholder="t('publish.kickerPlaceholder')"
          class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
          @input="updateKicker($event.target.value)"
        />
        <div class="flex flex-wrap gap-1.5 pt-1">
          <button
            v-for="p in kickerPresets"
            :key="p"
            type="button"
            class="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 transition cursor-pointer"
            @click="updateKicker(p)"
          >
            {{ p }}
          </button>
        </div>
      </div>
    </section>

    <!-- Top-Right Page Number Toggle -->
    <section class="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 p-3.5 space-y-2.5 shadow-2xs">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="grid h-5 w-5 place-items-center rounded bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
            <AppIcon name="hash" :size="12" />
          </span>
          <h3 class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ t("publish.pageNumber") }}</h3>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            :checked="showTopRight"
            class="sr-only peer"
            @change="$emit('update:showTopRight', $event.target.checked); $emit('update:showPageNumber', $event.target.checked)"
          />
          <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>
      <p class="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        {{ t("publish.headerPageHint") }}
      </p>
    </section>

    <!-- Bottom-Left Date Display -->
    <section class="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 p-3.5 space-y-3 shadow-2xs">
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
        <div class="flex items-center gap-2">
          <span class="grid h-5 w-5 place-items-center rounded bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
            <AppIcon name="calendar" :size="12" />
          </span>
          <h3 class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ t("publish.date") }}</h3>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            :checked="showBottomLeft"
            class="sr-only peer"
            @change="$emit('update:showBottomLeft', $event.target.checked)"
          />
          <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div v-if="showBottomLeft" class="space-y-2">
        <input
          type="text"
          :value="currentDate"
          :placeholder="t('publish.datePlaceholder')"
          class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
          @input="updateDate($event.target.value)"
        />
        <div class="flex flex-wrap gap-1.5 pt-1">
          <button
            v-for="d in datePresets"
            :key="d"
            type="button"
            class="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 transition cursor-pointer"
            @click="updateDate(d)"
          >
            {{ d }}
          </button>
        </div>
      </div>
    </section>

    <!-- Bottom-Right Declaration / Quote -->
    <section class="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 p-3.5 space-y-3 shadow-2xs">
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
        <div class="flex items-center gap-2">
          <span class="grid h-5 w-5 place-items-center rounded bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
            <AppIcon name="quote" :size="12" />
          </span>
          <h3 class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ t("publish.quote") }}</h3>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            :checked="showBottomRight"
            class="sr-only peer"
            @change="$emit('update:showBottomRight', $event.target.checked)"
          />
          <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div v-if="showBottomRight" class="space-y-2">
        <textarea
          :value="currentQuote"
          rows="2"
          :placeholder="t('publish.quotePlaceholder')"
          class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none resize-none"
          @input="updateQuote($event.target.value)"
        ></textarea>
        <div class="flex flex-col gap-1.5 pt-1">
          <button
            v-for="q in quotePresets"
            :key="q"
            type="button"
            class="text-left rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 transition cursor-pointer truncate"
            @click="updateQuote(q)"
          >
            {{ q }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
