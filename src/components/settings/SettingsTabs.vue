<script setup>
import { useI18n } from "vue-i18n";
import AppIcon from "../AppIcon.vue";

const { t } = useI18n();
defineProps({
  activeTab: {
    type: String,
    required: true,
  },
  settingTabs: {
    type: Array,
    required: true,
  },
});

defineEmits(["set-active-tab"]);

const tabMeta = {
  平台: { key: "platform", icon: "monitor" },
  分页: { key: "pagination", icon: "layers" },
  背景: { key: "background", icon: "palette" },
  字体: { key: "font", icon: "type" },
  标头: { key: "header", icon: "heading-2" },
};

function getTabLabel(tab) {
  return t(`publish.tabs.${tabMeta[tab]?.key || tab}`);
}

function getTabIcon(tab) {
  return tabMeta[tab]?.icon || "settings";
}
</script>

<template>
  <div
    class="grid grid-cols-5 w-full border-b border-slate-200/80 dark:border-slate-800 select-none"
    role="tablist"
  >
    <div
      v-for="tab in settingTabs"
      :key="tab"
      class="group relative flex items-center justify-center"
    >
      <button
        type="button"
        role="tab"
        class="relative flex h-10 w-full items-center justify-center transition-colors duration-150 cursor-pointer"
        :class="
          tab === activeTab
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        "
        :aria-selected="tab === activeTab"
        :aria-label="getTabLabel(tab)"
        @click="$emit('set-active-tab', tab)"
      >
        <AppIcon :name="getTabIcon(tab)" :size="18" />

        <!-- Blue Underline Active Indicator -->
        <span
          v-if="tab === activeTab"
          class="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400"
        ></span>
      </button>

      <!-- Instant Hover Tooltip Card (Positioned Downwards to avoid top clipping) -->
      <div
        class="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 dark:bg-slate-100 dark:text-slate-900 whitespace-nowrap"
      >
        <span>{{ getTabLabel(tab) }}</span>
        <div
          class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900 dark:border-b-slate-100"
        ></div>
      </div>
    </div>
  </div>
</template>
