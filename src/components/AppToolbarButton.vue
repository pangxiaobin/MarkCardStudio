<script setup>
import { computed } from "vue";

const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  primary: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: "button",
  },
});

const baseClass = computed(() => [
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-lg border text-xs font-semibold transition-all duration-150",
  props.primary
    ? "border-transparent bg-[linear-gradient(135deg,#7665ff_0%,#5b43e9_100%)] px-[18px] font-bold text-white shadow-[0_12px_24px_rgba(91,67,233,0.22)] hover:brightness-105"
    : "border-slate-200 bg-white px-3.5 text-slate-700 shadow-[0_6px_14px_rgba(30,42,62,0.04)] dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-200 dark:shadow-none dark:hover:bg-slate-700/80",
  props.compact ? "h-8.5" : "h-9.5",
  props.active ? "text-blue-600 dark:text-blue-400" : "",
].join(" "));
</script>

<template>
  <button :type="type" v-bind="$attrs" :class="baseClass">
    <slot />
  </button>
</template>
