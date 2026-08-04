<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
  platforms: {
    type: Array,
    required: true,
  },
  selectedPlatformName: {
    type: String,
    required: true,
  },
  selectedPlatform: {
    type: Object,
    required: true,
  },
  customWidth: {
    type: Number,
    default: 1200,
  },
  customHeight: {
    type: Number,
    default: 1600,
  },
});

const emit = defineEmits([
  "select-platform",
  "set-custom-width",
  "set-custom-height",
]);
const { t } = useI18n();

function platformLabel(platform) {
  return t(`publish.platforms.${platform.name}.name`);
}

const isCustomSelected = computed(
  () => props.selectedPlatform?.custom || props.selectedPlatformName === "自定义尺寸"
);

function handleWidthInput(event) {
  const val = parseInt(event.target.value, 10);
  if (!isNaN(val)) {
    emit("set-custom-width", val);
  }
}

function handleHeightInput(event) {
  const val = parseInt(event.target.value, 10);
  if (!isNaN(val)) {
    emit("set-custom-height", val);
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Platform Presets List (Full-width 1-column layout to prevent text clipping) -->
    <div class="flex flex-col gap-2.5">
      <button
        v-for="platform in platforms"
        :key="platform.name"
        type="button"
        class="group relative flex items-center justify-between rounded-xl border p-3 text-left transition-all duration-150"
        :class="
          platform.name === selectedPlatformName
            ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs ring-1 ring-blue-500/20'
            : 'border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
        "
        @click="emit('select-platform', platform.name)"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-2xs transition-transform group-hover:scale-105"
            :style="{ backgroundColor: platform.color }"
          >
            {{ platform.custom ? "#" : platformLabel(platform).slice(0, 1) }}
          </span>
          <div class="min-w-0">
            <strong class="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              {{ platformLabel(platform) }}
            </strong>
            <span class="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              {{ platform.custom ? `${customWidth} x ${customHeight}` : platform.size }}
            </span>
          </div>
        </div>

        <span
          class="ml-2 shrink-0 rounded px-2 py-0.5 text-xs font-mono font-medium"
          :class="
            platform.name === selectedPlatformName
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          "
        >
          {{ platform.ratio }}
        </span>
      </button>
    </div>

    <!-- Simple Custom Dimensions Input Panel (Only when Custom is selected) -->
    <section
      v-if="isCustomSelected"
      class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3 shadow-2xs"
    >
      <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">{{ t("publish.customSize") }} (px)</h4>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{{ t("publish.width") }}</label>
          <input
            type="number"
            min="300"
            max="3840"
            step="10"
            class="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500 transition"
            :value="customWidth"
            @input="handleWidthInput"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{{ t("publish.height") }}</label>
          <input
            type="number"
            min="300"
            max="3840"
            step="10"
            class="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500 transition"
            :value="customHeight"
            @input="handleHeightInput"
          />
        </div>
      </div>
    </section>
  </div>
</template>
