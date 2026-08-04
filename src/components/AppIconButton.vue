<script setup>
import { computed } from "vue";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
  ariaLabel: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  small: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: "button",
  },
});

const buttonClass = computed(() => [
  "inline-grid place-items-center rounded-lg border border-slate-200 bg-white shadow-[0_6px_14px_rgba(30,42,62,0.04)] dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-200 dark:shadow-none dark:hover:bg-slate-700/80 transition-colors",
  props.small ? "h-8 w-8" : "h-9 w-9",
  props.active ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400" : "",
  props.disabled ? "cursor-not-allowed pointer-events-none opacity-45 dark:opacity-40" : "",
].join(" "));
</script>

<template>
  <button :type="type" :aria-label="ariaLabel" :disabled="disabled" v-bind="$attrs" :class="buttonClass">
    <slot />
  </button>
</template>
