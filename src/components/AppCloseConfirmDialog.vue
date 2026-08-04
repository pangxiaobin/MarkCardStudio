<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "./AppIcon.vue";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  closing: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["cancel", "confirm"]);
const { t } = useI18n();
const dialogRef = ref(null);
const cancelButtonRef = ref(null);

let previouslyFocusedElement = null;

function cancel() {
  if (!props.closing) emit("cancel");
}

function confirm() {
  if (!props.closing) emit("confirm");
}

function handleKeydown(event) {
  if (!props.open) return;

  if (event.key === "Escape") {
    event.preventDefault();
    cancel();
    return;
  }

  if (event.key !== "Tab") return;

  const focusableElements = Array.from(
    dialogRef.value?.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])') || [],
  );

  if (!focusableElements.length) {
    event.preventDefault();
    dialogRef.value?.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocusedElement = document.activeElement;
      await nextTick();
      cancelButtonRef.value?.focus();
      return;
    }

    await nextTick();
    previouslyFocusedElement?.focus?.();
    previouslyFocusedElement = null;
  },
);

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[120] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
      @mousedown.self="cancel"
    >
      <section
        ref="dialogRef"
        class="w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="close-dialog-title"
        aria-describedby="close-dialog-description"
        tabindex="-1"
      >
        <div class="flex items-start gap-3.5 px-5 pb-4 pt-5">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300">
            <AppIcon name="power" :size="19" />
          </span>
          <div class="min-w-0 pt-0.5">
            <h2 id="close-dialog-title" class="text-base font-bold text-slate-900 dark:text-slate-100">
              {{ t("closeDialog.title") }}
            </h2>
            <p id="close-dialog-description" class="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {{ t("closeDialog.description") }}
            </p>
          </div>
        </div>

        <footer class="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/50">
          <button
            ref="cancelButtonRef"
            type="button"
            class="h-9 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            :disabled="closing"
            @click="cancel"
          >
            {{ t("closeDialog.cancel") }}
          </button>
          <button
            type="button"
            class="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
            :disabled="closing"
            @click="confirm"
          >
            <AppIcon name="power" :size="15" />
            <span>{{ closing ? t("closeDialog.closing") : t("closeDialog.confirm") }}</span>
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
